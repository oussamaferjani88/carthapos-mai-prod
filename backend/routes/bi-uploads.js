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

const prisma = new PrismaClient();

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

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { clientId, businessType } = req.body;
    console.log(`[UPLOAD] Request received  filename=${req.file.originalname} size=${req.file.size} clientId=${clientId}`);

    if (!clientId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'clientId is required' });
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
          await prisma.biUploadedFile.deleteMany({ where: { uploadId: existingDuplicate.id } });
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
        businessType: businessType || client.name || 'unknown',
        fileHash,
        fileName: req.file.originalname,
        fileSize,
        filePath,
        status: 'UPLOADED',
        totalFiles: 0,
        totalRows: 0,
      },
    });
    console.log(`[UPLOAD] Record created  uploadId=${uploadRecord.id} status=UPLOADED`);

    // Trigger ETL async with safe wrapper
    console.log(`[UPLOAD] Starting ETL worker...`);
    etlPipeline.run(uploadRecord.id, filePath)
      .then(result => {
        console.log(`[JOB] uploadId=${uploadRecord.id} status=COMPLETED records=${result.recordsLoaded}`);
      })
      .catch(err => {
        console.error(`[JOB] uploadId=${uploadRecord.id} status=FAILED error=${err.message}`);
      });

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
      message: 'Upload accepted. ETL processing started.',
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

    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

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
        },
      }),
      prisma.biUpload.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
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
      },
    });

    if (!upload) {
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

    const job = await prisma.biProcessingJob.findUnique({
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
      await prisma.biUploadedFile.deleteMany({ where: { uploadId: upload.id } });
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

    if (!['UPLOADED', 'VALIDATING', 'PROCESSING'].includes(upload.status)) {
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
    const clients = await prisma.biUpload.findMany({
      select: { clientId: true, businessType: true },
      distinct: ['clientId'],
      orderBy: { clientId: 'asc' },
    });
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
