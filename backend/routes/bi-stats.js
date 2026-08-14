const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── GET /api/bi/stats — BI operations statistics (read-only) ───
router.get('/', async (req, res) => {
  try {
    const [requestByStatus, requestByBusiness, dashboardByStatus, uploadByStatus, notifByCategory, jobs] = await Promise.all([
      prisma.biRequest.groupBy({ by: ['status'], _count: true }),
      prisma.biRequest.groupBy({ by: ['businessType'], _count: true }),
      prisma.biDashboard.groupBy({ by: ['status'], _count: true }),
      prisma.biUpload.groupBy({ by: ['status'], _count: true }),
      prisma.biNotification.groupBy({ by: ['category'], _count: true }),
      prisma.biProcessingJob.findMany({
        where: { status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
      }),
    ]);

    // Aggregate counts into simple {key: value} maps for charts.
    const toMap = (rows, key) => {
      const out = {};
      for (const r of rows) out[r[key]] = r._count;
      return out;
    };

    // Durations (seconds) from completed ETL jobs.
    let avgEtlDurationSec = 0;
    if (jobs.length) {
      const total = jobs.reduce((acc, j) => acc + (new Date(j.completedAt) - new Date(j.startedAt)), 0);
      avgEtlDurationSec = Math.round((total / jobs.length) / 1000);
    }

    // Generation duration: request createdAt → linked dashboard createdAt.
    const [genPairs, completedRequests] = await Promise.all([
      prisma.biDashboard.findMany({
        where: { requestId: { not: null } },
        select: { createdAt: true, request: { select: { createdAt: true } } },
      }),
      prisma.biRequest.findMany({
        where: { status: 'COMPLETED' },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);
    let avgGenerationSec = 0;
    if (genPairs.length) {
      const total = genPairs.reduce((acc, d) => acc + (new Date(d.createdAt) - new Date(d.request.createdAt)), 0);
      avgGenerationSec = Math.round((total / genPairs.length) / 1000);
    }
    let avgRequestDurationSec = 0;
    if (completedRequests.length) {
      const total = completedRequests.reduce((acc, r) => acc + (new Date(r.updatedAt) - new Date(r.createdAt)), 0);
      avgRequestDurationSec = Math.round((total / completedRequests.length) / 1000);
    }

    const [templates, assignments, totalVersions] = await Promise.all([
      prisma.biDashboardTemplate.count(),
      prisma.biDashboardAssignment.groupBy({ by: ['status'], _count: true }),
      prisma.biDashboard.count({ where: { version: { gt: 1 } } }),
    ]);

    const [unreadClient, unreadAdmin] = await Promise.all([
      prisma.biNotification.count({ where: { role: 'CLIENT', isRead: false } }),
      prisma.biNotification.count({ where: { role: 'ADMIN', isRead: false } }),
    ]);

    res.json({
      success: true,
      data: {
        requests: {
          total: requestByStatus.reduce((a, r) => a + r._count, 0),
          byStatus: toMap(requestByStatus, 'status'),
        },
        requestsByBusinessType: toMap(requestByBusiness, 'businessType'),
        dashboards: {
          total: dashboardByStatus.reduce((a, r) => a + r._count, 0),
          byStatus: toMap(dashboardByStatus, 'status'),
          multiVersionCount: totalVersions,
        },
        uploads: {
          total: uploadByStatus.reduce((a, r) => a + r._count, 0),
          byStatus: toMap(uploadByStatus, 'status'),
        },
        notifications: {
          total: Object.values(notifByCategory).reduce((a, b) => a + b._count, 0),
          byCategory: toMap(notifByCategory, 'category'),
          unreadClient,
          unreadAdmin,
        },
        assignments: toMap(assignments, 'status'),
        templates,
        durations: {
          avgEtlSec: avgEtlDurationSec,
          avgGenerationSec: avgGenerationSec,
          avgRequestDurationSec: avgRequestDurationSec,
        },
      },
    });
  } catch (error) {
    console.error('[BI-STATS] failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
