const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { resolveClientId } = require('../utils/identity');

const prisma = new PrismaClient();

// ─── GET /api/bi/assignments — List dashboard assignments ───────
router.get('/', async (req, res) => {
  try {
    const { clientId, status, q, page = 1, pageSize = 50 } = req.query;
    const where = {};
    // Identity-forced tenant scoping: an authenticated client is always
    // scoped to their own assignments, regardless of any clientId parameter.
    const identityClientId = await resolveClientId(req);
    const scopedClientId = identityClientId || clientId;
    if (scopedClientId) where.clientId = scopedClientId;
    if (status) where.status = status;

    if (q && q.trim()) {
      const needle = q.trim();
      where.OR = [
        { client: { name: { contains: needle, mode: 'insensitive' } } },
        { dashboard: { name: { contains: needle, mode: 'insensitive' } } },
        { dashboard: { businessType: { contains: needle, mode: 'insensitive' } } },
      ];
    }

    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '50'), 10) || 50, 1), 100);
    const skip = (parsedPage - 1) * parsedPageSize;
    const take = parsedPageSize;
    const include = {
      client: { select: { id: true, name: true, email: true, createdAt: true } },
      dashboard: {
        select: {
          id: true,
          name: true,
          version: true,
          status: true,
          businessType: true,
          description: true,
          templateUsed: true,
          createdAt: true,
        },
      },
    };

    const [items, total] = await Promise.all([
      prisma.biDashboardAssignment.findMany({ where, skip, take, orderBy: { assignedAt: 'desc' }, include }),
      prisma.biDashboardAssignment.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parsedPage, pageSize: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('[ASSIGNMENTS] List failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/assignments — Create/activate an assignment ────
// Activating a dashboard version archives any other ACTIVE assignment of
// the same client. The dashboard itself is never deleted.
router.post('/', async (req, res) => {
  try {
    const { dashboardId, clientId, version } = req.body;
    if (!dashboardId || !clientId) {
      return res.status(400).json({ error: 'dashboardId and clientId are required' });
    }

    const dashboard = await prisma.biDashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    if (dashboard.status !== 'PUBLISHED') {
      return res.status(400).json({ error: `Only PUBLISHED dashboards can be assigned (current: "${dashboard.status}").` });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const effectiveVersion = version || dashboard.version || 1;

    await prisma.$transaction([
      prisma.biDashboardAssignment.updateMany({
        where: { clientId, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      }),
      prisma.biDashboardAssignment.create({
        data: { clientId, dashboardId, version: effectiveVersion, status: 'ACTIVE', assignedAt: new Date() },
      }),
    ]);

    res.status(201).json({ success: true, message: 'Dashboard version assigned to client' });
  } catch (error) {
    console.error('[ASSIGNMENTS] Create failed:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// ─── POST /api/bi/assignments/:id/activate — Re-activate an archived version ──
router.post('/:id/activate', async (req, res) => {
  try {
    const assignment = await prisma.biDashboardAssignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    await prisma.$transaction([
      prisma.biDashboardAssignment.updateMany({
        where: { clientId: assignment.clientId, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      }),
      prisma.biDashboardAssignment.update({
        where: { id: assignment.id },
        data: { status: 'ACTIVE', assignedAt: new Date() },
      }),
    ]);

    res.json({ success: true, message: 'Assignment reactivated' });
  } catch (error) {
    console.error('[ASSIGNMENTS] Activate failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/assignments/:id/archive — Archive an assignment ──
router.post('/:id/archive', async (req, res) => {
  try {
    const updated = await prisma.biDashboardAssignment.update({
      where: { id: req.params.id },
      data: { status: 'SUPERSEDED' },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ASSIGNMENTS] Archive failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/bi/assignments/:id — Delete assignment (dashboard kept) ──
router.delete('/:id', async (req, res) => {
  try {
    await prisma.biDashboardAssignment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Assignment deleted (dashboard kept)' });
  } catch (error) {
    console.error('[ASSIGNMENTS] Delete failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
