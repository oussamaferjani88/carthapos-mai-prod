const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const etlPipeline = require('../services/etl-pipeline');

const { resolveClientId } = require('../utils/identity');
const { savePreview } = require('../utils/bi-preview-store');
const {
  REQUEST_STATUS,
  PAYMENT_STATUS,
  EVENT_TYPES,
  VALID_REQUEST_STATUSES,
  VALID_PAYMENT_STATUSES,
  TERMINAL_REQUEST_STATUSES,
} = require('../utils/bi-status');
const { prisma, recordEvent, serializeRequest, guardTransition } = require('../utils/bi-workflow');

const router = express.Router();

const legacyUploadsDir = path.join(__dirname, '..', 'uploads', 'bi-requests');
function ensureLegacyDir() {
  if (!fs.existsSync(legacyUploadsDir)) fs.mkdirSync(legacyUploadsDir, { recursive: true });
}

// ─── Multer: single instance for the atomic request creation. ──
// The `file` field carries the BI ZIP (→ uploads/bi-zips); `csvFiles` keeps
// the legacy CSV dialog working (→ uploads/bi-requests). One multer pass is
// required — applying two multer middlewares in a row truncates the stream
// ("Unexpected end of form").
const workflowStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'file' || file.fieldname === 'files') {
      const dir = path.join(__dirname, '..', 'uploads', 'bi-zips');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return cb(null, dir);
    }
    ensureLegacyDir();
    cb(null, legacyUploadsDir);
  },
  filename: (_req, file, cb) => {
    if (file.fieldname === 'file' || file.fieldname === 'files') {
      cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      return;
    }
    const ext = path.extname(file.originalname || '').toLowerCase() || '.csv';
    const safeBase = path.basename(file.originalname || 'data', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const workflowUpload = multer({
  storage: workflowStorage,
  limits: { fileSize: 100 * 1024 * 1024, files: 11 },
  fileFilter: (_req, file, cb) => {
    const lower = (file.originalname || '').toLowerCase();
    if (file.fieldname === 'file' || file.fieldname === 'files') {
      if (!lower.endsWith('.zip')) return cb(new Error('Only .zip files are allowed'));
      return cb(null, true);
    }
    if (file.fieldname === 'csvFiles') {
      if (!lower.endsWith('.csv')) return cb(new Error('Only CSV files are allowed'));
      return cb(null, true);
    }
    cb(new Error(`Unexpected field "${file.fieldname}"`));
  },
});

function multerRunner(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 100 MB.' });
        }
        return res.status(400).json({ error: `Invalid upload: ${err.message}` });
      }
      next();
    });
  };
}

function parseJsonField(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isTerminal(status) {
  return TERMINAL_REQUEST_STATUSES.includes(status);
}

function canReupload(status) {
  return !isTerminal(status) && status !== REQUEST_STATUS.PUBLISHED;
}

// ─── Background schema validation after ZIP upload (refinement #7) ──
async function validateUploadInBackground(upload) {
  try {
    const result = await etlPipeline.extractAndValidate(upload.id, upload.filePath);
    const datasets = result.datasets || {};
    const totalRows = Object.values(datasets).reduce((s, d) => s + (Array.isArray(d.rows) ? d.rows.length : 0), 0);
    await prisma.biUpload.update({
      where: { id: upload.id },
      data: {
        status: 'VALIDATED',
        totalFiles: Object.keys(datasets).length,
        totalRows,
        businessType: (result.metadata && result.metadata.businessType) || upload.businessType,
        errorMessage: null,
      },
    });
    savePreview(upload.id, {
      metadata: result.metadata,
      validation: result.validation,
      rawDatasets: result.datasets,
      wizardStep: 'validated',
    });
    await recordEvent({
      requestId: upload.requestId,
      type: EVENT_TYPES.ZIP_VALIDATED,
      metadata: { uploadId: upload.id, totalFiles: Object.keys(datasets).length, totalRows },
      performedByRole: 'system',
    });
    console.log(`[BI-REQUESTS] Background validation OK uploadId=${upload.id} requestId=${upload.requestId}`);
  } catch (error) {
    console.error(`[BI-REQUESTS] Background validation FAILED uploadId=${upload.id}:`, error.message);
    await prisma.biUpload
      .update({ where: { id: upload.id }, data: { status: 'FAILED', errorMessage: error.message } })
      .catch(() => {});
    await recordEvent({
      requestId: upload.requestId,
      type: EVENT_TYPES.ZIP_INVALID,
      message: error.message,
      metadata: { uploadId: upload.id },
      performedByRole: 'system',
    });
  }
}

// ─── POST /api/bi-requests — Create request (+ optional atomic ZIP) ──
router.post(
  '/',
  multerRunner(workflowUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'csvFiles', maxCount: 10 }])),
  async (req, res) => {
    try {
      const {
        licenseId,
        dashboardTemplate,
        dashboardType,
        businessName,
        message,
        paymentRequired,
      } = req.body;

      const clientId = await resolveClientId(req);
      if (!clientId) {
        return res.status(401).json({ error: 'Unable to resolve client identity.' });
      }

      let license = null;
      if (licenseId) {
        license = await prisma.license.findUnique({
          where: { id: licenseId },
          select: { clientId: true, sector: true },
        });
        if (!license) return res.status(400).json({ error: 'Invalid licenseId' });
        if (license.clientId !== clientId) {
          return res.status(403).json({ error: 'License does not belong to this client' });
        }
      }

      const templateKey = dashboardTemplate || dashboardType || (license && license.sector) || 'restaurant';

      const finalMessage =
        message && message.trim()
          ? message.trim()
          : `Demande de tableau de bord${businessName && businessName.trim() ? ` pour ${businessName.trim()}` : ''}.`;

      const files = (req.files && req.files.csvFiles ? req.files.csvFiles : []).map((file) => ({
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        url: `/uploads/bi-requests/${file.filename}`,
        uploadedAt: new Date().toISOString(),
      }));

      const requiresPayment = paymentRequired === true || paymentRequired === 'true';

      const request = await prisma.biRequest.create({
        data: {
          clientId,
          licenseId: licenseId || null,
          businessType: templateKey,
          businessName: businessName || '',
          message: finalMessage,
          objectives: parseJsonField(req.body.objectives, []),
          kpis: parseJsonField(req.body.kpis, []),
          dashboardRequirements: req.body.dashboardRequirements || null,
          dashboardTemplate: templateKey,
          paymentRequired: requiresPayment,
          status: REQUEST_STATUS.PENDING_REVIEW,
          paymentStatus: requiresPayment ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.NOT_REQUIRED,
          specialistNotes: '',
          files,
        },
      });

      await recordEvent({
        requestId: request.id,
        type: EVENT_TYPES.REQUEST_CREATED,
        performedByRole: 'CLIENT',
      });

      let upload = null;
      const zipFile = req.files && req.files.file ? req.files.file[0] : null;
      if (zipFile) {
        const fileHash = crypto.createHash('sha256').update(fs.readFileSync(zipFile.path)).digest('hex');
        upload = await prisma.biUpload.create({
          data: {
            clientId,
            requestId: request.id,
            businessType: templateKey,
            fileHash,
            fileName: zipFile.originalname,
            fileSize: zipFile.size,
            filePath: zipFile.path,
            status: 'UPLOADED',
          },
        });
        await recordEvent({
          requestId: request.id,
          type: EVENT_TYPES.ZIP_UPLOADED,
          metadata: { uploadId: upload.id, fileName: zipFile.originalname, size: zipFile.size },
          performedByRole: 'CLIENT',
        });
        validateUploadInBackground(upload);
      }

      const serialized = serializeRequest(request);
      if (upload) serialized.upload = { id: upload.id, fileName: upload.fileName, fileSize: upload.fileSize, status: upload.status };

      res.status(201).json({ message: 'BI request submitted successfully', request: serialized });
    } catch (error) {
      console.error('[BI-REQUESTS] Create failed:', error);
      res.status(500).json({ error: 'Failed to create BI request' });
    }
  }
);

// ─── POST /api/bi/requests/:id/uploads — Re-upload / replacement ZIPs ──
router.post(
  '/:id/uploads',
  multerRunner(workflowUpload.fields([{ name: 'files', maxCount: 5 }])),
  async (req, res) => {
    try {
      const existing = await prisma.biRequest.findUnique({
        where: { id: req.params.id },
        select: { id: true, clientId: true, status: true },
      });
      if (!existing) return res.status(404).json({ error: 'BI request not found' });
      if (!canReupload(existing.status)) {
        return res.status(400).json({
          error: `Cannot upload data to a request with status "${existing.status}".`,
        });
      }

      const clientId = await resolveClientId(req);
      if (clientId && clientId !== existing.clientId) {
        return res.status(403).json({ error: 'This request does not belong to your client' });
      }

      const files = (req.files && req.files.files ? req.files.files : []).filter((f) => f);
      if (files.length === 0) return res.status(400).json({ error: 'No ZIP file provided' });

      const created = [];
      for (const file of files) {
        const fileHash = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
        const upload = await prisma.biUpload.create({
          data: {
            clientId: existing.clientId,
            requestId: existing.id,
            businessType: existing.businessType,
            fileHash,
            fileName: file.originalname,
            fileSize: file.size,
            filePath: file.path,
            status: 'UPLOADED',
          },
        });
        created.push({ id: upload.id, fileName: upload.fileName, fileSize: upload.fileSize, status: upload.status });
        await recordEvent({
          requestId: existing.id,
          type: EVENT_TYPES.ZIP_UPLOADED,
          metadata: { uploadId: upload.id, fileName: file.originalname, size: file.size },
          performedByRole: 'CLIENT',
        });
        validateUploadInBackground(upload);
      }

      res.status(201).json({ success: true, message: 'ZIP uploaded successfully', data: { uploads: created } });
    } catch (error) {
      console.error('[BI-REQUESTS] Upload failed:', error);
      res.status(500).json({ error: 'Failed to upload ZIP' });
    }
  }
);

// ─── POST /api/bi-requests/:id/cancel — Client cancels a request ──
router.post('/:id/cancel', async (req, res) => {
  try {
    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    const won = await guardTransition({
      model: 'biRequest',
      id: req.params.id,
      allowedStatuses: [REQUEST_STATUS.PENDING_REVIEW, REQUEST_STATUS.REQUEST_INFO, REQUEST_STATUS.APPROVED],
      nextStatus: REQUEST_STATUS.CANCELLED,
    });
    if (!won) {
      return res.status(409).json({ error: 'STATE_CONFLICT', message: `Cannot cancel request with status "${existing.status}".` });
    }

    await recordEvent({
      requestId: req.params.id,
      type: EVENT_TYPES.REQUEST_CANCELLED,
      performedByRole: 'CLIENT',
    });

    const request = await prisma.biRequest.findUnique({ where: { id: req.params.id } });
    res.json({ message: 'BI request cancelled', request: serializeRequest(request) });
  } catch (error) {
    console.error('[BI-REQUESTS] Cancel failed:', error);
    res.status(500).json({ error: 'Failed to cancel BI request' });
  }
});

// ─── DELETE /api/bi-requests/:id — Admin deletes a request ────────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        uploads: {
          select: {
            id: true,
            status: true,
            processingJob: { select: { status: true } },
          },
        },
      },
    });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    const busy = existing.uploads.find(
      (u) =>
        u.status === 'PROCESSING' ||
        (u.processingJob && ['QUEUED', 'RUNNING', 'PROCESSING'].includes(u.processingJob.status))
    );
    if (busy) {
      return res.status(409).json({ error: 'Cannot delete a request while an ETL job is running.' });
    }

    // Only the request row is removed: events + notifications cascade, while
    // linked uploads / dashboards keep their rows (requestId set to null).
    await prisma.biRequest.delete({ where: { id: req.params.id } });
    res.json({ message: 'BI request deleted' });
  } catch (error) {
    console.error('[BI-REQUESTS] Delete failed:', error);
    res.status(500).json({ error: 'Failed to delete BI request' });
  }
});

// ─── GET /api/bi-requests — List (admin or client-scoped) ─────────
router.get('/', async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      licenseId,
      clientId,
      status,
      businessType,
      dashboardTemplate,
      paymentStatus,
      dateFrom,
      dateTo,
      q,
      page,
      pageSize,
      sort,
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (licenseId) where.licenseId = licenseId;
    if (userId) where.userId = userId;
    if (userEmail) where.userEmail = userEmail;
    if (businessType) where.businessType = businessType;
    if (dashboardTemplate) where.dashboardTemplate = dashboardTemplate;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Identity-forced tenant scoping: an authenticated client is always scoped
    // to their own requests, regardless of any clientId query parameter.
    const identityClientId = await resolveClientId(req);
    const scopedClientId = identityClientId || clientId;
    if (scopedClientId) where.clientId = scopedClientId;

    if (q && q.trim()) {
      const needle = q.trim();
      where.OR = [
        { id: { contains: needle, mode: 'insensitive' } },
        { licenseId: { contains: needle, mode: 'insensitive' } },
        { businessName: { contains: needle, mode: 'insensitive' } },
        { businessType: { contains: needle, mode: 'insensitive' } },
        { dashboardTemplate: { contains: needle, mode: 'insensitive' } },
        { message: { contains: needle, mode: 'insensitive' } },
        { userEmail: { contains: needle, mode: 'insensitive' } },
      ];
    }

    const include = {
      uploads: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, fileName: true, createdAt: true } },
      dashboards: { orderBy: { version: 'desc' }, take: 1, select: { id: true, name: true, status: true, version: true } },
    };

    // Sort: newest / oldest by date; completed / pending / rejected prioritise
    // the matching status (stable JS rank, then id-slice pagination).
    const statusPriority = { completed: 'COMPLETED', pending: 'PENDING_REVIEW', rejected: 'REJECTED' };
    const priorityStatus = statusPriority[sort];
    let orderBy = sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const hasPagination = page !== undefined || pageSize !== undefined;

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '20'), 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedPageSize;

    // Status-priority sorts: fetch the id+dates for ordering, rank in JS,
    // slice the page, then hydrate rows with includes and reorder by slice.
    if (priorityStatus) {
      const [all, total] = await Promise.all([
        prisma.biRequest.findMany({
          where,
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.biRequest.count({ where }),
      ]);
      const ranked = all
        .map((r) => ({ ...r, rank: r.status === priorityStatus ? 0 : 1 }))
        .sort((a, b) => a.rank - b.rank || new Date(b.createdAt) - new Date(a.createdAt));
      const pageIds = ranked.slice(skip, skip + parsedPageSize).map((r) => r.id);
      let items = [];
      if (pageIds.length) {
        items = await prisma.biRequest.findMany({
          where: { id: { in: pageIds } },
          include,
        });
        const byId = new Map(items.map((r) => [r.id, r]));
        items = pageIds.map((id) => byId.get(id)).filter(Boolean);
      }
      return res.json({
        items: items.map((r) => serializeRequest(r)),
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.max(Math.ceil(total / parsedPageSize), 1),
      });
    }

    if (!hasPagination) {
      const items = await prisma.biRequest.findMany({ where, orderBy, include });
      return res.json(items.map((r) => serializeRequest(r)));
    }

    const [total, items] = await Promise.all([
      prisma.biRequest.count({ where }),
      prisma.biRequest.findMany({ where, orderBy, include, skip, take: parsedPageSize }),
    ]);

    res.json({
      items: items.map((r) => serializeRequest(r)),
      total,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalPages: Math.max(Math.ceil(total / parsedPageSize), 1),
    });
  } catch (error) {
    console.error('[BI-REQUESTS] List failed:', error);
    res.status(500).json({ error: 'Failed to fetch BI requests' });
  }
});

// ─── GET /api/bi-requests/:id — Full detail + timeline ───────────
router.get('/:id', async (req, res) => {
  try {
    const request = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
      include: {
        events: { orderBy: { performedAt: 'desc' } },
        uploads: {
          orderBy: { createdAt: 'desc' },
          include: { files: true, processingJob: { include: { logs: { orderBy: { createdAt: 'asc' }, take: 50 } } } },
        },
        dashboards: { orderBy: { version: 'desc' } },
      },
    });

    if (!request) return res.status(404).json({ error: 'BI request not found' });

    const clientId = await resolveClientId(req);
    if (clientId && request.clientId !== clientId) {
      return res.status(403).json({ error: 'This request does not belong to your client' });
    }

    res.json(serializeRequest(request));
  } catch (error) {
    console.error('[BI-REQUESTS] Detail failed:', error);
    res.status(500).json({ error: 'Failed to fetch BI request' });
  }
});

// ─── PATCH /api/bi-requests/:id/status — Legacy raw update ────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, specialistNotes, paymentStatus, paymentMethod, paymentNotes, adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    const updateData = {};

    if (status !== undefined) {
      if (!VALID_REQUEST_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_REQUEST_STATUSES.join(', ')}` });
      }
      updateData.status = status;
    }
    if (specialistNotes !== undefined) updateData.specialistNotes = specialistNotes;
    if (paymentStatus !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ error: `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` });
      }
      updateData.paymentStatus = paymentStatus;
    }
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentNotes !== undefined) updateData.paymentNotes = paymentNotes;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const request = await prisma.biRequest.update({ where: { id: req.params.id }, data: updateData });

    res.json({ message: 'BI request updated successfully', request: serializeRequest(request) });
  } catch (error) {
    console.error('[BI-REQUESTS] Status update failed:', error);
    res.status(500).json({ error: 'Failed to update BI request status' });
  }
});

// ─── PATCH /api/bi-requests/:id/payment — Verify / reject payment ──
router.patch('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentNotes } = req.body;

    if (!paymentStatus || !['VERIFIED', 'REJECTED', 'NOT_REQUIRED'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'paymentStatus must be VERIFIED, REJECTED, or NOT_REQUIRED' });
    }

    const existing = await prisma.biRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    if (!['PENDING', 'NOT_REQUIRED'].includes(existing.paymentStatus)) {
      return res.status(400).json({ error: `Payment already ${existing.paymentStatus.toLowerCase()}. Cannot change.` });
    }

    const request = await prisma.biRequest.update({
      where: { id: req.params.id },
      data: {
        paymentStatus,
        paymentMethod: paymentMethod || existing.paymentMethod,
        paymentNotes: paymentNotes !== undefined ? paymentNotes : existing.paymentNotes,
      },
    });

    await recordEvent({
      requestId: req.params.id,
      type: paymentStatus === 'VERIFIED' ? EVENT_TYPES.PAYMENT_VERIFIED : EVENT_TYPES.PAYMENT_REJECTED,
      performedByRole: 'ADMIN',
    });

    res.json({
      message: paymentStatus === 'VERIFIED' ? 'Payment verified successfully' : 'Payment updated',
      request: serializeRequest(request),
    });
  } catch (error) {
    console.error('[BI-REQUESTS] Payment failed:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// ─── PATCH /api/bi-requests/:id/approve — Approve request ─────────
router.patch('/:id/approve', async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, paymentStatus: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    if (!['VERIFIED', 'NOT_REQUIRED'].includes(existing.paymentStatus)) {
      return res.status(400).json({ error: 'Cannot approve. Payment must be VERIFIED (or not required).' });
    }

    const won = await guardTransition({
      model: 'biRequest',
      id: req.params.id,
      allowedStatuses: [REQUEST_STATUS.PENDING_REVIEW, REQUEST_STATUS.REQUEST_INFO],
      nextStatus: REQUEST_STATUS.APPROVED,
      data: adminNotes !== undefined ? { adminNotes } : {},
    });
    if (!won) {
      return res.status(409).json({ error: 'STATE_CONFLICT', message: `Cannot approve request with status "${existing.status}".` });
    }

    await recordEvent({ requestId: req.params.id, type: EVENT_TYPES.REQUEST_APPROVED, performedByRole: 'ADMIN' });

    const request = await prisma.biRequest.findUnique({ where: { id: req.params.id } });
    res.json({ message: 'BI request approved successfully', request: serializeRequest(request) });
  } catch (error) {
    console.error('[BI-REQUESTS] Approve failed:', error);
    res.status(500).json({ error: 'Failed to approve BI request' });
  }
});

// ─── PATCH /api/bi-requests/:id/reject — Reject request ──────────
router.patch('/:id/reject', async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    const won = await guardTransition({
      model: 'biRequest',
      id: req.params.id,
      allowedStatuses: VALID_REQUEST_STATUSES.filter(
        (s) => ![REQUEST_STATUS.APPROVED, REQUEST_STATUS.REJECTED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.COMPLETED].includes(s)
      ),
      nextStatus: REQUEST_STATUS.REJECTED,
      data: adminNotes !== undefined ? { adminNotes } : {},
    });
    if (!won) {
      return res.status(409).json({ error: 'STATE_CONFLICT', message: `Cannot reject request with status "${existing.status}".` });
    }

    await recordEvent({ requestId: req.params.id, type: EVENT_TYPES.REQUEST_REJECTED, performedByRole: 'ADMIN' });

    const request = await prisma.biRequest.findUnique({ where: { id: req.params.id } });
    res.json({ message: 'BI request rejected', request: serializeRequest(request) });
  } catch (error) {
    console.error('[BI-REQUESTS] Reject failed:', error);
    res.status(500).json({ error: 'Failed to reject BI request' });
  }
});

// ─── PATCH /api/bi-requests/:id/request-info — Request more info ──
router.patch('/:id/request-info', async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: 'BI request not found' });

    const won = await guardTransition({
      model: 'biRequest',
      id: req.params.id,
      allowedStatuses: [REQUEST_STATUS.PENDING_REVIEW],
      nextStatus: REQUEST_STATUS.REQUEST_INFO,
      data: adminNotes !== undefined ? { adminNotes } : {},
    });
    if (!won) {
      return res.status(409).json({ error: 'STATE_CONFLICT', message: `Cannot request info for request with status "${existing.status}".` });
    }

    await recordEvent({
      requestId: req.params.id,
      type: EVENT_TYPES.REQUEST_INFO_REQUESTED,
      message: adminNotes || null,
      performedByRole: 'ADMIN',
    });

    const request = await prisma.biRequest.findUnique({ where: { id: req.params.id } });
    res.json({ message: 'Requested additional information', request: serializeRequest(request) });
  } catch (error) {
    console.error('[BI-REQUESTS] Request-info failed:', error);
    res.status(500).json({ error: 'Failed to request additional information' });
  }
});

module.exports = router;
