const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const metabase = require('../utils/metabase-client');
const { resolveBusinessCollection } = require('../services/bi-provisioning');

const prisma = new PrismaClient();

// ─── GET /api/bi/metabase/collections — List Metabase collections ──
router.get('/collections', async (req, res) => {
  try {
    if (!metabase.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Metabase is not configured (METABASE_USER/METABASE_PASSWORD missing).',
      });
    }
    const collections = await metabase.listCollections();
    res.json({ success: true, data: collections });
  } catch (error) {
    console.error('[METABASE] List collections failed:', error.message);
    res.status(502).json({ success: false, error: error.message });
  }
});

// ─── GET /api/bi/metabase/collections/:id/dashboards — List dashboards ──
// `directOnly=true` restricts to dashboards directly inside the collection
// (used to pick the master inside a business-type collection).
router.get('/collections/:id/dashboards', async (req, res) => {
  try {
    if (!metabase.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Metabase is not configured (METABASE_USER/METABASE_PASSWORD missing).',
      });
    }
    const directOnly = req.query.directOnly === 'true';
    const dashboards = await metabase.listDashboards(req.params.id, 0, directOnly);
    res.json({ success: true, data: dashboards });
  } catch (error) {
    console.error('[METABASE] List dashboards failed:', error.message);
    res.status(502).json({ success: false, error: error.message });
  }
});

// ─── GET /api/bi/metabase/business-collections — Business-type collections ──
// Resolves the business-type Metabase collection for every registered template.
// Used by the admin provisioning flow (step 1: pick the business collection;
// step 2: pick the master dashboard inside it).
router.get('/business-collections', async (req, res) => {
  try {
    if (!metabase.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Metabase is not configured (METABASE_USER/METABASE_PASSWORD missing).',
      });
    }
    const templates = await prisma.biDashboardTemplate.findMany({
      where: { active: true },
      orderBy: { businessType: 'asc' },
    });

    const results = [];
    for (const t of templates) {
      let collection = null;
      let hasMaster = false;
      try {
        collection = await resolveBusinessCollection({
          businessCollectionId: null,
          masterId: t.metabaseDashboardId != null ? Number(t.metabaseDashboardId) : null,
          businessType: t.businessType,
        });
      } catch (err) {
        collection = null;
      }
      if (collection && collection.source === 'master') hasMaster = true;
      results.push({
        businessType: t.businessType,
        templateName: t.name,
        registeredMasterDashboardId: t.metabaseDashboardId,
        collectionId: collection ? collection.collectionId : null,
        collectionName: collection ? collection.collectionName : null,
        hasMaster,
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[METABASE] List business collections failed:', error.message);
    res.status(502).json({ success: false, error: error.message });
  }
});

module.exports = router;
