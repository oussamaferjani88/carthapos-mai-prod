const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const warehouseService = require('../services/warehouse-service');

const prisma = new PrismaClient();

// ─── GET /api/bi/reviews — List dashboards pending review ─────
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['READY_FOR_REVIEW', 'PUBLISHED'] };
    }

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '50'), 10) || 50, 1), 100);
    const skip = (parsedPage - 1) * parsedPageSize;
    const [items, total] = await Promise.all([
      prisma.biDashboard.findMany({
        where,
        skip,
        take: parsedPageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          notifications: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.biDashboard.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parsedPage, pageSize: parsedPageSize, totalPages: Math.ceil(total / parsedPageSize) },
    });
  } catch (error) {
    console.error('[REVIEWS] List failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/reviews/:id/approve — Approve dashboard ────
router.patch('/:id/approve', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    if (dashboard.status !== 'READY_FOR_REVIEW') {
      return res.status(400).json({ error: 'Dashboard is not awaiting review' });
    }

    const updated = await prisma.biDashboard.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', assignedAt: new Date() },
    });

    // Auto-create notification for client
    await prisma.biNotification.create({
      data: {
        clientId: updated.clientId,
        dashboardId: updated.id,
        type: 'DASHBOARD_READY',
        category: 'DASHBOARD',
        title: 'Your Dashboard Has Been Published',
        message: `Your business dashboard "${updated.name}" has been reviewed and published. View it in your CarthaPOS account.`,
      },
    });

    console.log(`[REVIEWS] Approved dashboardId=${updated.id}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/reviews/:id/reject — Reject dashboard ──────
router.patch('/:id/reject', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    if (dashboard.status !== 'READY_FOR_REVIEW') {
      return res.status(400).json({ error: 'Dashboard is not awaiting review' });
    }

    const updated = await prisma.biDashboard.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT' },
    });

    console.log(`[REVIEWS] Rejected dashboardId=${updated.id}, returned to DRAFT`);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
