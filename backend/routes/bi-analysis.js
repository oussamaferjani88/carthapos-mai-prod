const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const warehouseService = require('../services/warehouse-service');
const { generateInsights } = require('../services/bi-insight-generator');

const prisma = new PrismaClient();

// ─── GET /api/bi/analysis — List analysis requests ────────────
router.get('/', async (req, res) => {
  try {
    const { clientId, status, businessType, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (businessType) where.businessType = businessType;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [items, total] = await Promise.all([
      prisma.biAnalysisRequest.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          upload: { select: { id: true, fileName: true, totalRows: true, createdAt: true } },
        },
      }),
      prisma.biAnalysisRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
    });
  } catch (error) {
    console.error('[ANALYSIS] List failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/analysis/:id — Single analysis request ───────
router.get('/:id', async (req, res) => {
  try {
    const analysis = await prisma.biAnalysisRequest.findUnique({
      where: { id: req.params.id },
      include: {
        upload: { select: { id: true, fileName: true, totalRows: true, createdAt: true, status: true } },
      },
    });
    if (!analysis) return res.status(404).json({ error: 'Analysis request not found' });
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/bi/analysis/:id/metrics — Warehouse metrics ─────
router.get('/:id/metrics', async (req, res) => {
  try {
    const analysis = await prisma.biAnalysisRequest.findUnique({ where: { id: req.params.id } });
    if (!analysis) return res.status(404).json({ error: 'Analysis request not found' });

    const timezone = req.query.timezone || 'UTC';
    const metrics = await warehouseService.getDashboardSummary(analysis.clientId, analysis.businessType, timezone);

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('[ANALYSIS METRICS] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/bi/analysis/:id — Update status/notes ─────────
router.patch('/:id', async (req, res) => {
  try {
    const { status, assignedTo, notes, analysisSummary, insights } = req.body;
    const existing = await prisma.biAnalysisRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Analysis request not found' });

    const data = {};
    if (status !== undefined) data.status = status;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (notes !== undefined) data.notes = notes;
    if (analysisSummary !== undefined) data.analysisSummary = analysisSummary;
    if (insights !== undefined) data.insights = insights;

    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    }
    if (status === 'PENDING' && existing.status === 'COMPLETED') {
      // Reopen: clear completedAt so analyst can work again
      data.completedAt = null;
    }

    const updated = await prisma.biAnalysisRequest.update({
      where: { id: req.params.id },
      data,
    });

    console.log(`[ANALYSIS] Updated id=${updated.id} status=${updated.status}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/bi/analysis/:id/generate-insights ──────────────
router.post('/:id/generate-insights', async (req, res) => {
  try {
    const analysis = await prisma.biAnalysisRequest.findUnique({ where: { id: req.params.id } });
    if (!analysis) return res.status(404).json({ error: 'Analysis request not found' });

    const timezone = req.query.timezone || 'UTC';
    const insights = await generateInsights(analysis.clientId, analysis.businessType, timezone);

    await prisma.biAnalysisRequest.update({
      where: { id: req.params.id },
      data: { insights },
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('[GENERATE INSIGHTS] Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
