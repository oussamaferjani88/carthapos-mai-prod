const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const warehouseService = require('../services/warehouse-service');
const { getTemplate } = require('../services/bi-dashboard-templates');

const prisma = new PrismaClient();

// ─── GET /api/bi/dashboards — List dashboards ───────────────────
router.get('/', async (req, res) => {
  try {
    const { clientId, licenseId, status, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (licenseId) where.licenseId = licenseId;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [items, total] = await Promise.all([
      prisma.biDashboard.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { notifications: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      prisma.biDashboard.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
    });
  } catch (error) {
    console.error('[DASHBOARDS] List failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/dashboards/templates — List available templates ──
router.get('/templates', async (req, res) => {
  const { getTemplate } = require('../services/bi-dashboard-templates');
  const templates = require('../services/bi-dashboard-templates');
  res.json({ success: true, data: templates.getAllTemplates() });
});

// ─── GET /api/bi/dashboards/:id — Get single dashboard ──────────
router.get('/:id', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({
      where: { id: req.params.id },
      include: { notifications: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/dashboards — Create dashboard ─────────────────
router.post('/', async (req, res) => {
  try {
    const { clientId, licenseId, uploadId, businessType, name, description, dashboardConfig, createdBy } = req.body;

    if (!clientId || !businessType) {
      return res.status(400).json({ error: 'clientId and businessType are required' });
    }

    // Phase 3: Require completed analysis before dashboard creation
    if (uploadId) {
      const analysis = await prisma.biAnalysisRequest.findFirst({
        where: { uploadId, status: 'COMPLETED' },
      });
      if (!analysis) {
        return res.status(400).json({
          error: 'Dashboard creation requires a completed BI analysis. Complete the analysis request first.',
        });
      }
    }

    const template = getTemplate(businessType);
    const config = dashboardConfig || template;

    const dashboard = await prisma.biDashboard.create({
      data: {
        clientId,
        licenseId: licenseId || null,
        uploadId: uploadId || null,
        businessType,
        name: name || template.name,
        description: description || template.description,
        status: 'DRAFT',
        dashboardType: 'custom',
        dashboardConfig: config,
        createdBy: createdBy || null,
      },
    });

    console.log(`[DASHBOARDS] Created dashboardId=${dashboard.id} for clientId=${clientId}`);
    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[DASHBOARDS] Create failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/dashboards/:id — Update dashboard ────────────
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, status, dashboardConfig } = req.body;
    const existing = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Dashboard not found' });

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) {
      // Phase 3: Extend status workflow
      const validTransitions = {
        'DRAFT': ['IN_PROGRESS'],
        'IN_PROGRESS': ['READY_FOR_REVIEW'],
        'READY_FOR_REVIEW': ['PUBLISHED', 'DRAFT'],
        'PUBLISHED': ['ARCHIVED'],
        'ARCHIVED': ['DRAFT'],
      };
      const allowed = validTransitions[existing.status];
      if (allowed && !allowed.includes(status)) {
        return res.status(400).json({
          error: `Invalid status transition: ${existing.status} → ${status}. Allowed: ${(allowed || []).join(', ') || 'none'}`,
        });
      }
      data.status = status;
    }
    if (dashboardConfig !== undefined) data.dashboardConfig = dashboardConfig;
    if (status === 'PUBLISHED') data.assignedAt = new Date();

    const updated = await prisma.biDashboard.update({
      where: { id: req.params.id },
      data,
    });

    // Auto-create notification when marked PUBLISHED
    if (status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      try {
        const client = await prisma.client.findUnique({ where: { id: updated.clientId } });
        await prisma.biNotification.create({
          data: {
            clientId: updated.clientId,
            dashboardId: updated.id,
            type: 'DASHBOARD_READY',
            title: 'Your BI Dashboard Is Ready',
            message: `Your business dashboard "${updated.name}" has been reviewed and published. View it in your CarthaPOS account.`,
          },
        });
        console.log(`[DASHBOARDS] Notification created for dashboardId=${updated.id}`);
      } catch (notifErr) {
        console.error('[DASHBOARDS] Notification creation failed:', notifErr.message);
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/bi/dashboards/:id — Delete dashboard ───────────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Dashboard not found' });

    await prisma.biNotification.deleteMany({ where: { dashboardId: req.params.id } });
    await prisma.biDashboard.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Dashboard deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/dashboard/:dashboardId/data — Dashboard data ────
router.get('/:dashboardId/data', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({ where: { id: req.params.dashboardId } });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    if (dashboard.status !== 'READY_FOR_REVIEW' && dashboard.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Dashboard is not available for viewing yet' });
    }

    const timezone = req.query.timezone || 'UTC';
    const data = await warehouseService.getDashboardSummary(dashboard.clientId, dashboard.businessType, timezone);

    // Add average ticket if not already present
    if (!data.averageTicket) {
      data.averageTicket = await warehouseService.getAverageTicket(dashboard.clientId);
    }

    res.json({ success: true, data: { dashboard, metrics: data } });
  } catch (error) {
    console.error('[DASHBOARD DATA] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
