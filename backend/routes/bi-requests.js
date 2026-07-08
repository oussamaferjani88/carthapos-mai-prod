const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const uploadsDir = path.join(__dirname, '..', 'uploads', 'bi-requests');

const STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REQUEST_INFO: 'REQUEST_INFO',
};

const VALID_STATUSES = Object.values(STATUS);

const VALID_PAYMENT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

function ensureDirs() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirs();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.csv';
    const safeBase = path
      .basename(file.originalname || 'data', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const lower = (file.originalname || '').toLowerCase();
    if (!lower.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
});

function parseJsonField(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// POST /api/bi-requests — Create BI dashboard request with CSV files
router.post('/', upload.array('csvFiles', 10), async (req, res) => {
  try {
    const {
      licenseId,
      businessName,
      dashboardType,
      message,
      userId,
      userEmail,
    } = req.body;

    if (!licenseId || !dashboardType || !message) {
      return res.status(400).json({
        error: 'licenseId, dashboardType, and message are required',
      });
    }

    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      select: { clientId: true },
    });

    if (!license) {
      return res.status(400).json({ error: 'Invalid licenseId' });
    }

    const files = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      size: file.size,
      url: `/uploads/bi-requests/${file.filename}`,
      uploadedAt: new Date().toISOString(),
    }));

    const objectives = parseJsonField(req.body.objectives, []);
    const kpis = parseJsonField(req.body.kpis, []);
    const dashboardRequirements = req.body.dashboardRequirements || null;

    const request = await prisma.biRequest.create({
      data: {
        clientId: license.clientId,
        licenseId,
        businessType: dashboardType,
        businessName: businessName || '',
        message,
        objectives,
        kpis,
        dashboardRequirements,
        dashboardType,
        userId: userId || null,
        userEmail: userEmail || null,
        status: STATUS.PENDING_REVIEW,
        paymentStatus: 'PENDING',
        specialistNotes: '',
        files,
      },
    });

    res.status(201).json({
      message: 'BI request submitted successfully',
      request,
    });
  } catch (error) {
    console.error('Error creating BI request:', error);
    res.status(500).json({ error: 'Failed to create BI request' });
  }
});

// GET /api/bi-requests — List BI requests (admin or user filtered)
router.get('/', async (req, res) => {
  try {
    const { userId, userEmail, licenseId, status, q, page, pageSize, sort } = req.query;

    const where = {};

    if (status) where.status = status;
    if (licenseId) where.licenseId = licenseId;
    if (userId) where.userId = userId;
    if (userEmail) where.userEmail = userEmail;

    if (q && q.trim()) {
      const needle = q.trim();
      where.OR = [
        { id: { contains: needle, mode: 'insensitive' } },
        { licenseId: { contains: needle, mode: 'insensitive' } },
        { businessName: { contains: needle, mode: 'insensitive' } },
        { dashboardType: { contains: needle, mode: 'insensitive' } },
        { message: { contains: needle, mode: 'insensitive' } },
        { userEmail: { contains: needle, mode: 'insensitive' } },
      ];
    }

    const hasPagination = page !== undefined || pageSize !== undefined;

    if (!hasPagination) {
      const orderBy = sort === 'oldest'
        ? { createdAt: 'asc' }
        : { createdAt: 'desc' };

      const items = await prisma.biRequest.findMany({
        where,
        orderBy,
      });

      return res.json(items);
    }

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '20'), 10) || 20, 1), 100);

    if (sort === 'status') {
      const statusRank = {
        APPROVED: 1,
        PENDING_REVIEW: 2,
        REJECTED: 3,
        REQUEST_INFO: 4,
      };

      const all = await prisma.biRequest.findMany({ where });

      const sorted = [...all].sort((a, b) => {
        const aRank = statusRank[a.status] || 99;
        const bRank = statusRank[b.status] || 99;
        if (aRank !== bRank) return aRank - bRank;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const total = sorted.length;
      const start = (parsedPage - 1) * parsedPageSize;
      const items = sorted.slice(start, start + parsedPageSize);

      return res.json({
        items,
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.max(Math.ceil(total / parsedPageSize), 1),
      });
    }

    const orderBy = sort === 'oldest'
      ? { createdAt: 'asc' }
      : { createdAt: 'desc' };

    const [total, items] = await Promise.all([
      prisma.biRequest.count({ where }),
      prisma.biRequest.findMany({
        where,
        orderBy,
        skip: (parsedPage - 1) * parsedPageSize,
        take: parsedPageSize,
      }),
    ]);

    res.json({
      items,
      total,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalPages: Math.max(Math.ceil(total / parsedPageSize), 1),
    });
  } catch (error) {
    console.error('Error fetching BI requests:', error);
    res.status(500).json({ error: 'Failed to fetch BI requests' });
  }
});

// GET /api/bi-requests/:id — Get one BI request
router.get('/:id', async (req, res) => {
  try {
    const request = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching BI request:', error);
    res.status(500).json({ error: 'Failed to fetch BI request' });
  }
});

// PATCH /api/bi-requests/:id/status — Update request status / payment / notes
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, specialistNotes, paymentStatus, paymentMethod, paymentNotes, adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    const updateData = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      updateData.status = status;
    }

    if (specialistNotes !== undefined) {
      updateData.specialistNotes = specialistNotes;
    }

    if (paymentStatus !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({
          error: `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}`,
        });
      }
      updateData.paymentStatus = paymentStatus;
    }

    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
    }

    if (paymentNotes !== undefined) {
      updateData.paymentNotes = paymentNotes;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const request = await prisma.biRequest.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      message: 'BI request updated successfully',
      request,
    });
  } catch (error) {
    console.error('Error updating BI request status:', error);
    res.status(500).json({ error: 'Failed to update BI request status' });
  }
});

// ─── Notification helper ───────────────────────────────────────
async function createNotification(clientId, title, message, type) {
  if (!clientId) return;
  try {
    await prisma.biNotification.create({
      data: { clientId, title, message, type: type || 'REQUEST_UPDATE' },
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// PATCH /api/bi-requests/:id/payment — Verify or reject payment
router.patch('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentNotes } = req.body;

    if (!paymentStatus || !['VERIFIED', 'REJECTED'].includes(paymentStatus)) {
      return res.status(400).json({
        error: 'paymentStatus must be VERIFIED or REJECTED',
      });
    }

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    if (existing.paymentStatus !== 'PENDING') {
      return res.status(400).json({
        error: `Payment already ${existing.paymentStatus.toLowerCase()}. Cannot change.`,
      });
    }

    const updateData = {
      paymentStatus,
      paymentMethod: paymentMethod || existing.paymentMethod,
      paymentNotes: paymentNotes !== undefined ? paymentNotes : existing.paymentNotes,
    };

    if (paymentStatus === 'REJECTED') {
      updateData.status = 'REJECTED';
    }

    const request = await prisma.biRequest.update({
      where: { id: req.params.id },
      data: updateData,
    });

    const notifTitle = paymentStatus === 'VERIFIED'
      ? 'Payment verified'
      : 'Payment rejected';
    const notifMsg = paymentStatus === 'VERIFIED'
      ? `Your payment has been verified for BI request ${request.id}.`
      : `Your payment for BI request ${request.id} has been rejected.`;

    await createNotification(request.clientId, notifTitle, notifMsg, paymentStatus === 'VERIFIED' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED');

    res.json({
      message: paymentStatus === 'VERIFIED' ? 'Payment verified successfully' : 'Payment rejected',
      request,
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// PATCH /api/bi-requests/:id/approve — Approve request (requires VERIFIED payment)
router.patch('/:id/approve', async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    if (existing.paymentStatus !== 'VERIFIED') {
      return res.status(400).json({
        error: 'Cannot approve. Payment must be VERIFIED first.',
      });
    }

    if (existing.status !== 'PENDING_REVIEW' && existing.status !== 'REQUEST_INFO') {
      return res.status(400).json({
        error: `Cannot approve request with status ${existing.status}.`,
      });
    }

    const request = await prisma.biRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
      },
    });

    await createNotification(
      request.clientId,
      'Request approved',
      `Your BI request ${request.id} has been approved. You may proceed with data preparation.`,
      'REQUEST_APPROVED'
    );

    res.json({ message: 'BI request approved successfully', request });
  } catch (error) {
    console.error('Error approving BI request:', error);
    res.status(500).json({ error: 'Failed to approve BI request' });
  }
});

// PATCH /api/bi-requests/:id/reject — Reject request
router.patch('/:id/reject', async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    if (existing.status === 'APPROVED' || existing.status === 'REJECTED') {
      return res.status(400).json({
        error: `Cannot reject request with terminal status ${existing.status}.`,
      });
    }

    const request = await prisma.biRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
      },
    });

    await createNotification(
      request.clientId,
      'Request rejected',
      `Your BI request ${request.id} has been rejected.`,
      'REQUEST_REJECTED'
    );

    res.json({ message: 'BI request rejected', request });
  } catch (error) {
    console.error('Error rejecting BI request:', error);
    res.status(500).json({ error: 'Failed to reject BI request' });
  }
});

// PATCH /api/bi-requests/:id/request-info — Request additional information
router.patch('/:id/request-info', async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const existing = await prisma.biRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    if (existing.status !== 'PENDING_REVIEW') {
      return res.status(400).json({
        error: `Cannot request info for request with status ${existing.status}.`,
      });
    }

    const request = await prisma.biRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'REQUEST_INFO',
        adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
      },
    });

    await createNotification(
      request.clientId,
      'Additional information required',
      `Additional information is required for your BI request ${request.id}.${adminNotes ? ' ' + adminNotes : ''}`,
      'REQUEST_INFO'
    );

    res.json({ message: 'Requested additional information', request });
  } catch (error) {
    console.error('Error requesting info for BI request:', error);
    res.status(500).json({ error: 'Failed to request additional information' });
  }
});

module.exports = router;
