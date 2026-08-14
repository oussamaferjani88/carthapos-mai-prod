/**
 * BI Upload API Route
 *
 * POST /api/bi-uploads     — Upload a BI ZIP file and trigger ETL
 * GET  /api/bi-uploads     — List all uploads (with filters)
 * GET  /api/bi-uploads/:id — Get upload details + processing job status
 * GET  /api/bi-uploads/:id/logs — Get ETL processing logs
 * GET  /api/bi-uploads/:id/summary — Get dashboard-ready summary
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const etlPipeline = require('../services/etl-pipeline');
const warehouseService = require('../services/warehouse-service');
const { buildDimensionalModel } = require('../services/bi-model-registry');
const { resolveClientId } = require('../utils/identity');

const prisma = new PrismaClient();

const {
  REQUEST_STATUS,
  EVENT_TYPES,
} = require('../utils/bi-status');
const { recordEvent, guardTransition } = require('../utils/bi-workflow');

// ─── Multer config ──────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'bi-zips');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.zip')) {
      return cb(new Error('Only .zip files are allowed'));
    }
    cb(null, true);
  },
});

// ─── POST /api/bi-uploads — Upload ZIP ─────────────────────────

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 100 MB.' });
      }
      return res.status(400).json({ error: `Invalid ZIP file: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { clientId, businessType, requestId } = req.body;
    console.log(`[UPLOAD] Request received  filename=${req.file.originalname} size=${req.file.size} clientId=${clientId} requestId=${requestId || '(none)'}`);

    if (!clientId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'clientId is required' });
    }

    if (requestId) {
      const linkedRequest = await prisma.biRequest.findUnique({ where: { id: requestId }, select: { id: true, status: true } });
      if (!linkedRequest) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `BiRequest "${requestId}" not found` });
      }
      if (linkedRequest.status !== 'APPROVED') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Cannot link upload to a request with status "${linkedRequest.status}". Only APPROVED requests can be linked.` });
      }
    }

    // ── Tenant validation ───────────────────────────────────────
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      fs.unlinkSync(req.file.path);
      console.log(`[UPLOAD] REJECTED: unknown clientId="${clientId}"`);
      return res.status(400).json({
        error: `Unknown clientId: "${clientId}". No Client record found.`,
      });
    }
    console.log(`[UPLOAD] Client validated: ${client.name}`);

    // ── File hash (SHA-256) for duplicate detection ─────────────
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log(`[UPLOAD] SHA-256 hash=${fileHash}`);

    const existingDuplicate = await prisma.biUpload.findUnique({
      where: { fileHash },
      include: { processingJob: true, files: true },
    });
    if (existingDuplicate) {
      if (['FAILED'].includes(existingDuplicate.status)) {
        console.log(`[UPLOAD] Replacing failed duplicate uploadId=${existingDuplicate.id}`);
        // Clean up old failed record and allow re-upload
        if (existingDuplicate.processingJob) {
          await prisma.biProcessingLog.deleteMany({ where: { jobId: existingDuplicate.processingJob.id } });
          await prisma.biProcessingJob.delete({ where: { id: existingDuplicate.processingJob.id } });
        }
        if (existingDuplicate.files.length > 0) {
          await prisma.biUploadFile.deleteMany({ where: { uploadId: existingDuplicate.id } });
        }
        if (existingDuplicate.filePath && fs.existsSync(existingDuplicate.filePath)) {
          fs.unlinkSync(existingDuplicate.filePath);
        }
        await prisma.biUpload.delete({ where: { id: existingDuplicate.id } });
        console.log(`[UPLOAD] Old failed record deleted, proceeding with new upload`);
      } else {
        fs.unlinkSync(req.file.path);
        console.log(`[UPLOAD] REJECTED: duplicate, existing=${existingDuplicate.id}`);
        return res.status(409).json({
          error: 'Duplicate upload — this file has already been uploaded',
          existingUploadId: existingDuplicate.id,
        });
      }
    }

    const filePath = req.file.path;
    const fileSize = req.file.size;

    // Create upload record
    const uploadRecord = await prisma.biUpload.create({
      data: {
        clientId,
        requestId: requestId || null,
        businessType: businessType || client.name || 'unknown',
        fileHash,
        fileName: req.file.originalname,
        fileSize,
        filePath,
        status: 'PENDING_PAYMENT_VERIFICATION',
        totalFiles: 0,
        totalRows: 0,
      },
    });
    console.log(`[UPLOAD] Record created  uploadId=${uploadRecord.id} status=PENDING_PAYMENT_VERIFICATION`);

    res.status(201).json({
      success: true,
      upload: {
        id: uploadRecord.id,
        clientId: uploadRecord.clientId,
        businessType: uploadRecord.businessType,
        fileName: uploadRecord.fileName,
        fileSize: uploadRecord.fileSize,
        status: uploadRecord.status,
        createdAt: uploadRecord.createdAt,
      },
      message: 'Upload accepted. Awaiting payment verification.',
    });
    console.log(`[UPLOAD] Response sent (201)`);
  } catch (error) {
    console.error('[UPLOAD] FAILED:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads — List uploads ────────────────────────

router.get('/', async (req, res) => {
  try {
    const { clientId, status, page = 1, pageSize = 20 } = req.query;
    const where = {};
    // Identity-forced tenant scoping: an authenticated client is always
    // scoped to their own uploads, regardless of any clientId parameter.
    const identityClientId = await resolveClientId(req);
    const scopedClientId = identityClientId || clientId;
    if (scopedClientId) where.clientId = scopedClientId;
    if (status) where.status = status;

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '20'), 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedPageSize;
    const take = parsedPageSize;

    const [items, total] = await Promise.all([
      prisma.biUpload.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          processingJob: {
            select: { status: true, recordsLoaded: true, startedAt: true, completedAt: true },
          },
          biRequest: {
            select: { id: true, status: true, businessName: true, dashboardType: true },
          },
          dashboards: {
            select: { id: true, status: true, name: true },
            take: 1,
          },
        },
      }),
      prisma.biUpload.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.ceil(total / parsedPageSize),
      },
    });
  } catch (error) {
    console.error('List uploads failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id — Upload details ──────────────────

router.get('/:id', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      include: {
        files: true,
        processingJob: {
          include: {
            logs: {
              orderBy: { createdAt: 'asc' },
              take: 100,
            },
          },
        },
        biRequest: {
          select: { id: true, status: true, businessName: true, dashboardType: true, message: true, businessType: true },
        },
        dashboards: {
          select: { id: true, status: true, name: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Ownership guard: a client may only view their own uploads.
    const identityClientId = await resolveClientId(req);
    if (identityClientId && upload.clientId !== identityClientId) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({ success: true, data: upload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/logs — Processing logs ────────────

router.get('/:id/logs', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const job = await prisma.biProcessingJob.findFirst({
      where: { uploadId: req.params.id },
    });

    if (!job) {
      return res.json({ success: true, data: [] });
    }

    const logs = await prisma.biProcessingLog.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/summary — Dashboard summary ───────

router.get('/:id/summary', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const timezone = req.query.timezone || 'UTC';
    const summary = await warehouseService.getDashboardSummary(
      upload.clientId,
      upload.businessType,
      timezone
    );

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/bi-uploads/:id — Delete an upload ──────────────

router.delete('/:id', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      include: { processingJob: true, files: true },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete processing logs + job if exists
    if (upload.processingJob) {
      await prisma.biProcessingLog.deleteMany({ where: { jobId: upload.processingJob.id } });
      await prisma.biProcessingJob.delete({ where: { id: upload.processingJob.id } });
    }

    // Delete uploaded file records
    if (upload.files.length > 0) {
      await prisma.biUploadFile.deleteMany({ where: { uploadId: upload.id } });
    }

    // Delete the upload record itself
    await prisma.biUpload.delete({ where: { id: upload.id } });

    // Delete ZIP from disk
    if (upload.filePath && fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    console.log(`[UPLOAD] Deleted uploadId=${upload.id}`);
    res.json({ success: true, message: 'Upload deleted permanently' });
  } catch (error) {
    console.error('[UPLOAD] Delete failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi-uploads/:id/cancel — Cancel a pending upload ──

router.post('/:id/cancel', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      include: { processingJob: true },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (!['UPLOADED', 'PENDING_PAYMENT_VERIFICATION', 'VALIDATING', 'PROCESSING'].includes(upload.status)) {
      return res.status(400).json({ error: `Cannot cancel upload with status "${upload.status}"` });
    }

    // Mark upload as FAILED
    await prisma.biUpload.update({
      where: { id: upload.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Cancelled by user',
      },
    });

    // Mark processing job as FAILED if one exists
    if (upload.processingJob) {
      await prisma.biProcessingJob.update({
        where: { id: upload.processingJob.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Cancelled by user',
          completedAt: new Date(),
        },
      });

      // Add a cancellation log entry
      await prisma.biProcessingLog.create({
        data: {
          jobId: upload.processingJob.id,
          step: 'CANCELLED',
          level: 'WARN',
          message: 'Upload cancelled by user',
        },
      });
    }

    // Delete the ZIP file from disk
    if (upload.filePath && fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    console.log(`[UPLOAD] Cancelled uploadId=${upload.id}`);
    res.json({ success: true, message: 'Upload cancelled successfully' });
  } catch (error) {
    console.error('[UPLOAD] Cancel failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/clients — List unique clients ─────────

router.get('/clients/list', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        licenses: {
          select: { sector: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = clients.map(c => ({
      clientId: c.id,
      name: c.name,
      businessType: c.licenses[0]?.sector || null,
    }));

    const knownIds = new Set(mapped.map(c => c.clientId));

    const uploadClients = await prisma.biUpload.findMany({
      select: { clientId: true, businessType: true },
      distinct: ['clientId'],
      where: { clientId: { not: null } },
    });

    for (const u of uploadClients) {
      if (!knownIds.has(u.clientId)) {
        mapped.push({ clientId: u.clientId, name: u.clientId, businessType: u.businessType });
        knownIds.add(u.clientId);
      }
    }

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi-uploads/:id/start-etl — Manual ETL trigger ────
// Wrapper: syncs request status + timeline around the unchanged etlPipeline.run()
// call and protects against duplicate execution (plan refinements #10/#14).

router.post('/:id/start-etl', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      include: { processingJob: true },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (!upload.requestId) {
      return res.status(400).json({ error: 'Upload is not linked to any BI request. Provide a requestId during upload.' });
    }

    const linkedRequest = await prisma.biRequest.findUnique({
      where: { id: upload.requestId },
      select: { id: true, status: true },
    });

    if (!linkedRequest) {
      return res.status(400).json({ error: 'Linked BI request not found.' });
    }

    if (linkedRequest.status !== 'APPROVED') {
      return res.status(400).json({
        error: `Cannot start ETL. Linked request has status "${linkedRequest.status}". Only APPROVED requests can be processed.`,
      });
    }

    const PROCESSING_STATUSES = ['VALIDATING', 'PROCESSING'];
    if (PROCESSING_STATUSES.includes(upload.status)) {
      return res.status(400).json({ error: 'ETL is already running for this upload.' });
    }

    const COMPLETED_STATUSES = ['COMPLETED'];
    if (COMPLETED_STATUSES.includes(upload.status)) {
      return res.status(400).json({ error: 'ETL has already been completed for this upload.' });
    }

    // Atomic guard: APPROVED → PROCESSING_ETL. A concurrent admin / double
    // click loses this transition and receives STATE_CONFLICT.
    const won = await guardTransition({
      model: 'biRequest',
      id: upload.requestId,
      allowedStatuses: [REQUEST_STATUS.APPROVED],
      nextStatus: REQUEST_STATUS.PROCESSING_ETL,
    });
    if (!won) {
      return res.status(409).json({
        error: 'STATE_CONFLICT',
        message: `Request is no longer in a state that allows ETL (current: "${linkedRequest.status}").`,
      });
    }

    await recordEvent({
      requestId: upload.requestId,
      type: EVENT_TYPES.ETL_STARTED,
      metadata: { uploadId: upload.id },
      performedByRole: 'ADMIN',
    });

    // Update upload status to VALIDATING
    await prisma.biUpload.update({
      where: { id: upload.id },
      data: { status: 'VALIDATING', errorMessage: null },
    });

    // Create or update processing job
    const existingJob = await prisma.biProcessingJob.findFirst({ where: { uploadId: upload.id } });
    if (existingJob) {
      await prisma.biProcessingJob.update({
        where: { id: existingJob.id },
        data: { status: 'QUEUED', startedAt: new Date(), errorMessage: null, completedAt: null, recordsLoaded: 0 },
      });
    } else {
      await prisma.biProcessingJob.create({
        data: { uploadId: upload.id, status: 'QUEUED', startedAt: new Date() },
      });
    }

    // Fire ETL in background (don't await)
    etlPipeline.run(upload.id, upload.filePath)
      .then(async (result) => {
        console.log(`[UPLOAD] ETL completed for uploadId=${upload.id}: ${result.recordsLoaded} records in ${result.elapsed}s`);
        // Sync request: PROCESSING_ETL → DATA_REVIEW (only if still processing)
        await guardTransition({
          model: 'biRequest',
          id: upload.requestId,
          allowedStatuses: [REQUEST_STATUS.PROCESSING_ETL],
          nextStatus: REQUEST_STATUS.DATA_REVIEW,
        });
        await recordEvent({
          requestId: upload.requestId,
          type: EVENT_TYPES.ETL_COMPLETED,
          metadata: { uploadId: upload.id, recordsLoaded: result.recordsLoaded, elapsed: result.elapsed },
          performedByRole: 'system',
        });
      })
      .catch(async (err) => {
        console.error(`[UPLOAD] ETL failed for uploadId=${upload.id}:`, err.message);
        // Revert request to APPROVED so the admin can retry after fixing data.
        await guardTransition({
          model: 'biRequest',
          id: upload.requestId,
          allowedStatuses: [REQUEST_STATUS.PROCESSING_ETL],
          nextStatus: REQUEST_STATUS.APPROVED,
        });
        await recordEvent({
          requestId: upload.requestId,
          type: EVENT_TYPES.ETL_FAILED,
          message: err.message,
          metadata: { uploadId: upload.id },
          performedByRole: 'system',
        });
      });

    res.status(202).json({
      success: true,
      message: 'ETL pipeline started. Check upload details for progress.',
      uploadId: upload.id,
    });
  } catch (error) {
    console.error('[UPLOAD] Start ETL failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/download — Admin ZIP download ────────

router.get('/:id/download', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      select: { filePath: true, fileName: true },
    });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });
    if (!upload.filePath || !fs.existsSync(upload.filePath)) {
      return res.status(404).json({ error: 'Uploaded file no longer exists on disk' });
    }
    res.download(upload.filePath, upload.fileName || 'bi_export.zip');
  } catch (error) {
    console.error('[UPLOAD] Download failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── WIZARD ENDPOINTS ─────────────────────────────────────────────

const { loadPreview, savePreview, previewPath } = require('../utils/bi-preview-store');

// ─── POST /api/bi-uploads/:id/validate — Extract & Validate ─────

router.post('/:id/validate', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({ where: { id: req.params.id } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const result = await etlPipeline.extractAndValidate(upload.id, upload.filePath);

    // Tenant isolation: always attribute the warehouse snapshot to the client
    // selected on the upload, never to the clientId embedded in the ZIP.
    if (upload.clientId) {
      result.metadata.clientId = upload.clientId;
    }

    // Store validation result on upload record
    await prisma.biUpload.update({
      where: { id: upload.id },
      data: {
        status: 'VALIDATED',
        totalFiles: Object.keys(result.datasets).length,
        totalRows: Object.values(result.datasets).reduce((s, d) => s + d.rows.length, 0),
      },
    });

    // Store raw datasets + validation in preview file for wizard
    savePreview(upload.id, {
      metadata: result.metadata,
      validation: result.validation,
      rawDatasets: result.datasets,
      wizardStep: 'validated',
    });

    res.json({
      success: true,
      data: {
        metadata: result.metadata,
        validation: result.validation,
        totalRows: Object.values(result.datasets).reduce((s, d) => s + d.rows.length, 0),
        totalDatasets: Object.keys(result.datasets).length,
      },
    });
  } catch (error) {
    console.error('[VALIDATE] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/validation-report — Get validation ──

router.get('/:id/validation-report', async (req, res) => {
  try {
    const preview = loadPreview(req.params.id);
    if (!preview || !preview.validation) {
      return res.status(400).json({ error: 'Validation not yet performed. Run validate first.' });
    }
    res.json({ success: true, data: preview.validation, metadata: preview.metadata });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/raw-preview — Preview raw CSV data ──

router.get('/:id/raw-preview', async (req, res) => {
  try {
    const preview = loadPreview(req.params.id);
    if (!preview || !preview.rawDatasets) {
      return res.status(400).json({ error: 'No raw data available. Run validate first.' });
    }

    const { dataset: key, page = 1, pageSize = 50 } = req.query;
    const datasets = preview.rawDatasets;

    if (key) {
      if (!datasets[key]) return res.status(404).json({ error: `Dataset "${key}" not found` });
      const ds = datasets[key];
      const start = (parseInt(page) - 1) * parseInt(pageSize);
      const rows = ds.rows.slice(start, start + parseInt(pageSize));
      return res.json({
        success: true,
        data: {
          dataset: key,
          header: ds.header,
          rows,
          totalRows: ds.rows.length,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(ds.rows.length / parseInt(pageSize)),
        },
      });
    }

    // Return summary of all datasets
    const summary = {};
    for (const [k, ds] of Object.entries(datasets)) {
      summary[k] = { columns: ds.header, rows: ds.rows.length };
    }
    res.json({ success: true, data: { datasets: summary } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi-uploads/:id/prepare — Prepare warehouse (memory) ──

router.post('/:id/prepare', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({ where: { id: req.params.id } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const preview = loadPreview(req.params.id);
    if (!preview || !preview.rawDatasets) {
      return res.status(400).json({ error: 'No raw data. Run validate first.' });
    }

    const result = await etlPipeline.prepareWarehouse(preview.rawDatasets, preview.metadata, upload.id);

    // Update preview file with prepared warehouse data
    preview.cleanedDatasets = result.cleanedDatasets;
    preview.warehouse = result.warehouse;
    preview.statistics = result.statistics;
    preview.changes = result.changes;
    preview.profiles = result.profiles;
    preview.skippedRows = result.skippedRows;
    preview.orphanWarnings = result.orphanWarnings;
    preview.preparationStatus = result.status;
    preview.wizardStep = 'prepared';
    savePreview(req.params.id, preview);

    await prisma.biUpload.update({
      where: { id: upload.id },
      data: { status: 'PREPARED' },
    });

    const errors = result.changes.filter(c => c.severity === 'ERROR');

    res.json({
      success: true,
      data: {
        warehouse: {
          dimensions: Object.fromEntries(
            Object.entries(result.warehouse.dimensions).map(([k, v]) => [k, v.length])
          ),
          facts: Object.fromEntries(
            Object.entries(result.warehouse.facts).map(([k, v]) => [k, v.length])
          ),
        },
        statistics: result.statistics,
        status: result.status,
        changesCount: result.changes.length,
        unresolvedErrors: errors.length,
      },
    });
  } catch (error) {
    console.error('[PREPARE] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/transformation-preview — Before/After ──

router.get('/:id/transformation-preview', async (req, res) => {
  try {
    const preview = loadPreview(req.params.id);
    if (!preview || !preview.warehouse) {
      return res.status(400).json({ error: 'Warehouse not prepared. Run prepare first.' });
    }

    const { section, table, page = 1, pageSize = 50 } = req.query;

    if (section && table) {
      if (section === 'raw' && preview.rawDatasets[table]) {
        const ds = preview.rawDatasets[table];
        const start = (parseInt(page) - 1) * parseInt(pageSize);
        return res.json({
          success: true, section, table,
          data: { header: ds.header, rows: ds.rows.slice(start, start + parseInt(pageSize)), totalRows: ds.rows.length },
        });
      }
      if (section === 'cleaned' && preview.cleanedDatasets && preview.cleanedDatasets[table]) {
        const ds = preview.cleanedDatasets[table];
        const start = (parseInt(page) - 1) * parseInt(pageSize);
        return res.json({
          success: true, section, table,
          data: { header: ds.header, rows: ds.rows.slice(start, start + parseInt(pageSize)), totalRows: ds.rows.length },
        });
      }
      if (section === 'dimensions' && preview.warehouse.dimensions[table]) {
        const rows = preview.warehouse.dimensions[table];
        const start = (parseInt(page) - 1) * parseInt(pageSize);
        return res.json({
          success: true, section: 'dimensions', table,
          data: { rows: rows.slice(start, start + parseInt(pageSize)), totalRows: rows.length },
        });
      }
      if (section === 'facts' && preview.warehouse.facts[table]) {
        const rows = preview.warehouse.facts[table];
        const start = (parseInt(page) - 1) * parseInt(pageSize);
        return res.json({
          success: true, section: 'facts', table,
          data: { rows: rows.slice(start, start + parseInt(pageSize)), totalRows: rows.length },
        });
      }
      return res.status(404).json({ error: `Table "${table}" not found in section "${section}"` });
    }

    // Return summary
    const summary = { raw: {}, dimensions: {}, facts: {} };
    if (preview.rawDatasets) {
      for (const [k, ds] of Object.entries(preview.rawDatasets)) summary.raw[k] = ds.rows.length;
    }
    if (preview.cleanedDatasets) {
      summary.cleaned = {};
      for (const [k, ds] of Object.entries(preview.cleanedDatasets)) summary.cleaned[k] = ds.rows.length;
    }
    if (preview.warehouse) {
      for (const [k, v] of Object.entries(preview.warehouse.dimensions)) summary.dimensions[k] = v.length;
      for (const [k, v] of Object.entries(preview.warehouse.facts)) summary.facts[k] = v.length;
    }

    res.json({
      success: true,
      data: summary,
      statistics: preview.statistics,
      changes: preview.changes,
      preparationStatus: preview.preparationStatus,
      wizardStep: preview.wizardStep,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/dimensional-model — Read-only model ──

router.get('/:id/dimensional-model', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({ where: { id: req.params.id } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const preview = loadPreview(req.params.id);
    if (!preview || !preview.warehouse) {
      return res.status(400).json({ error: 'Warehouse not prepared. Run prepare first.' });
    }

    const model = buildDimensionalModel(preview.warehouse);
    res.json({ success: true, data: model });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi-uploads/:id/correct — Apply corrections ────────
router.post('/:id/correct', async (req, res) => {
  try {
    const preview = loadPreview(req.params.id);
    if (!preview || !preview.warehouse) {
      return res.status(400).json({ error: 'No prepared data. Run prepare first.' });
    }

    const { section, table, rowIndex, changes } = req.body;
    if (!section || !table || rowIndex === undefined || !changes) {
      return res.status(400).json({ error: 'section, table, rowIndex, and changes are required' });
    }

    let target;
    if (section === 'cleaned' && preview.cleanedDatasets && preview.cleanedDatasets[table]) {
      target = preview.cleanedDatasets[table].rows;
    } else if (section === 'dimensions' && preview.warehouse.dimensions[table]) {
      target = preview.warehouse.dimensions[table];
    } else if (section === 'facts' && preview.warehouse.facts[table]) {
      target = preview.warehouse.facts[table];
    } else {
      return res.status(404).json({ error: `Target not found: ${section}/${table}` });
    }

    if (rowIndex < 0 || rowIndex >= target.length) {
      return res.status(400).json({ error: `rowIndex ${rowIndex} out of range (0-${target.length - 1})` });
    }

    Object.assign(target[rowIndex], changes);

    // Persist the correction as a replayable overlay keyed by stable
    // sourceRowIndex so re-derivation at load time can never clobber a fix.
    preview.corrections = preview.corrections || {};
    preview.corrections[section] = preview.corrections[section] || {};
    preview.corrections[section][table] = preview.corrections[section][table] || {};
    preview.corrections[section][table][rowIndex] = {
      ...(preview.corrections[section][table][rowIndex] || {}),
      ...changes,
    };

    // Mark matching preparation ERROR issues as resolved when the admin
    // overwrites the cell with a non-empty value.
    if (section === 'cleaned' && preview.changes && Array.isArray(preview.changes)) {
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) continue;
        for (const c of preview.changes) {
          if (c.dataset === table && c.rowIndex === rowIndex && c.column === key && c.severity === 'ERROR') {
            c.resolved = true;
            c.preparedValue = value;
            c.action = 'MANUALLY_CORRECTED';
            c.reason = 'Manual correction by reviewer';
          }
        }
      }
    }

    preview.wizardStep = 'correcting';
    savePreview(req.params.id, preview);

    res.json({ success: true, message: 'Correction applied' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi-uploads/:id/confirm-load — Load into warehouse ──

router.post('/:id/confirm-load', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({ where: { id: req.params.id } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const preview = loadPreview(req.params.id);
    if (!preview || !preview.warehouse) {
      return res.status(400).json({ error: 'No prepared data. Run prepare first.' });
    }

    // Run the warehouse load with corrected data
    const result = await etlPipeline.loadIntoWarehouse(upload.id, preview);

    // Interactive ETL is the processing path for client BI requests: when the
    // linked request is APPROVED, move it to DATA_REVIEW (same transition the
    // background pipeline performs after a successful run) so the admin can
    // generate the dashboard.
    if (upload.requestId) {
      const won = await guardTransition({
        model: 'biRequest',
        id: upload.requestId,
        allowedStatuses: [REQUEST_STATUS.APPROVED],
        nextStatus: REQUEST_STATUS.DATA_REVIEW,
      });
      if (won) {
        await recordEvent({
          requestId: upload.requestId,
          type: EVENT_TYPES.ETL_COMPLETED,
          metadata: { uploadId: upload.id, recordsLoaded: result.recordsLoaded, elapsed: result.elapsed },
          performedByRole: 'system',
        });
      }
    }

    // Clean up preview file
    try { fs.unlinkSync(previewPath(req.params.id)); } catch {}

    res.json({
      success: true,
      data: {
        recordsLoaded: result.recordsLoaded,
        elapsed: result.elapsed,
        report: {
          skippedRows: result.skippedRows,
          orphanWarnings: result.orphanWarnings,
          appliedCorrections: result.appliedCorrections,
          unresolvedIssues: result.unresolvedIssues,
        },
      },
    });
  } catch (error) {
    console.error('[CONFIRM-LOAD] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi-uploads/:id/report — Success report ─────────────

router.get('/:id/report', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      include: {
        processingJob: { select: { status: true, recordsLoaded: true, startedAt: true, completedAt: true } },
        dashboards: { select: { id: true, name: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const elapsed = upload.processingJob?.startedAt && upload.processingJob?.completedAt
      ? ((new Date(upload.processingJob.completedAt) - new Date(upload.processingJob.startedAt)) / 1000).toFixed(1)
      : null;

    res.json({
      success: true,
      data: {
        uploadId: upload.id,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        status: upload.status,
        totalRows: upload.totalRows,
        recordsLoaded: upload.processingJob?.recordsLoaded || 0,
        elapsed,
        processingJob: upload.processingJob,
        dashboard: upload.dashboards?.[0] || null,
        createdAt: upload.createdAt,
        completedAt: upload.processingJob?.completedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi-uploads/:id/admin-approve — Quick admin approval for in-person requests ──

router.post('/:id/admin-approve', async (req, res) => {
  try {
    const { businessType, businessName, licenseId } = req.body;

    const upload = await prisma.biUpload.findUnique({
      where: { id: req.params.id },
      select: { id: true, clientId: true, businessType: true, requestId: true, status: true },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (upload.requestId) {
      const existing = await prisma.biRequest.findUnique({ where: { id: upload.requestId }, select: { status: true } });
      if (existing && existing.status === 'APPROVED') {
        return res.status(400).json({ error: 'Upload already linked to an approved request.' });
      }
    }

    // Create BiRequest with APPROVED + VERIFIED
    const biRequest = await prisma.biRequest.create({
      data: {
        clientId: upload.clientId,
        licenseId: licenseId || null,
        businessType: businessType || upload.businessType || 'unknown',
        businessName: businessName || `Client ${upload.clientId}`,
        message: 'Admin quick approval — in-person request, cash payment',
        status: 'APPROVED',
        paymentStatus: 'VERIFIED',
        paymentMethod: 'cash',
        paymentNotes: 'Payment verified in person by admin',
        files: [],
      },
    });

    // Link upload to the new request
    await prisma.biUpload.update({
      where: { id: upload.id },
      data: { requestId: biRequest.id },
    });

    // Notifications
    await prisma.biNotification.create({
      data: {
        clientId: upload.clientId,
        type: 'PAYMENT_VERIFIED',
        category: 'PAYMENT',
        title: 'Paiement Vérifié',
        message: `Paiement en espèces vérifié par l'administrateur pour la demande BI.`,
      },
    });

    await prisma.biNotification.create({
      data: {
        clientId: upload.clientId,
        type: 'REQUEST_APPROVED',
        category: 'REQUEST',
        title: 'Demande BI Approuvée',
        message: `La demande de tableau de bord pour "${businessName || upload.clientId}" a été approuvée.`,
      },
    });

    console.log(`[ADMIN-APPROVE] Created requestId=${biRequest.id} for uploadId=${upload.id}`);
    res.status(201).json({
      success: true,
      data: { biRequest, uploadId: upload.id },
      message: 'Approbation rapide effectuée. Demande créée et liée au téléversement.',
    });
  } catch (error) {
    console.error('[ADMIN-APPROVE] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
