const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const METABASE_BASE_URL = process.env.METABASE_BASE_URL || 'http://localhost:3000';
const METABASE_PUBLIC_URL = process.env.METABASE_PUBLIC_URL || METABASE_BASE_URL;
const METABASE_EMBED_ENABLED = process.env.METABASE_EMBED_ENABLED === 'true';

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

// ─── GET /api/bi/dashboards/:id — Get single dashboard with template info ───
router.get('/:id', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({
      where: { id: req.params.id },
      include: { notifications: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    // Resolve associated template
    let template = null;
    if (dashboard.businessType) {
      template = await prisma.biDashboardTemplate.findUnique({
        where: { businessType: dashboard.businessType },
      });
    }

    res.json({
      success: true,
      data: {
        ...dashboard,
        template: template || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/dashboards/generate-from-upload — Generate dashboard from completed upload ──
router.post('/generate-from-upload', async (req, res) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    const upload = await prisma.biUpload.findUnique({
      where: { id: uploadId },
      include: {
        biRequest: { select: { id: true, status: true, businessName: true, businessType: true, message: true } },
      },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (upload.status !== 'COMPLETED') {
      return res.status(400).json({
        error: `Upload status is "${upload.status}". Only COMPLETED uploads can generate dashboards.`,
      });
    }

    if (!upload.biRequest) {
      return res.status(400).json({ error: 'Upload is not linked to any BI request.' });
    }

    if (upload.biRequest.status !== 'APPROVED') {
      return res.status(400).json({
        error: `Linked BI request has status "${upload.biRequest.status}". Only APPROVED requests can generate dashboards.`,
      });
    }

    const existingDashboard = await prisma.biDashboard.findFirst({
      where: { uploadId },
      select: { id: true, status: true },
    });

    if (existingDashboard) {
      return res.status(409).json({
        error: 'A dashboard has already been generated for this upload.',
        existingDashboardId: existingDashboard.id,
        existingDashboardStatus: existingDashboard.status,
      });
    }

    const businessType = upload.businessType || upload.biRequest.businessType;

    // Look up Metabase dashboard template from registry
    const template = await prisma.biDashboardTemplate.findUnique({
      where: { businessType },
    });

    const dashboard = await prisma.biDashboard.create({
      data: {
        clientId: upload.clientId,
        uploadId: upload.id,
        businessType,
        name: template ? template.name : `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Dashboard`,
        description: template ? (template.description || '') : '',
        status: 'DRAFT',
        metabaseDashboardId: template ? template.metabaseDashboardId : null,
      },
    });

    if (template) {
      console.log(`[DASHBOARDS] Generated dashboardId=${dashboard.id} linked to Metabase dashboard ${template.metabaseDashboardId}`);
    } else {
      console.log(`[DASHBOARDS] Generated dashboardId=${dashboard.id} (no Metabase template registered for "${businessType}")`);
    }

    try {
      await prisma.biNotification.create({
        data: {
          type: 'DASHBOARD_GENERATED',
          title: 'Dashboard Draft Ready',
          message: template
            ? `Dashboard "${template.name}" has been created and linked to Metabase dashboard #${template.metabaseDashboardId}.`
            : `Dashboard created in DRAFT. No Metabase template is registered for "${businessType}". Register one in Dashboard Templates to link it.`,
        },
      });
    } catch (notifErr) {
      console.error('[DASHBOARDS] Admin notification failed:', notifErr.message);
    }

    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[DASHBOARDS] Generate from upload failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/dashboards — Create dashboard manually ─────────
router.post('/', async (req, res) => {
  try {
    const { clientId, licenseId, uploadId, businessType, name, description, metabaseDashboardId, createdBy } = req.body;

    if (!clientId || !businessType) {
      return res.status(400).json({ error: 'clientId and businessType are required' });
    }

    // Phase 3: Require completed analysis OR completed upload before dashboard creation
    if (uploadId) {
      const upload = await prisma.biUpload.findUnique({ where: { id: uploadId }, select: { status: true } });
      if (upload && upload.status !== 'COMPLETED') {
        const analysis = await prisma.biAnalysisRequest.findFirst({
          where: { uploadId, status: 'COMPLETED' },
        });
        if (!analysis) {
          return res.status(400).json({
            error: 'Dashboard creation requires a completed BI analysis or a COMPLETED upload.',
          });
        }
      }
    }

    // If no metabaseDashboardId provided, try looking up from template registry
    let resolvedMbId = metabaseDashboardId;
    if (!resolvedMbId) {
      const template = await prisma.biDashboardTemplate.findUnique({
        where: { businessType },
        select: { metabaseDashboardId: true, name: true, description: true },
      });
      if (template) {
        resolvedMbId = template.metabaseDashboardId;
        if (!name) name = template.name;
        if (!description) description = template.description;
      }
    }

    const dashboard = await prisma.biDashboard.create({
      data: {
        clientId,
        licenseId: licenseId || null,
        uploadId: uploadId || null,
        businessType,
        name: name || `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Dashboard`,
        description: description || '',
        status: 'DRAFT',
        metabaseDashboardId: resolvedMbId || null,
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
    const { name, description, status, metabaseDashboardId } = req.body;
    const existing = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Dashboard not found' });

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (metabaseDashboardId !== undefined) data.metabaseDashboardId = parseInt(metabaseDashboardId);
    if (status !== undefined) {
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
    if (status === 'PUBLISHED') data.assignedAt = new Date();

    const updated = await prisma.biDashboard.update({
      where: { id: req.params.id },
      data,
    });

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
    console.error('[DASHBOARDS] Update failed:', error);
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

// ─── GET /api/bi/dashboards/:id/metabase-link — Get Metabase link for dashboard ──
router.get('/:id/metabase-link', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    if (!dashboard.metabaseDashboardId) {
      return res.json({
        success: true,
        data: { linked: false, metabaseUrl: null, metabaseDashboardId: null },
      });
    }

    res.json({
      success: true,
      data: {
        linked: true,
        metabaseDashboardId: dashboard.metabaseDashboardId,
        metabaseUrl: `${METABASE_BASE_URL}/dashboard/${dashboard.metabaseDashboardId}`,
        metabaseBaseUrl: METABASE_BASE_URL,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/dashboards/:id/embed — Get all embed info for a dashboard ──
router.get('/:id/embed', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({ where: { id: req.params.id } });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    // Resolve template for embedding configuration
    let template = null;
    if (dashboard.businessType) {
      template = await prisma.biDashboardTemplate.findUnique({
        where: { businessType: dashboard.businessType },
      });
    }

    const metabaseDashboardId = dashboard.metabaseDashboardId;
    const hasMetabaseLink = !!metabaseDashboardId;

    // Determine embed availability
    const hasEmbedConfig = template && template.embedType !== 'none' && template.embedPublicUuid;
    const embedAvailable = hasMetabaseLink && hasEmbedConfig;
    const embedEnabled = embedAvailable && METABASE_EMBED_ENABLED;

    // Build embed URL from public UUID (Metabase CE public sharing)
    let iframeUrl = null;
    let embedType = null;
    if (embedEnabled && template.embedType === 'public' && template.embedPublicUuid) {
      iframeUrl = `${METABASE_PUBLIC_URL}/public/dashboard/${template.embedPublicUuid}`;
      embedType = 'public';
    }

    res.json({
      success: true,
      data: {
        dashboard: {
          id: dashboard.id,
          clientId: dashboard.clientId,
          name: dashboard.name,
          description: dashboard.description,
          status: dashboard.status,
          businessType: dashboard.businessType,
          createdAt: dashboard.createdAt,
          updatedAt: dashboard.updatedAt,
          publishedAt: dashboard.assignedAt,
        },
        template: template ? {
          id: template.id,
          name: template.name,
          businessType: template.businessType,
          metabaseDashboardId: template.metabaseDashboardId,
          active: template.active,
          embedType: template.embedType,
          embedPublicUuid: template.embedPublicUuid,
        } : null,
        embedding: {
          available: embedAvailable,
          enabled: embedEnabled,
          metabaseDashboardId,
          metabaseUrl: hasMetabaseLink ? `${METABASE_BASE_URL}/dashboard/${metabaseDashboardId}` : null,
          metabaseBaseUrl: METABASE_BASE_URL,
          publicUrl: hasMetabaseLink ? `${METABASE_PUBLIC_URL}/dashboard/${metabaseDashboardId}` : null,
          iframeUrl,
          embedType,
        },
      },
    });
  } catch (error) {
    console.error('[DASHBOARDS] Embed info failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
