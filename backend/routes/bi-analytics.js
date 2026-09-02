/**
 * BI Analytics API
 *
 * Read-only analytics endpoints for the BI Analytics Workspace.
 * Combines the Analytics Warehouse (OFFICIAL source of truth) with the
 * Analytics Enrichment Cache (warehouse-absent granular datasets) built by
 * analytics-cache-service.
 *
 * Warehouse date math uses dimTimeId (= the SALE DATE), never createdAt
 * (= load/insert time), fixing the historical warehouse-service defect.
 *
 * Mounted at /api/bi/analytics — fully ADDITIVE, no existing route modified.
 */
const express = require('express');
const router = express.Router();
const warehousePrisma = require('../prisma-warehouse/client');
const cacheService = require('../services/analytics-cache-service');

const prisma = warehousePrisma;

// ─── Date helpers (dimTimeId int YYYYMMDD <-> dateKey 'YYYY-MM-DD') ──
const pad = (n) => String(n).padStart(2, '0');
const toDateKey = (dimInt) => {
  if (!dimInt) return null;
  const s = String(dimInt);
  if (s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
const toDimInt = (dateKey) => {
  if (!dateKey) return null;
  return parseInt(String(dateKey).replace(/-/g, ''), 10);
};
const addDays = (dateKey, n) => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const daySpan = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b - a) / 86400000) + 1;
};

const round = (v, p = 2) => {
  if (v === null || v === undefined) return null;
  return Math.round(v * 10 ** p) / 10 ** p;
};

// in-range for cache records (dateKey string comparison works for YYYY-MM-DD)
const inRange = (key, from, to) => key >= from && key <= to;

// ─── Query parsing ───────────────────────────────────────────────
function parseQuery(req) {
  const clientId = req.query.clientId;
  return {
    clientId,
    from: req.query.from || null, // 'YYYY-MM-DD'
    to: req.query.to || null,     // 'YYYY-MM-DD'
    limit: parseInt(req.query.limit) || null,
    sort: req.query.sort || null,
    groupBy: req.query.groupBy || null,
  };
}

// Resolve the effective date range + previous-period range.
async function resolveRange(clientId, from, to, snapshot) {
  // overall span from warehouse dim_time + cache sales
  const [whMin, whMax] = await Promise.all([
    prisma.factSale.aggregate({ where: { tenantId: clientId }, _min: { dimTimeId: true } }),
    prisma.factSale.aggregate({ where: { tenantId: clientId }, _max: { dimTimeId: true } }),
  ]);
  const cacheKeys = snapshot ? (snapshot.datasets.sales || []).map((s) => s.dateKey).filter(Boolean) : [];
  let minKey = toDateKey(whMin._min.dimTimeId);
  let maxKey = toDateKey(whMax._max.dimTimeId);
  if (cacheKeys.length) {
    const cMin = cacheKeys.reduce((a, b) => (a < b ? a : b));
    const cMax = cacheKeys.reduce((a, b) => (a > b ? a : b));
    if (!minKey || cMin < minKey) minKey = cMin;
    if (!maxKey || cMax > maxKey) maxKey = cMax;
  }
  if (!minKey || !maxKey) {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    minKey = today; maxKey = today;
  }

  const fromKey = from || minKey;
  const toKey = to || maxKey;
  const fromInt = toDimInt(fromKey);
  const toInt = toDimInt(toKey);

  const span = daySpan(fromKey, toKey);
  const prevToKey = addDays(fromKey, -1);
  const prevFromKey = addDays(prevToKey, -(span - 1));

  return { fromKey, toKey, fromInt, toInt, prevFromKey, prevToKey, span };
}

// Fetch the cache snapshot (graceful when absent)
async function getSnapshot(clientId) {
  if (!clientId) return { snapshot: null, reason: 'NO_CLIENT' };
  try {
    const r = await cacheService.getSnapshot(clientId);
    return r;
  } catch (e) {
    console.error('[ANALYTICS] cache unavailable:', e.message);
    return { snapshot: null, reason: 'UNAVAILABLE' };
  }
}

// ─── Shared aggregations (cache) ─────────────────────────────────
function aggregateSalesByDate(sales, fromKey, toKey, groupFn) {
  const map = new Map();
  for (const s of sales) {
    if (!s.dateKey || !inRange(s.dateKey, fromKey, toKey)) continue;
    const k = groupFn(s);
    if (!map.has(k)) map.set(k, { key: k, revenue: 0, orders: 0, tax: 0, discount: 0 });
    const g = map.get(k);
    g.revenue += s.total || 0;
    g.orders += 1;
    g.tax += s.tax || 0;
    g.discount += s.discount || 0;
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

function aggregateSaleItems(items, fromKey, toKey) {
  const map = new Map();
  for (const it of items) {
    if (!it.dateKey || !inRange(it.dateKey, fromKey, toKey)) continue;
    const k = `${it.productId}::${it.productName}::${it.category}`;
    if (!map.has(k)) map.set(k, {
      productId: it.productId, name: it.productName, category: it.category,
      family: it.family || null, revenue: 0, units: 0, orders: 0, ordersSet: new Set(),
    });
    const g = map.get(k);
    g.revenue += it.lineTotal || 0;
    g.units += it.quantity || 0;
    if (it.saleId) g.ordersSet.add(it.saleId);
  }
  return [...map.values()].map((g) => ({ ...g, orders: g.ordersSet.size, ordersSet: undefined }));
}

// ─── GET /overview — KPI cards ───────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const agg = (f, t) => prisma.factSale.aggregate({
      where: { tenantId: clientId, dimTimeId: { gte: toDimInt(f), lte: toDimInt(t) } },
      _sum: { total: true, tax: true, discount: true },
      _count: { _all: true },
    });
    const [cur, prev] = await Promise.all([agg(r.fromKey, r.toKey), agg(r.prevFromKey, r.prevToKey)]);

    const paymentMix = await prisma.factSale.groupBy({
      by: ['paymentMethod'],
      where: { tenantId: clientId, dimTimeId: { gte: r.fromInt, lte: r.toInt } },
      _sum: { total: true },
      _count: { _all: true },
    });

    // cache-derived extras
    let itemsSold = 0, uniqueCustomers = 0, tableOrders = 0, takeawayOrders = 0;
    const sales = (snapshot?.datasets.sales || []).filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey));
    if (sales.length) {
      itemsSold = (snapshot?.datasets.saleItems || [])
        .filter((it) => it.dateKey && inRange(it.dateKey, r.fromKey, r.toKey))
        .reduce((a, it) => a + (it.quantity || 0), 0);
      uniqueCustomers = new Set(sales.map((s) => s.customerId).filter(Boolean)).size;
      tableOrders = sales.filter((s) => s.tableId).length;
      takeawayOrders = sales.length - tableOrders;
    }

    const metric = (curVal, prevVal) => {
      const pct = prevVal ? Math.round(((curVal - prevVal) / prevVal) * 1000) / 10 : null;
      return { value: round(curVal), previous: round(prevVal), changePct: pct };
    };

    const paymentTotal = paymentMix.reduce((a, p) => a + (p._sum.total || 0), 0);

    res.json({
      success: true,
      data: {
        range: { from: r.fromKey, to: r.toKey, prevFrom: r.prevFromKey, prevTo: r.prevToKey, span: r.span },
        currency: snapshot?.metadata?.currency || null,
        kpis: {
          revenue: metric(cur._sum.total || 0, prev._sum.total || 0),
          orders: metric(cur._count._all, prev._count._all),
          averageTicket: metric(
            cur._count._all ? (cur._sum.total || 0) / cur._count._all : 0,
            prev._count._all ? (prev._sum.total || 0) / prev._count._all : 0
          ),
          tax: metric(cur._sum.tax || 0, prev._sum.tax || 0),
          discount: metric(cur._sum.discount || 0, prev._sum.discount || 0),
          itemsSold: { value: itemsSold, previous: null, changePct: null },
          uniqueCustomers: { value: uniqueCustomers, previous: null, changePct: null },
          tableOrders: { value: tableOrders, previous: null, changePct: null },
          takeawayOrders: { value: takeawayOrders, previous: null, changePct: null },
        },
        paymentMix: paymentMix.map((p) => ({
          method: p.paymentMethod || 'unknown',
          revenue: round(p._sum.total || 0),
          orders: p._count._all,
          sharePct: paymentTotal ? round(((p._sum.total || 0) / paymentTotal) * 100) : 0,
        })).sort((a, b) => b.revenue - a.revenue),
        cacheReason: snapshot ? null : 'no cache',
      },
    });
  } catch (e) {
    console.error('[ANALYTICS] overview failed:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /trend — time series (day/week/month) ───────────────────
router.get('/trend', async (req, res) => {
  try {
    const { clientId, from, to, groupBy } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const groups = await prisma.factSale.groupBy({
      by: ['dimTimeId'],
      where: { tenantId: clientId, dimTimeId: { gte: r.fromInt, lte: r.toInt } },
      _sum: { total: true, tax: true, discount: true },
      _count: { _all: true },
    });

    const bucketOf = (key) => {
      if (groupBy === 'month') return key.slice(0, 7);
      if (groupBy === 'week') {
        const d = new Date(`${key}T00:00:00`);
        const dow = (d.getDay() + 6) % 7; // Monday=0
        const monday = new Date(d);
        monday.setDate(d.getDate() - dow);
        return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      }
      return key;
    };

    const map = new Map();
    let cumulative = 0;
    for (const g of groups) {
      const key = toDateKey(g.dimTimeId);
      if (!key) continue;
      const bk = bucketOf(key);
      if (!map.has(bk)) map.set(bk, { key: bk, revenue: 0, orders: 0, tax: 0 });
      const e = map.get(bk);
      e.revenue += g._sum.total || 0;
      e.orders += g._count._all;
      e.tax += g._sum.tax || 0;
    }

    let sorted = [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
    sorted = sorted.map((e) => { cumulative += e.revenue; return { ...e, cumulative: round(cumulative), averageTicket: e.orders ? round(e.revenue / e.orders) : 0 }; });

    res.json({ success: true, data: { groupBy: groupBy || 'day', points: sorted } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /payment-mix ────────────────────────────────────────────
router.get('/payment-mix', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const groups = await prisma.factSale.groupBy({
      by: ['paymentMethod'],
      where: { tenantId: clientId, dimTimeId: { gte: r.fromInt, lte: r.toInt } },
      _sum: { total: true, tax: true },
      _count: { _all: true },
    });
    const total = groups.reduce((a, g) => a + (g._sum.total || 0), 0);

    // hourly payment mix from cache (rich payment detail absent in warehouse)
    const hours = new Array(24).fill(0).map(() => ({ hour: null, revenue: 0, orders: 0 }));
    const byMethodHour = {};
    for (const s of (snapshot?.datasets.sales || [])) {
      if (!s.dateKey || !inRange(s.dateKey, r.fromKey, r.toKey) || s.hour === null || s.hour === undefined) continue;
      hours[s.hour].hour = s.hour;
      hours[s.hour].revenue += s.total || 0;
      hours[s.hour].orders += 1;
      const m = s.paymentMethod || 'unknown';
      if (!byMethodHour[m]) byMethodHour[m] = new Array(24).fill(0).map((_, i) => ({ hour: i, revenue: 0, orders: 0 }));
      byMethodHour[m][s.hour].revenue += s.total || 0;
      byMethodHour[m][s.hour].orders += 1;
    }

    res.json({
      success: true,
      data: {
        totalRevenue: round(total),
        methods: groups.map((g) => ({
          method: g.paymentMethod || 'unknown',
          revenue: round(g._sum.total || 0),
          orders: g._count._all,
          sharePct: total ? round(((g._sum.total || 0) / total) * 100) : 0,
        })).sort((a, b) => b.revenue - a.revenue),
        byHour: hours,
        byHourPerMethod: byMethodHour,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /peak-hours ─────────────────────────────────────────────
router.get('/peak-hours', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const hours = new Array(24).fill(0).map((_, i) => ({ hour: i, revenue: 0, orders: 0, itemsSold: 0 }));
    for (const s of (snapshot?.datasets.sales || [])) {
      if (!s.dateKey || !inRange(s.dateKey, r.fromKey, r.toKey) || s.hour === null || s.hour === undefined) continue;
      hours[s.hour].revenue += s.total || 0;
      hours[s.hour].orders += 1;
    }
    const items = snapshot?.datasets.saleItems || [];
    for (const it of items) {
      if (!it.dateKey || !inRange(it.dateKey, r.fromKey, r.toKey) || it.hour === null || it.hour === undefined) continue;
      hours[it.hour].itemsSold += it.quantity || 0;
    }
    const filled = hours.map((h) => ({ ...h, revenue: round(h.revenue), averageTicket: h.orders ? round(h.revenue / h.orders) : 0 }));
    const sortedByOrders = [...filled].sort((a, b) => b.orders - a.orders);
    res.json({ success: true, data: { hours: filled, top: sortedByOrders.slice(0, 3), hasData: filled.some((h) => h.orders > 0) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /weekday — distribution by day of week ──────────────────
router.get('/weekday', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = names.map((n, i) => ({ day: i, name: n, revenue: 0, orders: 0, isWeekend: i === 0 || i === 6 }));
    for (const s of (snapshot?.datasets.sales || [])) {
      if (!s.dateKey || !inRange(s.dateKey, r.fromKey, r.toKey)) continue;
      const d = new Date(`${s.dateKey}T00:00:00`).getDay();
      days[d].revenue += s.total || 0;
      days[d].orders += 1;
    }
    const totalOrders = days.reduce((a, d) => a + d.orders, 0);
    res.json({
      success: true,
      data: {
        days: days.map((d) => ({ ...d, revenue: round(d.revenue), sharePct: totalOrders ? round((d.orders / totalOrders) * 100) : 0 })),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /categories ─────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const map = new Map();
    for (const it of (snapshot?.datasets.saleItems || [])) {
      if (!it.dateKey || !inRange(it.dateKey, r.fromKey, r.toKey)) continue;
      const cat = it.category || 'Unknown';
      if (!map.has(cat)) map.set(cat, { category: cat, revenue: 0, units: 0, orders: 0, ordersSet: new Set() });
      const g = map.get(cat);
      g.revenue += it.lineTotal || 0;
      g.units += it.quantity || 0;
      if (it.saleId) g.ordersSet.add(it.saleId);
    }
    const totalRevenue = [...map.values()].reduce((a, g) => a + g.revenue, 0);
    res.json({
      success: true,
      data: {
        categories: [...map.values()].map((g) => ({
          ...g,
          orders: g.ordersSet.size,
          ordersSet: undefined,
          revenue: round(g.revenue),
          sharePct: totalRevenue ? round((g.revenue / totalRevenue) * 100) : 0,
          averageTicket: g.ordersSet.size ? round(g.revenue / g.ordersSet.size) : 0,
        })).sort((a, b) => b.revenue - a.revenue),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /products — top products (revenue/units/profit) ─────────
router.get('/products', async (req, res) => {
  try {
    const { clientId, from, to, sort = 'revenue', limit = 20 } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const costs = new Map((snapshot?.datasets.products || []).map((p) => [String(p.productId), p.costPrice]));
    const items = aggregateSaleItems(snapshot?.datasets.saleItems || [], r.fromKey, r.toKey);
    const totalRevenue = items.reduce((a, i) => a + i.revenue, 0);

    const rows = items.map((i) => {
      const cost = costs.get(String(i.productId));
      const profit = cost != null ? round(i.revenue - cost * i.units) : null;
      return {
        ...i,
        revenue: round(i.revenue),
        profit,
        marginPct: cost != null && i.revenue ? round(((i.revenue - cost * i.units) / i.revenue) * 100) : null,
        sharePct: totalRevenue ? round((i.revenue / totalRevenue) * 100) : 0,
        averagePrice: i.units ? round(i.revenue / i.units) : 0,
      };
    });

    const sorters = {
      revenue: (a, b) => b.revenue - a.revenue,
      units: (a, b) => b.units - a.units,
      profit: (a, b) => (b.profit ?? -Infinity) - (a.profit ?? -Infinity),
      orders: (a, b) => b.orders - a.orders,
    };
    const sorted = rows.sort(sorters[sort] || sorters.revenue).slice(0, limit);

    res.json({
      success: true,
      data: { sort, limit, totalProducts: rows.length, totalRevenue: round(totalRevenue), products: sorted },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /customers — top & full customer analytics ──────────────
router.get('/customers', async (req, res) => {
  try {
    const { clientId, from, to, sort = 'revenue', limit = 25 } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const map = new Map();
    const sales = (snapshot?.datasets.sales || []).filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey));
    for (const s of sales) {
      const cid = s.customerId || 'anonymous';
      if (!map.has(cid)) map.set(cid, { customerId: s.customerId || null, name: s.customerName || 'Anonymous', revenue: 0, orders: 0, lastVisit: null });
      const g = map.get(cid);
      g.revenue += s.total || 0;
      g.orders += 1;
      if (!g.lastVisit || s.dateKey > g.lastVisit) g.lastVisit = s.dateKey;
    }
    const profileMap = new Map((snapshot?.datasets.customers || []).map((c) => [String(c.customerId), c]));
    const totalRevenue = [...map.values()].reduce((a, g) => a + g.revenue, 0);

    const rows = [...map.values()].map((g) => {
      const p = g.customerId ? profileMap.get(g.customerId) : null;
      return {
        ...g,
        name: p?.name || g.name,
        email: p?.email || null,
        phone: p?.phone || null,
        loyaltyPoints: p?.loyaltyPoints || 0,
        isActive: p ? p.isActive : true,
        averageTicket: g.orders ? round(g.revenue / g.orders) : 0,
        sharePct: totalRevenue ? round((g.revenue / totalRevenue) * 100) : 0,
      };
    });

    const sorters = {
      revenue: (a, b) => b.revenue - a.revenue,
      orders: (a, b) => b.orders - a.orders,
      spend: (a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0),
      points: (a, b) => (b.loyaltyPoints ?? 0) - (a.loyaltyPoints ?? 0),
    };

    const top = rows.slice().sort(sorters[sort] || sorters.revenue).slice(0, limit);
    const active = profileMap.size || rows.length;
    res.json({
      success: true,
      data: {
        sort,
        totalCustomers: active,
        activeInRange: rows.filter((r) => r.customerId).length,
        revenuePerCustomer: rows.length ? round(totalRevenue / rows.length) : 0,
        totalRevenue: round(totalRevenue),
        top,
        all: rows.sort((a, b) => b.revenue - a.revenue),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /employees — cashier/waiter performance ─────────────────
router.get('/employees', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const map = new Map();
    const sales = (snapshot?.datasets.sales || []).filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey));
    for (const s of sales) {
      const uid = s.userId || 'unknown';
      if (!map.has(uid)) map.set(uid, { userId: s.userId || null, name: s.cashierFullName || s.cashierName || 'Unknown', revenue: 0, orders: 0, customers: new Set(), byDate: new Map() });
      const g = map.get(uid);
      g.revenue += s.total || 0;
      g.orders += 1;
      if (s.customerId) g.customers.add(s.customerId);
      const prev = g.byDate.get(s.dateKey) || 0;
      g.byDate.set(s.dateKey, prev + (s.total || 0));
    }
    const totalRevenue = [...map.values()].reduce((a, g) => a + g.revenue, 0);
    const rows = [...map.values()].map((g) => ({
      userId: g.userId,
      name: g.name,
      revenue: round(g.revenue),
      orders: g.orders,
      customers: g.customers.size,
      customersSet: undefined,
      averageTicket: g.orders ? round(g.revenue / g.orders) : 0,
      sharePct: totalRevenue ? round((g.revenue / totalRevenue) * 100) : 0,
      byDate: [...g.byDate.entries()].map(([date, revenue]) => ({ date, revenue: round(revenue) })).sort((a, b) => (a.date < b.date ? -1 : 1)),
    }));
    res.json({ success: true, data: { totalRevenue: round(totalRevenue), employees: rows.sort((a, b) => b.revenue - a.revenue) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /tables — table performance & utilization ───────────────
router.get('/tables', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const tableMeta = new Map((snapshot?.datasets.tables || []).map((t) => [String(t.tableId), t]));
    const map = new Map();
    const sales = (snapshot?.datasets.sales || []).filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey) && s.tableId);
    for (const s of sales) {
      const tid = s.tableId;
      if (!map.has(tid)) map.set(tid, { tableId: tid, orders: 0, revenue: 0, customers: 0, customersSet: new Set() });
      const g = map.get(tid);
      g.orders += 1;
      g.revenue += s.total || 0;
      if (s.customerId) g.customersSet.add(s.customerId);
    }
    const reservationsByTable = new Map();
    for (const rv of (snapshot?.datasets.reservations || [])) {
      if (!rv.tableId) continue;
      const arr = reservationsByTable.get(rv.tableId) || [];
      arr.push(rv);
      reservationsByTable.set(rv.tableId, arr);
    }
    const totalRevenue = [...map.values()].reduce((a, g) => a + g.revenue, 0);
    const rows = [...map.values()].map((g) => {
      const meta = tableMeta.get(g.tableId);
      const res = reservationsByTable.get(g.tableId) || [];
      return {
        tableId: g.tableId,
        tableNumber: meta?.tableNumber ?? g.tableId,
        capacity: meta?.capacity ?? null,
        status: meta?.status ?? null,
        zone: meta?.zone ?? null,
        orders: g.orders,
        revenue: round(g.revenue),
        averageTicket: g.orders ? round(g.revenue / g.orders) : 0,
        customers: g.customersSet.size,
        customersSet: undefined,
        reservations: res.length,
        sharePct: totalRevenue ? round((g.revenue / totalRevenue) * 100) : 0,
      };
    });
    const occupiedNow = (snapshot?.datasets.tables || []).filter((t) => t.status === 'occupied').length;
    const totalTables = (snapshot?.datasets.tables || []).length;
    res.json({
      success: true,
      data: {
        totalTables,
        occupiedNow,
        utilizationNowPct: totalTables ? round((occupiedNow / totalTables) * 100) : 0,
        totalRevenue: round(totalRevenue),
        tables: rows.sort((a, b) => b.revenue - a.revenue),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /kitchen — kitchen performance ──────────────────────────
router.get('/kitchen', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const orders = (snapshot?.datasets.kitchenOrders || []).filter((o) => o.dateKey && inRange(o.dateKey, r.fromKey, r.toKey));

    const statusMap = new Map();
    const priorityMap = new Map();
    const deptMap = new Map();
    const cancelled = [];
    let prepTotal = 0, prepCount = 0, serviceTotal = 0, serviceCount = 0, onTime = 0, withEstimate = 0;

    for (const o of orders) {
      statusMap.set(o.status || 'unknown', (statusMap.get(o.status || 'unknown') || 0) + 1);
      priorityMap.set(o.priority || 'normal', (priorityMap.get(o.priority || 'normal') || 0) + 1);
      if (o.department) deptMap.set(o.department, (deptMap.get(o.department) || 0) + 1);
      if (o.status === 'cancelled') cancelled.push(o);
      if (o.prepSeconds != null && o.prepSeconds > 0) { prepTotal += o.prepSeconds; prepCount++; }
      if (o.serviceSeconds != null && o.serviceSeconds > 0) { serviceTotal += o.serviceSeconds; serviceCount++; }
      if (o.estimatedMinutes != null && o.prepSeconds != null) {
        withEstimate++;
        if (o.prepSeconds <= o.estimatedMinutes * 60) onTime++;
      }
    }

    const cancelReasons = new Map();
    for (const c of cancelled) {
      const why = c.cancelReason || 'Not specified';
      cancelReasons.set(why, (cancelReasons.get(why) || 0) + 1);
    }

    const departments = [...deptMap.entries()].map(([name, orders]) => ({ name, orders })).sort((a, b) => b.orders - a.orders);

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        status: [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
        priority: [...priorityMap.entries()].map(([priority, count]) => ({ priority, count })).sort((a, b) => b.count - a.count),
        departments,
        cancelled: { count: cancelled.length, reasons: [...cancelReasons.entries()].map(([reason, count]) => ({ reason, count })) },
        timings: {
          averagePrepSeconds: prepCount ? round(prepTotal / prepCount) : null,
          averageServiceSeconds: serviceCount ? round(serviceTotal / serviceCount) : null,
          onTimePct: withEstimate ? round((onTime / withEstimate) * 100) : null,
          estimatedCount: withEstimate,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /inventory — stock & valuation (warehouse truth) ────────
router.get('/inventory', async (req, res) => {
  try {
    const { clientId } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);

    const minStock = new Map((snapshot?.datasets.products || []).map((p) => [String(p.productId), p.minStock || 0]));
    const rows = await prisma.factInventory.findMany({
      where: { tenantId: clientId },
      orderBy: [{ timesSold: 'desc' }],
    });

    let totalValue = 0, totalStock = 0, lowStock = 0, outOfStock = 0;
    const items = rows.map((r, i) => {
      const dimId = r.dimProductId;
      const pid = dimId ? dimId.split('_').pop() : null;
      const min = pid ? minStock.get(pid) : null;
      const value = (r.stock || 0) * (r.price || 0);
      totalValue += value;
      totalStock += r.stock || 0;
      if ((r.stock || 0) === 0) outOfStock++;
      else if (min != null && (r.stock || 0) < min) lowStock++;
      return {
        productId: pid,
        name: r.productName,
        stock: r.stock,
        price: r.price,
        value: round(value),
        timesSold: r.timesSold,
        minStock: min,
        needsReorder: min != null ? (r.stock || 0) < min : null,
      };
    }).sort((a, b) => b.value - a.value);

    res.json({
      success: true,
      data: {
        totalProducts: items.length,
        totalStock,
        totalValue: round(totalValue),
        lowStock,
        outOfStock,
        items,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /shifts — cash reconciliation ───────────────────────────
router.get('/shifts', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const shifts = (snapshot?.datasets.shifts || []).filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey));
    const byUser = new Map();
    let totalExpected = 0, totalActual = 0, totalCash = 0, totalCard = 0, totalOther = 0;

    const rows = shifts.map((s) => {
      totalExpected += s.closingExpected || 0;
      totalActual += s.closingActual || 0;
      totalCash += s.cashSales || 0;
      totalCard += s.cardSales || 0;
      totalOther += s.otherSales || 0;
      if (s.userId) {
        if (!byUser.has(s.userId)) byUser.set(s.userId, { userId: s.userId, name: s.userName || 'Unknown', revenue: 0, shifts: 0 });
        const u = byUser.get(s.userId);
        u.revenue += s.closingActual || 0;
        u.shifts += 1;
      }
      return {
        shiftId: s.shiftId,
        userName: s.userName,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        status: s.status,
        cashSales: round(s.cashSales),
        cardSales: round(s.cardSales),
        otherSales: round(s.otherSales),
        closingExpected: round(s.closingExpected),
        closingActual: round(s.closingActual),
        difference: round(s.difference),
      };
    });

    res.json({
      success: true,
      data: {
        totalShifts: rows.length,
        totals: { expected: round(totalExpected), actual: round(totalActual), cash: round(totalCash), card: round(totalCard), other: round(totalOther), difference: round(totalActual - totalExpected) },
        byUser: [...byUser.values()].map((u) => ({ ...u, revenue: round(u.revenue) })).sort((a, b) => b.revenue - a.revenue),
        shifts: rows.sort((a, b) => (a.openedAt || '' < b.openedAt || '' ? 1 : -1)),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /reservations ───────────────────────────────────────────
router.get('/reservations', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const reservations = (snapshot?.datasets.reservations || []).filter((rv) => rv.dateKey && inRange(rv.dateKey, r.fromKey, r.toKey));
    const statusMap = new Map();
    const byDate = new Map();
    let partySum = 0, partyCount = 0;
    for (const rv of reservations) {
      statusMap.set(rv.status || 'unknown', (statusMap.get(rv.status || 'unknown') || 0) + 1);
      byDate.set(rv.dateKey, (byDate.get(rv.dateKey) || 0) + 1);
      if (rv.partySize) { partySum += rv.partySize; partyCount++; }
    }
    res.json({
      success: true,
      data: {
        total: reservations.length,
        averagePartySize: partyCount ? round(partySum / partyCount) : null,
        status: [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
        byDate: [...byDate.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => (a.date < b.date ? -1 : 1)),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /insights — auto-generated business insights ────────────
router.get('/insights', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot, reason } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const cur = await prisma.factSale.aggregate({
      where: { tenantId: clientId, dimTimeId: { gte: r.fromInt, lte: r.toInt } },
      _sum: { total: true },
      _count: { _all: true },
    });
    const prev = await prisma.factSale.aggregate({
      where: { tenantId: clientId, dimTimeId: { gte: toDimInt(r.prevFromKey), lte: toDimInt(r.prevToKey) } },
      _sum: { total: true },
      _count: { _all: true },
    });
    const revenue = cur._sum.total || 0;
    const orders = cur._count._all;
    const prevRevenue = prev._sum.total || 0;
    const prevOrders = prev._count._all;

    const insights = [];

    // 1. Revenue trend
    const revDelta = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null;
    insights.push({
      id: 'revenue-trend', type: revDelta >= 0 ? 'positive' : 'warning',
      title: 'Revenue trend', value: `${revDelta != null ? (revDelta >= 0 ? '+' : '') + revDelta + '%' : 'N/A'} vs previous period`,
      message: revDelta >= 0
        ? `Revenue grew ${revDelta}% compared to the previous ${r.span}-day period (${prevRevenue.toLocaleString()} → ${revenue.toLocaleString()}).`
        : `Revenue dropped ${Math.abs(revDelta)}% compared to the previous ${r.span}-day period (${prevRevenue.toLocaleString()} → ${revenue.toLocaleString()}).`,
      currency: snapshot?.metadata?.currency || null,
    });

    // 2. Average ticket
    const avgTicket = orders ? revenue / orders : 0;
    const prevAvg = prevOrders ? prevRevenue / prevOrders : 0;
    const ticketDelta = prevAvg ? Math.round(((avgTicket - prevAvg) / prevAvg) * 1000) / 10 : null;
    insights.push({
      id: 'ticket-size', type: ticketDelta >= 0 ? 'positive' : 'warning',
      title: 'Average ticket', value: `${avgTicket.toFixed(2)} (${ticketDelta >= 0 ? '+' : ''}${ticketDelta}%)`,
      message: `Average ticket is ${avgTicket.toFixed(2)} — ${ticketDelta >= 0 ? 'up' : 'down'} ${Math.abs(ticketDelta)}% versus the previous period. ${ticketDelta < 0 ? 'Consider upselling or combo offers.' : 'Good momentum — keep driving volume.'}`,
    });

    // 3. Best sellers (from cache)
    if (snapshot?.datasets.saleItems?.length) {
      const items = aggregateSaleItems(snapshot.datasets.saleItems, r.fromKey, r.toKey).sort((a, b) => b.revenue - a.revenue);
      if (items.length) {
        const best = items[0];
        const bestUnits = items.slice().sort((a, b) => b.units - a.units)[0];
        insights.push({
          id: 'best-product', type: 'positive',
          title: 'Best-selling product', value: best.name,
          message: `"${best.name}" leads with ${best.revenue.toFixed(2)} in revenue (${best.orders} orders). Best in volume: "${bestUnits.name}" (${bestUnits.units} units).`,
        });
      }
    }

    // 4. Peak hours
    if (snapshot?.datasets.sales?.length) {
      const hours = new Array(24).fill(0).map((_, i) => ({ hour: i, orders: 0, revenue: 0 }));
      for (const s of snapshot.datasets.sales) {
        if (s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey) && s.hour !== null && s.hour !== undefined) {
          hours[s.hour].orders += 1;
          hours[s.hour].revenue += s.total || 0;
        }
      }
      const peak = hours.slice().sort((a, b) => b.orders - a.orders)[0];
      if (peak && peak.orders > 0) {
        insights.push({
          id: 'peak-hour', type: 'info',
          title: 'Peak hour', value: `${String(peak.hour).padStart(2, '0')}:00`,
          message: `Busiest hour is ${String(peak.hour).padStart(2, '0')}:00 with ${peak.orders} orders. ${peak.orders > orders / 24 ? 'This is above the hourly average — consider extra staffing then.' : 'Consider promotion campaigns to flatten the curve.'}`,
        });
      }
    }

    // 5. Payment mix
    const pm = await prisma.factSale.groupBy({
      by: ['paymentMethod'], where: { tenantId: clientId, dimTimeId: { gte: r.fromInt, lte: r.toInt } },
      _sum: { total: true },
    });
    const topMethod = pm.slice().sort((a, b) => (b._sum.total || 0) - (a._sum.total || 0))[0];
    if (topMethod) {
      insights.push({
        id: 'payment-mix', type: 'info',
        title: 'Preferred payment', value: topMethod.paymentMethod || 'unknown',
        message: `"${topMethod.paymentMethod}" represents ${Math.round(((topMethod._sum.total || 0) / revenue) * 100)}% of revenue.`,
      });
    }

    // 6. Top customers concentration
    if (snapshot?.datasets.sales?.length) {
      const byCust = new Map();
      for (const s of snapshot.datasets.sales) {
        if (!s.dateKey || !inRange(s.dateKey, r.fromKey, r.toKey) || !s.customerId) continue;
        byCust.set(s.customerId, (byCust.get(s.customerId) || 0) + (s.total || 0));
      }
      if (byCust.size) {
        const topCust = [...byCust.entries()].sort((a, b) => b[1] - a[1]);
        const top5 = topCust.slice(0, 5).reduce((a, [, v]) => a + v, 0);
        const share = Math.round((top5 / revenue) * 100);
        insights.push({
          id: 'customer-concentration', type: share > 40 ? 'warning' : 'info',
          title: 'Customer concentration', value: `Top 5 = ${share}%`,
          message: `Top 5 customers contribute ${share}% of revenue. ${share > 40 ? 'Revenue is concentrated — protect these relationships and grow the middle tier.' : 'Customer base is well diversified.'}`,
        });
      }
    }

    // 7. Inventory health
    const inv = await prisma.factInventory.findMany({ where: { tenantId: clientId } });
    const minStock = new Map((snapshot?.datasets.products || []).map((p) => [String(p.productId), p.minStock || 0]));
    const low = [];
    for (const row of inv) {
      const pid = row.dimProductId ? row.dimProductId.split('_').pop() : null;
      const min = pid ? minStock.get(pid) : null;
      if (min != null && (row.stock || 0) < min) low.push(row.productName);
    }
    if (low.length) {
      insights.push({
        id: 'inventory-low', type: 'warning',
        title: 'Low stock alert', value: `${low.length} product(s) below minimum`,
        message: `Products below minimum stock: ${low.slice(0, 5).join(', ')}${low.length > 5 ? ` +${low.length - 5} more` : ''}. Reorder to avoid stockouts.`,
      });
    } else {
      insights.push({
        id: 'inventory-health', type: 'positive', title: 'Inventory health', value: 'All products above minimum',
        message: 'No product is currently below its minimum stock level.',
      });
    }

    // 8. Kitchen performance
    if (snapshot?.datasets.kitchenOrders?.length) {
      const kos = snapshot.datasets.kitchenOrders.filter((o) => o.dateKey && inRange(o.dateKey, r.fromKey, r.toKey));
      let prepTotal = 0, prepCount = 0;
      for (const o of kos) if (o.prepSeconds != null && o.prepSeconds > 0) { prepTotal += o.prepSeconds; prepCount++; }
      if (prepCount) {
        const avg = Math.round(prepTotal / prepCount / 60);
        insights.push({
          id: 'kitchen-time', type: avg > 20 ? 'warning' : 'info',
          title: 'Kitchen turnaround', value: `${avg} min average`,
          message: `Average kitchen prep-to-ready time is ${avg} minutes. ${avg > 20 ? 'Consider staffing or menu simplification during peak hours.' : 'Kitchen is performing well.'}`,
        });
      }
    }

    // 9. Table utilization
    if (snapshot?.datasets.tables?.length && snapshot?.datasets.sales?.length) {
      const tableSales = snapshot.datasets.sales.filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey) && s.tableId);
      const tablesTotal = snapshot.datasets.tables.length;
      insights.push({
        id: 'table-utilization', type: 'info',
        title: 'Dine-in share', value: `${tablesTotal ? Math.round((tableSales.length / Math.max(snapshot.datasets.sales.filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey)).length, 1)) * 100) : 0}% dine-in`,
        message: `${tableSales.length} of ${orders} orders were dine-in across ${tablesTotal} configured tables.`,
      });
    }

    res.json({ success: true, data: { insights, cacheReason: reason, range: { from: r.fromKey, to: r.toKey, prevFrom: r.prevFromKey, prevTo: r.prevToKey } } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /drilldown — drill into a specific entity ──────────────
// dimension: sale | product | customer | employee   id: entity id (optional for sale)
router.get('/drilldown', async (req, res) => {
  try {
    const { clientId, from, to } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const dimension = req.query.dimension || 'sale';
    const id = req.query.id || null;
    const { snapshot } = await getSnapshot(clientId);
    const r = await resolveRange(clientId, from, to, snapshot);

    const sales = (snapshot?.datasets.sales || []).filter((s) => s.dateKey && inRange(s.dateKey, r.fromKey, r.toKey));
    const items = (snapshot?.datasets.saleItems || []).filter((it) => it.dateKey && inRange(it.dateKey, r.fromKey, r.toKey));
    const uid = id ? String(id) : null;

    const series = new Map(); // dateKey -> {date, revenue, orders, units}
    const paymentMap = new Map();
    const breakdownMap = new Map();
    const addSeries = (key, revenue, orders, units = 0) => {
      if (!series.has(key)) series.set(key, { date: key, revenue: 0, orders: 0, units: 0 });
      const s = series.get(key);
      s.revenue += revenue; s.orders += orders; s.units += units;
    };
    const addPayment = (m, revenue, orders) => {
      if (!paymentMap.has(m)) paymentMap.set(m, { method: m, revenue: 0, orders: 0 });
      const e = paymentMap.get(m); e.revenue += revenue; e.orders += orders;
    };
    const addBreakdown = (k, label, revenue, orders, units = 0) => {
      if (!breakdownMap.has(k)) breakdownMap.set(k, { key: k, label, revenue: 0, orders: 0, units: 0 });
      const e = breakdownMap.get(k); e.revenue += revenue; e.orders += orders; e.units += units;
    };

    let entity = { name: null, id: uid };
    const itemIds = new Set();

    if (dimension === 'product') {
      entity.name = items.find((it) => String(it.productId) === uid)?.productName || `Produit ${uid}`;
      for (const it of items) {
        if (String(it.productId) !== uid) continue;
        addSeries(it.dateKey, it.lineTotal || 0, 0, it.quantity || 0);
        addPayment(it.paymentMethod || 'unknown', it.lineTotal || 0, 1);
        itemIds.add(it.saleId);
      }
      // orders actually containing this product
      const saleMap = new Map(sales.map((s) => [String(s.saleId), s]));
      for (const sid of itemIds) {
        const s = saleMap.get(String(sid));
        if (s) {
          const ex = series.get(s.dateKey);
          if (ex) ex.orders += 1;
          addBreakdown('category', itCategoryLabel(snapshot, uid), 0, 0);
        }
      }
    } else if (dimension === 'customer') {
      entity.name = sales.find((s) => String(s.customerId) === uid)?.customerName || uid || 'Anonymous';
      for (const s of sales) {
        if (uid && String(s.customerId) !== uid) continue;
        addSeries(s.dateKey, s.total || 0, 1);
        addPayment(s.paymentMethod || 'unknown', s.total || 0, 1);
        const k = s.userId || 'unknown';
        addBreakdown(k, s.cashierFullName || s.cashierName || 'Unknown', s.total || 0, 1);
      }
    } else if (dimension === 'employee') {
      entity.name = sales.find((s) => String(s.userId) === uid)?.cashierFullName || sales.find((s) => String(s.userId) === uid)?.cashierName || uid || 'Unknown';
      for (const s of sales) {
        if (String(s.userId) !== uid) continue;
        addSeries(s.dateKey, s.total || 0, 1);
        addPayment(s.paymentMethod || 'unknown', s.total || 0, 1);
        itemIds.add(String(s.saleId));
      }
      const saleIds = new Set(itemIds);
      for (const it of items) {
        if (!saleIds.has(String(it.saleId))) continue;
        addBreakdown(`${it.productId}::${it.productName}`, it.productName || 'Produit', it.lineTotal || 0, 1, it.quantity || 0);
      }
    } else {
      // sale = entity invoice detail (or global breakdown when no id)
      const s = uid ? sales.find((x) => String(x.saleId) === uid) || null : null;
      if (s) {
        entity.name = `Vente ${s.saleId}`;
        addSeries(s.dateKey, s.total || 0, 1);
        addPayment(s.paymentMethod || 'unknown', s.total || 0, 1);
        const detailItems = items.filter((it) => String(it.saleId) === uid);
        for (const it of detailItems) {
          addBreakdown(String(it.productId), it.productName || 'Produit', it.lineTotal || 0, 1, it.quantity || 0);
        }
      } else if (!uid) {
        entity.name = 'Toutes les ventes';
        for (const x of sales) {
          addSeries(x.dateKey, x.total || 0, 1);
          addPayment(x.paymentMethod || 'unknown', x.total || 0, 1);
          const k = x.userId || 'unknown';
          addBreakdown(k, x.cashierFullName || x.cashierName || 'Unknown', x.total || 0, 1);
        }
      } else {
        entity.name = `Vente ${uid}`;
      }
    }

    const seriesArr = [...series.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((p) => ({ ...p, revenue: round(p.revenue), averageTicket: p.orders ? round(p.revenue / p.orders) : 0 }));
    const totalRevenue = seriesArr.reduce((a, p) => a + p.revenue, 0);
    const totalOrders = seriesArr.reduce((a, p) => a + p.orders, 0);
    const totalUnits = seriesArr.reduce((a, p) => a + p.units, 0);

    res.json({
      success: true,
      data: {
        dimension, id: uid, name: entity.name,
        range: { from: r.fromKey, to: r.toKey },
        totals: { revenue: round(totalRevenue), orders: totalOrders, units: totalUnits, averageTicket: totalOrders ? round(totalRevenue / totalOrders) : 0 },
        series: seriesArr,
        payment: [...paymentMap.values()].map((p) => ({ ...p, revenue: round(p.revenue) })).sort((a, b) => b.revenue - a.revenue),
        breakdown: [...breakdownMap.values()].map((b) => ({
          ...b, revenue: round(b.revenue),
          sharePct: totalRevenue ? round((b.revenue / totalRevenue) * 100) : 0,
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 25),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// helper: product category label for a product id
function itCategoryLabel(snapshot, pid) {
  const cat = (snapshot?.datasets.products || []).find((p) => String(p.productId) === pid);
  return cat?.category || 'Produit';
}

// ─── GET /filters — filter dropdowns + overall range ─────────────
router.get('/filters', async (req, res) => {
  try {
    const { clientId } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const { snapshot } = await getSnapshot(clientId);

    const [dimMin, dimMax, methods] = await Promise.all([
      prisma.factSale.aggregate({ where: { tenantId: clientId }, _min: { dimTimeId: true } }),
      prisma.factSale.aggregate({ where: { tenantId: clientId }, _max: { dimTimeId: true } }),
      prisma.factSale.groupBy({ by: ['paymentMethod'], where: { tenantId: clientId }, _count: { _all: true } }),
    ]);

    const cats = new Set();
    const products = new Map();
    for (const it of (snapshot?.datasets.saleItems || [])) {
      if (it.category) cats.add(it.category);
      if (it.productId) products.set(String(it.productId), it.productName);
    }
    const employees = new Map();
    for (const s of (snapshot?.datasets.sales || [])) {
      if (s.userId) employees.set(String(s.userId), s.cashierFullName || s.cashierName || 'Unknown');
    }
    const customers = new Map();
    for (const c of (snapshot?.datasets.customers || [])) customers.set(String(c.customerId), c.name);
    const tables = new Set();
    for (const s of (snapshot?.datasets.sales || [])) if (s.tableId) tables.add(s.tableId);
    const tablesMeta = (snapshot?.datasets.tables || []).map((t) => ({ tableId: t.tableId, tableNumber: t.tableNumber }));

    res.json({
      success: true,
      data: {
        range: { min: toDateKey(dimMin._min.dimTimeId) || null, max: toDateKey(dimMax._max.dimTimeId) || null },
        paymentMethods: methods.map((m) => m.paymentMethod).filter(Boolean).sort(),
        categories: [...cats].sort(),
        employees: [...employees.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => (a.name < b.name ? -1 : 1)),
        customers: [...customers.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => (a.name < b.name ? -1 : 1)),
        products: [...products.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => (a.name < b.name ? -1 : 1)),
        tables: tablesMeta,
        cache: snapshot ? { uploadId: snapshot.uploadId, builtAt: snapshot.builtAt, datasets: Object.fromEntries(Object.entries(snapshot.datasets).map(([k, v]) => [k, v.length])) } : null,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /status — analytics service status ──────────────────────
router.get('/status', async (req, res) => {
  try {
    const { clientId } = parseQuery(req);
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const upload = await cacheService.latestUpload(clientId);
    const { snapshot, reason } = await getSnapshot(clientId);
    const whCounts = await Promise.all([
      prisma.factSale.count({ where: { tenantId: clientId } }),
      prisma.factInventory.count({ where: { tenantId: clientId } }),
      prisma.factKitchenOrder.count({ where: { tenantId: clientId } }),
      prisma.factAppointment.count({ where: { tenantId: clientId } }),
    ]);
    res.json({
      success: true,
      data: {
        upload: upload ? { id: upload.id, fileName: upload.fileName, status: upload.status, createdAt: upload.createdAt } : null,
        cache: snapshot ? {
          uploadId: snapshot.uploadId, builtAt: snapshot.builtAt, reason, businessType: snapshot.businessType,
          datasets: Object.fromEntries(Object.entries(snapshot.datasets).map(([k, v]) => [k, v.length])),
        } : { reason, built: false },
        warehouse: { factSales: whCounts[0], factInventory: whCounts[1], factKitchenOrders: whCounts[2], factAppointments: whCounts[3] },
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /refresh — force rebuild enrichment cache ──────────────
router.post('/refresh', async (req, res) => {
  try {
    const clientId = req.body?.clientId || req.query.clientId;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const result = await cacheService.refresh(clientId);
    res.json({
      success: true,
      data: {
        uploadId: result.uploadId,
        reason: result.reason,
        builtAt: result.snapshot?.builtAt || null,
        rebuilt: result.reason === 'BUILT',
        message: result.reason === 'BUILT'
          ? 'Analytics cache rebuilt from the latest COMPLETED export.'
          : 'No newer COMPLETED export — cache already current.',
      },
    });
  } catch (e) {
    console.error('[ANALYTICS] refresh failed:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
