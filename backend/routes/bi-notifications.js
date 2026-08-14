const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { resolveClientId } = require('../utils/identity');

const prisma = new PrismaClient();

// ─── GET /api/bi/notifications — List notifications (client inbox) ──
router.get('/', async (req, res) => {
  try {
    const { clientId, dashboardId, isRead, role, category, q, page = 1, pageSize = 50 } = req.query;
    const where = {};
    // Identity-forced tenant scoping: an authenticated client is always
    // scoped to their own inbox, regardless of any clientId parameter.
    const identityClientId = await resolveClientId(req);
    const scopedClientId = identityClientId || clientId;
    if (scopedClientId) where.clientId = scopedClientId;
    if (dashboardId) where.dashboardId = dashboardId;
    if (role) where.role = role;
    if (category) where.category = category;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    if (q && q.trim()) {
      const needle = q.trim();
      where.OR = [
        { title: { contains: needle, mode: 'insensitive' } },
        { message: { contains: needle, mode: 'insensitive' } },
        { type: { contains: needle, mode: 'insensitive' } },
      ];
    }

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '50'), 10) || 50, 1), 100);
    const skip = (parsedPage - 1) * parsedPageSize;
    const [items, total] = await Promise.all([
      prisma.biNotification.findMany({ where, skip, take: parsedPageSize, orderBy: { createdAt: 'desc' } }),
      prisma.biNotification.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parsedPage, pageSize: parsedPageSize, totalPages: Math.ceil(total / parsedPageSize) },
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] List failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/notifications/admin — Admin inbox ──────────────
router.get('/admin', async (req, res) => {
  try {
    const { isRead, category, q, page = 1, pageSize = 50 } = req.query;
    const where = { role: 'ADMIN' };
    if (category) where.category = category;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    if (q && q.trim()) {
      const needle = q.trim();
      where.OR = [
        { title: { contains: needle, mode: 'insensitive' } },
        { message: { contains: needle, mode: 'insensitive' } },
        { type: { contains: needle, mode: 'insensitive' } },
      ];
    }

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '50'), 10) || 50, 1), 100);
    const skip = (parsedPage - 1) * parsedPageSize;
    const [items, total] = await Promise.all([
      prisma.biNotification.findMany({ where, skip, take: parsedPageSize, orderBy: { createdAt: 'desc' } }),
      prisma.biNotification.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parsedPage, pageSize: parsedPageSize, totalPages: Math.ceil(total / parsedPageSize) },
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Admin list failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/notifications/admin/unread-count ───────────────
router.get('/admin/unread-count', async (req, res) => {
  try {
    const count = await prisma.biNotification.count({ where: { role: 'ADMIN', isRead: false } });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('[NOTIFICATIONS] Admin unread count failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/notifications/:id/read — Mark as read ────────
router.patch('/:id/read', async (req, res) => {
  try {
    const existing = await prisma.biNotification.findUnique({
      where: { id: req.params.id },
      select: { id: true, clientId: true },
    });
    if (!existing) return res.status(404).json({ error: 'Notification not found' });

    // Tenant isolation: a client-scoped caller may only read their own
    // notifications (admin callers — no resolved client — pass through).
    const identityClientId = await resolveClientId(req);
    if (identityClientId && existing.clientId && existing.clientId !== identityClientId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

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
    const { clientId, role } = req.body;
    const where = { isRead: false };
    // Identity-forced: an authenticated client is always scoped to their own
    // inbox; the body clientId is only used for admin/legacy callers.
    const identityClientId = (await resolveClientId(req)) || clientId;
    if (identityClientId) where.clientId = identityClientId;
    if (role) where.role = role;
    if (!identityClientId && !role) return res.status(400).json({ error: 'clientId or role is required' });

    const result = await prisma.biNotification.updateMany({ where, data: { isRead: true } });
    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/notifications/unread-count — Count unread ──────
router.get('/unread-count', async (req, res) => {
  try {
    const { clientId, role } = req.query;
    const where = { isRead: false };
    // Identity-forced: an authenticated client is always scoped to their own
    // inbox; the query clientId is only used for admin/legacy callers.
    const identityClientId = (await resolveClientId(req)) || clientId;
    if (identityClientId) where.clientId = identityClientId;
    if (role) where.role = role;
    if (!identityClientId && !role) return res.status(400).json({ error: 'clientId or role is required' });

    const count = await prisma.biNotification.count({ where });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/bi/notifications/:id — Delete one notification ──
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.biNotification.findUnique({
      where: { id: req.params.id },
      select: { id: true, clientId: true },
    });
    if (!existing) return res.status(404).json({ error: 'Notification not found' });

    // Tenant isolation: a client-scoped caller may only delete their own
    // notifications (admin callers — no resolved client — pass through).
    const identityClientId = await resolveClientId(req);
    if (identityClientId && existing.clientId && existing.clientId !== identityClientId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.biNotification.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/notifications/delete-many — Delete selected notifications ─
router.post('/delete-many', async (req, res) => {
  try {
    const { role, ids } = req.body;
    const identityClientId = await resolveClientId(req);
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const where = { id: { in: ids } };
    if (identityClientId) where.clientId = identityClientId;
    if (role) where.role = role;

    const result = await prisma.biNotification.deleteMany({ where });
    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/notifications/clear — Clear (filtered) inbox ───
router.post('/clear', async (req, res) => {
  try {
    const { clientId, role, category, isRead } = req.body;
    const where = {};
    const identityClientId = clientId || (await resolveClientId(req));
    if (identityClientId) where.clientId = identityClientId;
    if (role) where.role = role;
    if (category) where.category = category;
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (!identityClientId && !role) return res.status(400).json({ error: 'clientId or role is required' });

    const result = await prisma.biNotification.deleteMany({ where });
    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
