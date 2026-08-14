const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { resolveClientId } = require('../utils/identity');
const metabaseClient = require('../utils/metabase-client');
const { provisionClientDashboard } = require('../services/bi-provisioning');

const prisma = new PrismaClient();

const {
  REQUEST_STATUS,
  EVENT_TYPES,
} = require('../utils/bi-status');
const { recordEvent, guardTransition } = require('../utils/bi-workflow');

const METABASE_BASE_URL = process.env.METABASE_BASE_URL || 'http://localhost:3000';
const METABASE_PUBLIC_URL = process.env.METABASE_PUBLIC_URL || METABASE_BASE_URL;
const METABASE_EMBED_ENABLED = process.env.METABASE_EMBED_ENABLED === 'true';

// ─── GET /api/bi/dashboards — List dashboards ───────────────────
// `assignedOnly=true` makes BiDashboardAssignment the authoritative source of
// ownership: only dashboards with an ACTIVE assignment for the client are
// returned (plan Phase 2 §1). Without it, returns the full version history
// (DRAFT/READY_FOR_REVIEW/PUBLISHED/SUPERSEDED) for admin/legacy use.
router.get('/', async (req, res) => {
  try {
    const { clientId, licenseId, status, assignedOnly, businessType, page = 1, pageSize = 50 } = req.query;
    const parsedPage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const parsedPageSize = Math.min(Math.max(parseInt(String(pageSize || '50'), 10) || 50, 1), 100);
    const take = parsedPageSize;
    const skip = (parsedPage - 1) * take;

    // Identity-forced tenant scoping: an authenticated client is always
    // scoped to their own dashboards, regardless of any clientId parameter.
    const identityClientId = await resolveClientId(req);
    const scopedClientId = identityClientId || clientId;

    if (assignedOnly === 'true' && scopedClientId) {
      const [active, legacyPublished, total] = await Promise.all([
        prisma.biDashboardAssignment.findMany({
          where: { clientId: scopedClientId, status: 'ACTIVE' },
          include: {
            dashboard: {
              include: { notifications: { take: 1, orderBy: { createdAt: 'desc' } } },
            },
          },
        }),
        // Legacy dashboards published before the assignment model existed:
        // keep them client-visible, but never mix in DRAFT/READY_FOR_REVIEW ones.
        prisma.biDashboard.findMany({
          where: { clientId: scopedClientId, status: 'PUBLISHED', assignments: { none: {} } },
          include: { notifications: { take: 1, orderBy: { createdAt: 'desc' } } },
        }),
        prisma.biDashboardAssignment.count({ where: { clientId: scopedClientId, status: 'ACTIVE' } }),
      ]);

      const items = [
        ...active.map((a) => ({
          ...a.dashboard,
          assignment: { status: a.status, version: a.version, assignedAt: a.assignedAt },
        })),
        ...legacyPublished.map((d) => ({
          ...d,
          assignment: { status: 'PUBLISHED', version: d.version, assignedAt: d.assignedAt },
        })),
      ]
        .sort((a, b) => {
          const ta = a.assignment.assignedAt || a.createdAt;
          const tb = b.assignment.assignedAt || b.createdAt;
          return new Date(tb) - new Date(ta);
        })
        .slice(skip, skip + take);

      return res.json({
        success: true,
        data: { items, total: total + legacyPublished.length, page: parsedPage, pageSize: take, totalPages: Math.ceil((total + legacyPublished.length) / take) },
      });
    }

    const where = {};
    if (scopedClientId) where.clientId = scopedClientId;
    if (licenseId) where.licenseId = licenseId;
    if (status) where.status = status;
    if (businessType) where.businessType = businessType;

    const [items, total] = await Promise.all([
      prisma.biDashboard.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { notifications: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      prisma.biDashboard.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parsedPage, pageSize: take, totalPages: Math.ceil(total / take) },
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
      include: {
        notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
        request: {
          select: { id: true, businessName: true, businessType: true, status: true },
        },
        upload: {
          select: { id: true, fileName: true, status: true, totalRows: true, totalFiles: true, createdAt: true },
        },
      },
    });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    // Ownership guard: a client may only view their own dashboards.
    const identityClientId = await resolveClientId(req);
    if (identityClientId && dashboard.clientId !== identityClientId) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Resolve associated template
    let template = null;
    if (dashboard.businessType) {
      template = await prisma.biDashboardTemplate.findUnique({
        where: { businessType: dashboard.businessType },
      });
    }

    // Resolve current assignment (authoritative ownership, Phase 2 §1)
    let assignment = null;
    const active = await prisma.biDashboardAssignment.findFirst({
      where: { dashboardId: dashboard.id, status: 'ACTIVE' },
      select: { status: true, version: true, assignedAt: true },
    });
    if (active) {
      assignment = active;
    } else {
      const latest = await prisma.biDashboardAssignment.findFirst({
        where: { dashboardId: dashboard.id },
        orderBy: { assignedAt: 'desc' },
        select: { status: true, version: true, assignedAt: true },
      });
      assignment = latest;
    }

    res.json({
      success: true,
      data: {
        ...dashboard,
        assignment,
        template: template || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/dashboards/generate-from-upload — Generate dashboard from completed upload ──
// Wrapper: syncs request status + versioning metadata around the unchanged
// dashboard-creation call. uploadId is immutable once set (refinement #11).

router.post('/generate-from-upload', async (req, res) => {
  try {
    const { uploadId, metabaseDashboardId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    const upload = await prisma.biUpload.findUnique({
      where: { id: uploadId },
      include: {
        biRequest: { select: { id: true, status: true, businessName: true, businessType: true, dashboardTemplate: true, message: true } },
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

    // A linked BI request (if any) must have finished ETL (DATA_REVIEW) before a
    // dashboard can be generated; wizard uploads without a linked request are
    // allowed to generate dashboards directly.
    if (upload.biRequest && upload.biRequest.status !== REQUEST_STATUS.DATA_REVIEW) {
      return res.status(400).json({
        error: `Linked BI request has status "${upload.biRequest.status}". Only DATA_REVIEW requests (post-ETL) can generate dashboards.`,
      });
    }

    // Atomic guard: DATA_REVIEW → GENERATING_DASHBOARD (duplicate-execution
    // protection, refinement #14). Only for request-linked uploads.
    let requestTransitioned = false;
    if (upload.biRequest) {
      requestTransitioned = await guardTransition({
        model: 'biRequest',
        id: upload.biRequest.id,
        allowedStatuses: [REQUEST_STATUS.DATA_REVIEW],
        nextStatus: REQUEST_STATUS.GENERATING_DASHBOARD,
      });
      if (!requestTransitioned) {
        return res.status(409).json({
          error: 'STATE_CONFLICT',
          message: `Dashboard generation is already running for request "${upload.biRequest.id}" (current status: "${upload.biRequest.status}").`,
        });
      }
    }

    const businessType = upload.businessType || upload.biRequest?.businessType;

    // Look up Metabase dashboard template from registry
    const template = await prisma.biDashboardTemplate.findUnique({
      where: { businessType },
    });

    // Versioning (refinement #4): always a new row, version = max(prior) + 1.
    const aggregate = await prisma.biDashboard.aggregate({
      where: { clientId: upload.clientId, businessType },
      _max: { version: true },
    });
    const nextVersion = (aggregate._max.version || 0) + 1;

    // Admin-selected Metabase dashboard takes priority; otherwise fall back to
    // the template's registered dashboard (if any).
    const resolvedMetabaseId = metabaseDashboardId != null
      ? Number(metabaseDashboardId)
      : template?.metabaseDashboardId != null
        ? Number(template.metabaseDashboardId)
        : null;

    const dashboard = await prisma.biDashboard.create({
      data: {
        clientId: upload.clientId,
        uploadId: upload.id,
        requestId: upload.requestId || null,
        businessType,
        version: nextVersion,
        templateUsed: template ? template.businessType : upload.biRequest?.dashboardTemplate || businessType,
        metabaseDashboardId: resolvedMetabaseId,
        generator: 'wizard',
        generatedAt: new Date(),
        name: template ? template.name : `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Dashboard`,
        description: template ? (template.description || '') : '',
        status: 'DRAFT',
      },
    });

    if (resolvedMetabaseId) {
      console.log(`[DASHBOARDS] Generated dashboardId=${dashboard.id} (v${nextVersion}) linked to Metabase dashboard ${resolvedMetabaseId}`);
    } else {
      console.log(`[DASHBOARDS] Generated dashboardId=${dashboard.id} (v${nextVersion}) (no Metabase dashboard selected)`);
    }

    // Request → READY_FOR_REVIEW + timeline event + notifications
    if (upload.biRequest) {
      await guardTransition({
        model: 'biRequest',
        id: upload.biRequest.id,
        allowedStatuses: [REQUEST_STATUS.GENERATING_DASHBOARD],
        nextStatus: REQUEST_STATUS.READY_FOR_REVIEW,
      });
      await recordEvent({
        requestId: upload.biRequest.id,
        type: EVENT_TYPES.DASHBOARD_GENERATED,
        metadata: { uploadId: upload.id, dashboardId: dashboard.id, version: nextVersion },
        performedByRole: 'system',
      });
    }

    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[DASHBOARDS] Generate from upload failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/dashboards/:id/publish — ONE-ACTION PUBLISH ────
// Validates DRAFT/READY_FOR_REVIEW, sets PUBLISHED, archives prior ACTIVE
// assignments, completes the linked request (plan refinement #5, #14).

router.post('/:id/publish', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({
      where: { id: req.params.id },
      include: { request: { select: { id: true, clientId: true, status: true } } },
    });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    if (!['DRAFT', 'READY_FOR_REVIEW'].includes(dashboard.status)) {
      return res.status(400).json({
        error: `Cannot publish dashboard with status "${dashboard.status}". Only DRAFT / READY_FOR_REVIEW can be published.`,
      });
    }

    // Atomic guard: only the winning publisher proceeds.
    const published = await prisma.biDashboard.updateMany({
      where: { id: dashboard.id, status: { in: ['DRAFT', 'READY_FOR_REVIEW'] } },
      data: { status: 'PUBLISHED', assignedAt: new Date() },
    });
    if (published.count !== 1) {
      return res.status(409).json({
        error: 'STATE_CONFLICT',
        message: `Dashboard is no longer in a publishable state (current: "${dashboard.status}").`,
      });
    }

    // Archive prior ACTIVE assignments for this client, then assign the new
    // version — atomically so a failure never leaves a client with multiple
    // ACTIVE assignments.
    await prisma.$transaction([
      prisma.biDashboardAssignment.updateMany({
        where: { clientId: dashboard.clientId, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      }),
      prisma.biDashboardAssignment.create({
        data: {
          clientId: dashboard.clientId,
          dashboardId: dashboard.id,
          version: dashboard.version || 1,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
      }),
    ]);

    // Complete the linked request (if any): READY_FOR_REVIEW/PUBLISHED → COMPLETED.
    if (dashboard.request) {
      await prisma.biRequest.updateMany({
        where: { id: dashboard.request.id, status: { in: [REQUEST_STATUS.READY_FOR_REVIEW, REQUEST_STATUS.PUBLISHED] } },
        data: { status: REQUEST_STATUS.COMPLETED },
      });
      await recordEvent({
        requestId: dashboard.request.id,
        type: EVENT_TYPES.DASHBOARD_PUBLISHED,
        metadata: { dashboardId: dashboard.id, version: dashboard.version || 1 },
        performedByRole: 'ADMIN',
      });
      await recordEvent({
        requestId: dashboard.request.id,
        type: EVENT_TYPES.REQUEST_COMPLETED,
        metadata: { dashboardId: dashboard.id },
        performedByRole: 'ADMIN',
      });
    } else {
      // Standalone dashboard (no linked request): notify the client directly.
      await prisma.biNotification.create({
        data: {
          clientId: dashboard.clientId,
          dashboardId: dashboard.id,
          type: 'DASHBOARD_READY',
          category: 'DASHBOARD',
          title: 'Votre tableau de bord est disponible',
          message: `Votre tableau de bord "${dashboard.name}" a été publié.`,
          role: 'CLIENT',
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...dashboard,
        status: 'PUBLISHED',
        assignedAt: new Date(),
        assignment: { status: 'ACTIVE', version: dashboard.version || 1 },
      },
      message: 'Dashboard published successfully',
    });
  } catch (error) {
    console.error('[DASHBOARDS] Publish failed:', error);
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

    // If no name provided, try looking up default from template registry
    if (!name || !description) {
      const template = await prisma.biDashboardTemplate.findUnique({
        where: { businessType },
        select: { name: true, description: true },
      });
      if (template) {
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
    if (metabaseDashboardId !== undefined) data.metabaseDashboardId = metabaseDashboardId == null ? null : Number(metabaseDashboardId);
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
            category: 'DASHBOARD',
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

    // Admin-assigned dashboard takes priority; fall back to template's
    // registered dashboard. This is what the collection-based assignment flow
    // stamps during generation.
    const metabaseDashboardId =
      dashboard.metabaseDashboardId ?? template?.metabaseDashboardId ?? null;
    const hasMetabaseLink = !!metabaseDashboardId;

    // Determine embed availability. A dashboard is embeddable when it has a
    // Metabase link AND (the template declares a public embed OR we can resolve
    // a public link from Metabase at runtime — covers collection-assigned dashboards).
    const hasEmbedConfig = template && template.embedType !== 'none' && template.embedPublicUuid;
    const embedAvailable = hasMetabaseLink && (hasEmbedConfig || metabaseClient.isConfigured());
    const embedEnabled = embedAvailable && METABASE_EMBED_ENABLED;

    // Build embed URL. Prefer the template's configured public UUID; otherwise
    // fetch/create the dashboard's public link from Metabase so a
    // collection-selected dashboard is embeddable without extra setup.
    let iframeUrl = null;
    let embedType = null;
    if (embedEnabled) {
      let publicUuid = template?.embedType === 'public' ? template.embedPublicUuid : null;
      if (!publicUuid) {
        try {
          publicUuid = await metabaseClient.getPublicLink(metabaseDashboardId);
        } catch (err) {
          console.error(`[DASHBOARDS] Failed to resolve public link for Metabase dashboard ${metabaseDashboardId}:`, err.message);
        }
      }
      if (publicUuid) {
        iframeUrl = `${METABASE_PUBLIC_URL}/public/dashboard/${publicUuid}`;
        embedType = 'public';
      }
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

// ─── POST /api/bi/dashboards/:id/provision — Provision client dashboard ──
// Deep-copies the master dashboard into a per-client collection INSIDE the
// business-type collection, bakes the tenant filter into each copied card, and
// persists the resulting Metabase dashboard id on the BiDashboard.
// Body: { collectionId (business-type collection), metabaseDashboardId (master),
//         tenantId, businessName }. Master/collection fall back to the registered
// template + discovery. Idempotent: re-running reuses the existing instance.
router.post('/:id/provision', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true } },
        request: { select: { id: true, businessName: true, businessType: true, status: true } },
      },
    });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    if (!dashboard.businessType) {
      return res.status(400).json({ error: 'Dashboard has no businessType — cannot resolve a template.' });
    }

    const template = await prisma.biDashboardTemplate.findUnique({
      where: { businessType: dashboard.businessType },
    });
    if (!template || template.metabaseDashboardId == null) {
      return res.status(409).json({
        error: `No registered Metabase master template for businessType "${dashboard.businessType}".`,
      });
    }

    const result = await provisionClientDashboard({
      prisma,
      dashboard,
      template,
      masterDashboardId: req.body?.metabaseDashboardId != null ? Number(req.body.metabaseDashboardId) : null,
      businessCollectionId: req.body?.collectionId != null ? Number(req.body.collectionId) : null,
      tenantId: req.body?.tenantId || null,
      businessName: req.body?.businessName || null,
    });

    // Persist the generated client Metabase dashboard id.
    const updated = await prisma.biDashboard.update({
      where: { id: dashboard.id },
      data: {
        metabaseDashboardId: result.metabaseDashboardId,
        templateUsed: dashboard.businessType,
        generatedAt: dashboard.generatedAt || new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        dashboard: updated,
        provisioning: result,
      },
      message: result.reused
        ? `Provisioning reused existing client dashboard (Metabase #${result.metabaseDashboardId}).`
        : `Client dashboard created (Metabase #${result.metabaseDashboardId}) with ${result.cardCount} tenant-filtered cards.`,
    });
  } catch (error) {
    console.error('[DASHBOARDS] Provision failed:', error.message);
    const status = /template|master|not found|not configured|collection/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
