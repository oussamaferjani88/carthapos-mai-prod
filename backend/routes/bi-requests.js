const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const multer = require('multer');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads', 'bi-requests');
const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'bi-requests.json');

const STATUS = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
};

function ensureDirs() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

async function readStore() {
  ensureDirs();
  if (!fs.existsSync(storePath)) {
    return [];
  }

  const raw = await fsp.readFile(storePath, 'utf8');
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(data) {
  ensureDirs();
  await fsp.writeFile(storePath, JSON.stringify(data, null, 2), 'utf8');
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

// POST /api/bi-requests - Create BI dashboard request with CSV files
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

    const files = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      size: file.size,
      url: `/uploads/bi-requests/${file.filename}`,
      uploadedAt: new Date().toISOString(),
    }));

    const now = new Date().toISOString();
    const request = {
      id: `bi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      licenseId,
      businessName: businessName || '',
      dashboardType,
      message,
      userId: userId || null,
      userEmail: userEmail || null,
      files,
      status: STATUS.PENDING,
      specialistNotes: '',
      createdAt: now,
      updatedAt: now,
    };

    const store = await readStore();
    store.unshift(request);
    await writeStore(store);

    res.status(201).json({
      message: 'BI request submitted successfully',
      request,
    });
  } catch (error) {
    console.error('Error creating BI request:', error);
    res.status(500).json({ error: 'Failed to create BI request' });
  }
});

// GET /api/bi-requests - List BI requests (admin or user filtered)
router.get('/', async (req, res) => {
  try {
    const { userId, userEmail, licenseId, status, q, page, pageSize, sort } = req.query;
    const store = await readStore();

    const filtered = store.filter((item) => {
      if (status && item.status !== status) return false;
      if (licenseId && item.licenseId !== licenseId) return false;
      if (userId && item.userId !== userId) return false;
      if (userEmail && item.userEmail !== userEmail) return false;
      if (q) {
        const needle = String(q).trim().toLowerCase();
        if (needle) {
          const haystack = [
            item.id,
            item.licenseId,
            item.businessName,
            item.dashboardType,
            item.message,
            item.userEmail,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
      }
      return true;
    });

    const statusRank = {
      DELIVERED: 1,
      IN_REVIEW: 2,
      PENDING: 3,
      REJECTED: 4,
    };

    const sorted = [...filtered].sort((a, b) => {
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();

      if (sort === 'oldest') {
        return aCreated - bCreated;
      }

      if (sort === 'status') {
        const aRank = statusRank[a.status] || 99;
        const bRank = statusRank[b.status] || 99;
        if (aRank !== bRank) return aRank - bRank;
        return bCreated - aCreated;
      }

      // newest (default)
      return bCreated - aCreated;
    });

    const hasPagination = page !== undefined || pageSize !== undefined;
    if (!hasPagination) {
      return res.json(sorted);
    }

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '20'), 10) || 20, 1), 100);
    const start = (parsedPage - 1) * parsedPageSize;
    const items = sorted.slice(start, start + parsedPageSize);

    res.json({
      items,
      total: sorted.length,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalPages: Math.max(Math.ceil(sorted.length / parsedPageSize), 1),
    });
  } catch (error) {
    console.error('Error fetching BI requests:', error);
    res.status(500).json({ error: 'Failed to fetch BI requests' });
  }
});

// GET /api/bi-requests/:id - Get one BI request
router.get('/:id', async (req, res) => {
  try {
    const store = await readStore();
    const request = store.find((item) => item.id === req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching BI request:', error);
    res.status(500).json({ error: 'Failed to fetch BI request' });
  }
});

// PATCH /api/bi-requests/:id/status - Update request status by specialist/admin
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, specialistNotes } = req.body;

    if (!status || !Object.values(STATUS).includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${Object.values(STATUS).join(', ')}`,
      });
    }

    const store = await readStore();
    const idx = store.findIndex((item) => item.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'BI request not found' });
    }

    store[idx] = {
      ...store[idx],
      status,
      specialistNotes: specialistNotes || store[idx].specialistNotes || '',
      updatedAt: new Date().toISOString(),
    };

    await writeStore(store);

    res.json({
      message: 'BI request updated successfully',
      request: store[idx],
    });
  } catch (error) {
    console.error('Error updating BI request status:', error);
    res.status(500).json({ error: 'Failed to update BI request status' });
  }
});

module.exports = router;
