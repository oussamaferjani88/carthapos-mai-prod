const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── GET /api/bi/dashboard-templates — List all registered templates ──
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active !== undefined) where.active = active === 'true';
    const items = await prisma.biDashboardTemplate.findMany({
      where,
      orderBy: { businessType: 'asc' },
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/dashboard-templates/:businessType — Get by business type ──
router.get('/:businessType', async (req, res) => {
  try {
    const item = await prisma.biDashboardTemplate.findUnique({
      where: { businessType: req.params.businessType },
    });
    if (!item) return res.status(404).json({ error: 'No template found for this business type.' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/dashboard-templates — Register a template ──────────
router.post('/', async (req, res) => {
  try {
    const { businessType, metabaseDashboardId, name, description, embedType, embedPublicUuid } = req.body;
    if (!businessType || !metabaseDashboardId || !name) {
      return res.status(400).json({ error: 'businessType, metabaseDashboardId, and name are required' });
    }

    const existing = await prisma.biDashboardTemplate.findUnique({
      where: { businessType },
    });
    if (existing) {
      return res.status(409).json({ error: 'A template for this business type already exists.' });
    }

    const item = await prisma.biDashboardTemplate.create({
      data: {
        businessType,
        metabaseDashboardId: parseInt(metabaseDashboardId),
        name,
        description: description || null,
        embedType: embedType || 'none',
        embedPublicUuid: embedPublicUuid || null,
      },
    });

    console.log(`[TEMPLATES] Registered template businessType=${businessType} → metabaseDashboardId=${metabaseDashboardId}`);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/dashboard-templates/:id — Update a template ────────
router.patch('/:id', async (req, res) => {
  try {
    const { metabaseDashboardId, name, description, active, embedType, embedPublicUuid } = req.body;
    const existing = await prisma.biDashboardTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const data = {};
    if (metabaseDashboardId !== undefined) data.metabaseDashboardId = parseInt(metabaseDashboardId);
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (active !== undefined) data.active = active;
    if (embedType !== undefined) data.embedType = embedType;
    if (embedPublicUuid !== undefined) data.embedPublicUuid = embedPublicUuid;

    const item = await prisma.biDashboardTemplate.update({
      where: { id: req.params.id },
      data,
    });

    console.log(`[TEMPLATES] Updated template id=${req.params.id}`);
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/bi/dashboard-templates/:id — Delete a template ──────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.biDashboardTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    await prisma.biDashboardTemplate.delete({ where: { id: req.params.id } });

    console.log(`[TEMPLATES] Deleted template id=${req.params.id}`);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
