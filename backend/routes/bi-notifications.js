const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── GET /api/bi/notifications — List notifications ─────────────
router.get('/', async (req, res) => {
  try {
    const { clientId, dashboardId, isRead, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (dashboardId) where.dashboardId = dashboardId;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [items, total] = await Promise.all([
      prisma.biNotification.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.biNotification.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] List failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/notifications/:id/read — Mark as read ────────
router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await prisma.biNotification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/notifications/read-all — Mark all as read ─────
router.post('/read-all', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const result = await prisma.biNotification.updateMany({
      where: { clientId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/notifications/unread-count — Count unread ──────
router.get('/unread-count', async (req, res) => {
  try {
    const { clientId } = req.query;
    const where = { isRead: false };
    if (clientId) where.clientId = clientId;

    const count = await prisma.biNotification.count({ where });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
