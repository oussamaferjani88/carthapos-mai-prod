/**
 * Analytics Enrichment Service + Cache
 *
 * THE ONLY component allowed to read the retained POS export ZIPs.
 *
 * Architecture (Hybrid Analytics Cache):
 *   POS -> Export ZIP -> ETL -> Analytics Warehouse (OFFICIAL source of truth)
 *                                 -> Analytics Enrichment Service (ZIP access ONLY here)
 *                                    -> Analytics Cache (read-only JSON, keyed by uploadId)
 *                                       -> Dashboards / BI Workspace
 *
 * Responsibilities:
 *  - Detect the latest COMPLETED upload per client.
 *  - Parse its ZIP ONCE (only when a newer COMPLETED upload exists or the cache
 *    file is missing) and extract ONLY the granular datasets absent from the
 *    warehouse (sale_items, customers, products, kitchen timestamps, shifts,
 *    tables, reservations, stock movements, suppliers, services, appointments).
 *  - Persist an optimized read-only JSON cache, keyed by uploadId, with a
 *    meta.json mapping clientId -> current uploadId for invalidation.
 *  - Serve the snapshot through an in-memory LRU so dashboards never trigger a
 *    ZIP parse on request.
 *
 * It NEVER writes to the warehouse, NEVER replaces it, and NEVER changes any
 * ETL / wizard / schema behaviour.
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const BiSchemaRegistry = require('./bi-schema-registry');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CACHE_DIR = path.join(__dirname, '..', 'analytics-cache');
const META_FILE = path.join(CACHE_DIR, 'meta.json');
const LOG = (msg) => console.log(`[ANALYTICS-CACHE] ${msg}`);

// In-memory LRU of parsed snapshots: clientId -> { uploadId, snapshot }
const memory = new Map();
const MEMORY_MAX = 32;

// ─── Timestamp helpers ─────────────────────────────────────────
// POS exports use naive local time "YYYY-MM-DD HH:MM:SS".
function parseTs(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  let date;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    date = new Date(s.replace(' ', 'T'));
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    date = new Date(`${s}T00:00:00`);
  } else {
    date = new Date(s);
  }
  if (isNaN(date.getTime())) return null;
  return date;
}

function dateKey(ts) {
  if (!ts) return null;
  return `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
}

// "YYYY-MM-DD HH:MM:SS" from a Date (naive local, no timezone shifting)
function tsToIso(ts) {
  if (!ts) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${ts.getFullYear()}-${p(ts.getMonth() + 1)}-${p(ts.getDate())}T${p(ts.getHours())}:${p(ts.getMinutes())}:${p(ts.getSeconds())}`;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// dimTimeId (int YYYYMMDD) <-> date helpers (warehouse uses these, NOT createdAt)
function dimToDateKey(dimTimeId) {
  if (!dimTimeId) return null;
  const s = String(dimTimeId);
  if (s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}
function dateKeyToDim(dateKey) {
  if (!dateKey) return null;
  return parseInt(dateKey.replace(/-/g, ''), 10);
}

// ─── CSV parsing (reuses the exact ETL parser) ─────────────────
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = BiSchemaRegistry.parseCsvRow(header, lines[i]);
    if (row) rows.push(row);
  }
  return { header, rows };
}

// ─── Cache meta ────────────────────────────────────────────────
function readMeta() {
  try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch { return {}; }
}
function writeMeta(meta) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

// ─── Public: find latest COMPLETED upload for a client ─────────
async function latestUpload(clientId) {
  return prisma.biUpload.findFirst({
    where: { clientId, status: 'COMPLETED' },
    orderBy: [{ createdAt: 'desc' }],
  });
}

// ─── Build the cache from a ZIP (ONE parse, called rarely) ─────
function buildCache(upload) {
  LOG(`Building cache for upload=${upload.id} (${upload.fileName})`);
  const zip = new AdmZip(upload.filePath);
  const readCsv = (name) => {
    const entry = zip.getEntry(name);
    if (!entry) return null;
    return parseCsv(entry.getData().toString('utf8'));
  };
  const readJson = (name) => {
    const entry = zip.getEntry(name);
    if (!entry) return null;
    try { return JSON.parse(entry.getData().toString('utf8')); } catch { return null; }
  };

  const metadata = readJson('metadata.json') || {};
  const enabledModules = Array.isArray(metadata.enabled_modules)
    ? metadata.enabled_modules
    : typeof metadata.enabled_modules === 'string'
      ? metadata.enabled_modules.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  // sales (with time-of-day, customer/employee/table links)
  const sales = (readCsv('sales.csv')?.rows || []).map((r) => {
    const ts = parseTs(r.created_at);
    return {
      saleId: r.sale_id !== null && r.sale_id !== undefined ? String(r.sale_id) : null,
      total: toNumber(r.total),
      tax: toNumber(r.tax),
      discount: toNumber(r.discount),
      subtotal: toNumber(r.subtotal),
      paymentMethod: r.payment_method || null,
      customerId: r.customer_id !== null && r.customer_id !== undefined ? String(r.customer_id) : null,
      customerName: r.customer_name || null,
      tableId: r.table_id !== null && r.table_id !== undefined ? String(r.table_id) : null,
      userId: r.user_id !== null && r.user_id !== undefined ? String(r.user_id) : null,
      shiftId: r.shift_id !== null && r.shift_id !== undefined ? String(r.shift_id) : null,
      cashierName: r.cashier_name || null,
      cashierFullName: r.cashier_full_name || null,
      status: r.status || null,
      dateKey: ts ? dateKey(ts) : null,
      hour: ts ? ts.getHours() : null,
      createdAt: ts ? tsToIso(ts) : null,
    };
  });

  // sale_items (ITEM grain: products, categories, quantities)
  const saleItems = (readCsv('sale_items.csv')?.rows || []).map((r) => {
    const ts = parseTs(r.sale_date);
    return {
      saleItemId: r.sale_item_id !== null && r.sale_item_id !== undefined ? String(r.sale_item_id) : null,
      saleId: r.sale_id !== null && r.sale_id !== undefined ? String(r.sale_id) : null,
      productId: r.product_id !== null && r.product_id !== undefined ? String(r.product_id) : null,
      quantity: toNumber(r.quantity) || 0,
      unitPrice: toNumber(r.unit_price),
      lineTotal: toNumber(r.line_total),
      vatAmount: toNumber(r.vat_amount),
      paymentMethod: r.payment_method || null,
      productName: r.product_name || null,
      category: r.category || null,
      family: r.family || null,
      dateKey: ts ? dateKey(ts) : null,
      hour: ts ? ts.getHours() : null,
      saleDate: ts ? tsToIso(ts) : null,
    };
  });

  // customers
  const customers = (readCsv('customers.csv')?.rows || []).map((r) => ({
    customerId: String(r.customer_id),
    name: r.name || null,
    email: r.email || null,
    phone: r.phone || null,
    address: r.address || null,
    loyaltyPoints: toNumber(r.loyalty_points) || 0,
    totalSpent: toNumber(r.total_spent) || 0,
    visitCount: toNumber(r.visit_count) || 0,
    lastVisitDate: parseTs(r.last_visit_date) ? tsToIso(parseTs(r.last_visit_date)) : null,
    tags: r.tags || null,
    isActive: r.is_active === undefined || String(r.is_active) === '1' || String(r.is_active).toLowerCase() === 'true',
  }));

  // products
  const products = (readCsv('products.csv')?.rows || []).map((r) => ({
    productId: String(r.product_id),
    name: r.name || null,
    price: toNumber(r.price),
    costPrice: toNumber(r.cost_price),
    category: r.category || null,
    family: r.family || null,
    barcode: r.barcode || null,
    stock: toNumber(r.stock) || 0,
    minStock: toNumber(r.min_stock) || 0,
    unit: r.unit || null,
    supplier: r.supplier || null,
    requiresKitchen: r.requires_kitchen === undefined ? null : String(r.requires_kitchen) === '1' || String(r.requires_kitchen).toLowerCase() === 'true',
    preparationDepartment: r.preparation_department || null,
    preparationTime: toNumber(r.preparation_time),
    description: r.description || null,
  }));

  // product_families
  const productFamilies = (readCsv('product_families.csv')?.rows || []).map((r) => ({
    familyId: String(r.family_id),
    name: r.name || null,
    description: r.description || null,
    icon: r.icon || null,
  }));

  // kitchen_orders (timestamps -> prep/service durations)
  const kitchenOrders = (readCsv('kitchen_orders.csv')?.rows || []).map((r) => {
    const started = parseTs(r.started_at);
    const ready = parseTs(r.ready_at);
    const served = parseTs(r.served_at);
    const completed = parseTs(r.completed_at);
    const created = parseTs(r.created_at);
    const prepSeconds = started && (ready || completed) ? Math.max(0, Math.round(((ready || completed) - started) / 1000)) : null;
    const serviceSeconds = served && started ? Math.max(0, Math.round((served - started) / 1000)) : null;
    return {
      orderId: r.order_id !== null && r.order_id !== undefined ? String(r.order_id) : null,
      tableNumber: toNumber(r.table_number),
      notes: r.notes || null,
      priority: r.priority || null,
      status: r.status || null,
      saleId: r.sale_id !== null && r.sale_id !== undefined ? String(r.sale_id) : null,
      total: toNumber(r.total),
      serverName: r.server_name || null,
      customerName: r.customer_name || null,
      department: r.department || null,
      estimatedMinutes: toNumber(r.estimated_minutes),
      startedAt: started ? tsToIso(started) : null,
      readyAt: ready ? tsToIso(ready) : null,
      servedAt: served ? tsToIso(served) : null,
      completedAt: completed ? tsToIso(completed) : null,
      cancelReason: r.cancel_reason || null,
      dateKey: created ? dateKey(created) : (started ? dateKey(started) : null),
      prepSeconds,
      serviceSeconds,
      createdAt: created ? tsToIso(created) : null,
    };
  });

  // shifts
  const shifts = (readCsv('shifts.csv')?.rows || []).map((r) => {
    const opened = parseTs(r.opened_at);
    const closed = parseTs(r.closed_at);
    return {
      shiftId: r.shift_id !== null && r.shift_id !== undefined ? String(r.shift_id) : null,
      userId: r.user_id !== null && r.user_id !== undefined ? String(r.user_id) : null,
      userName: r.user_name || null,
      openingFloat: toNumber(r.opening_float),
      openedAt: opened ? tsToIso(opened) : null,
      closedAt: closed ? tsToIso(closed) : null,
      status: r.status || null,
      closingExpected: toNumber(r.closing_expected),
      closingActual: toNumber(r.closing_actual),
      difference: toNumber(r.difference),
      cashSales: toNumber(r.cash_sales),
      cardSales: toNumber(r.card_sales),
      otherSales: toNumber(r.other_sales),
      dateKey: opened ? dateKey(opened) : null,
    };
  });

  // tables
  const tables = (readCsv('tables.csv')?.rows || []).map((r) => ({
    tableId: String(r.table_id),
    tableNumber: toNumber(r.table_number) ?? String(r.table_number),
    capacity: toNumber(r.capacity),
    status: r.status || null,
  }));

  // table_reservations (reservation_date + reservation_time -> Date)
  const reservations = (readCsv('table_reservations.csv')?.rows || []).map((r) => {
    let ts = null;
    if (r.reservation_date) {
      const time = r.reservation_time || '00:00';
      const t = /^\d{1,2}:\d{2}$/.test(time) ? time : '00:00';
      ts = new Date(`${r.reservation_date}T${t}:00`);
      if (isNaN(ts.getTime())) ts = null;
    }
    if (!ts) ts = parseTs(r.reserved_at || r.created_at);
    return {
      reservationId: r.reservation_id !== null && r.reservation_id !== undefined ? String(r.reservation_id) : null,
      tableId: r.table_id !== null && r.table_id !== undefined ? String(r.table_id) : null,
      tableNumber: toNumber(r.table_number),
      customerName: r.customer_name || null,
      customerPhone: r.customer_phone || null,
      partySize: toNumber(r.guests ?? r.party_size),
      durationMinutes: toNumber(r.duration_minutes),
      status: r.status || null,
      dateKey: ts ? dateKey(ts) : null,
      reservedAt: ts ? tsToIso(ts) : null,
    };
  });

  // stock_movements
  const stockMovements = (readCsv('stock_movements.csv')?.rows || []).map((r) => {
    const ts = parseTs(r.moved_at || r.created_at);
    return {
      movementId: r.movement_id !== null && r.movement_id !== undefined ? String(r.movement_id) : null,
      productId: r.product_id !== null && r.product_id !== undefined ? String(r.product_id) : null,
      productName: r.product_name || null,
      quantity: toNumber(r.quantity) || 0,
      type: r.type || r.movement_type || null,
      dateKey: ts ? dateKey(ts) : null,
      movedAt: ts ? tsToIso(ts) : null,
    };
  });

  // kitchen_order_items (normalized line items per kitchen order)
  const kitchenOrderItems = (readCsv('kitchen_order_items.csv')?.rows || []).map((r) => {
    const ts = parseTs(r.created_at);
    return {
      kitchenOrderItemId: r.kitchen_order_item_id !== null && r.kitchen_order_item_id !== undefined ? String(r.kitchen_order_item_id) : null,
      orderId: r.order_id !== null && r.order_id !== undefined ? String(r.order_id) : null,
      saleId: r.sale_id !== null && r.sale_id !== undefined ? String(r.sale_id) : null,
      productId: r.product_id !== null && r.product_id !== undefined ? String(r.product_id) : null,
      productName: r.product_name || null,
      quantity: toNumber(r.quantity) || 0,
      unitPrice: toNumber(r.unit_price),
      lineTotal: toNumber(r.line_total),
      department: r.department || null,
      preparationTime: toNumber(r.preparation_time),
      dateKey: ts ? dateKey(ts) : null,
      createdAt: ts ? tsToIso(ts) : null,
    };
  });

  // z_reports (end-of-shift / end-of-day financial reports)
  const zReports = (readCsv('z_reports.csv')?.rows || []).map((r) => {
    const start = parseTs(r.period_start);
    return {
      zReportId: r.z_report_id !== null && r.z_report_id !== undefined ? String(r.z_report_id) : null,
      shiftId: r.shift_id !== null && r.shift_id !== undefined ? String(r.shift_id) : null,
      userId: r.user_id !== null && r.user_id !== undefined ? String(r.user_id) : null,
      userName: r.user_name || null,
      reportNumber: r.report_number || null,
      totalSales: toNumber(r.total_sales),
      totalRevenue: toNumber(r.total_revenue),
      totalTax: toNumber(r.total_tax),
      totalDiscounts: toNumber(r.total_discounts),
      cashSales: toNumber(r.cash_sales),
      cardSales: toNumber(r.card_sales),
      otherSales: toNumber(r.other_sales),
      refundCount: toNumber(r.refund_count) || 0,
      refundTotal: toNumber(r.refund_total) || 0,
      openingFloat: toNumber(r.opening_float),
      closingExpected: toNumber(r.closing_expected),
      closingActual: toNumber(r.closing_actual),
      difference: toNumber(r.difference),
      transactionCount: toNumber(r.transaction_count),
      itemsSold: toNumber(r.items_sold),
      dateKey: start ? dateKey(start) : null,
      periodStart: start ? tsToIso(start) : null,
      periodEnd: parseTs(r.period_end) ? tsToIso(parseTs(r.period_end)) : null,
    };
  });

  // cash_drawer_events (cash journal)
  const cashDrawerEvents = (readCsv('cash_drawer_events.csv')?.rows || []).map((r) => {
    const ts = parseTs(r.timestamp);
    return {
      eventId: r.event_id !== null && r.event_id !== undefined ? String(r.event_id) : null,
      userId: r.user_id !== null && r.user_id !== undefined ? String(r.user_id) : null,
      userName: r.user_name || null,
      action: r.action || null,
      reason: r.reason || null,
      amountExpected: toNumber(r.amount_expected),
      amountActual: toNumber(r.amount_actual),
      difference: toNumber(r.difference),
      dateKey: ts ? dateKey(ts) : null,
      timestamp: ts ? tsToIso(ts) : null,
    };
  });

  // suppliers
  const suppliers = (readCsv('suppliers.csv')?.rows || []).map((r) => ({
    supplierId: String(r.supplier_id),
    name: r.name || null,
    contact: r.contact || null,
    phone: r.phone || null,
    email: r.email || null,
  }));

  // services
  const services = (readCsv('services.csv')?.rows || []).map((r) => ({
    serviceId: String(r.service_id),
    name: r.name || null,
    description: r.description || null,
    price: toNumber(r.price),
    duration: toNumber(r.duration),
  }));

  // appointments
  const appointments = (readCsv('appointments.csv')?.rows || []).map((r) => {
    const ts = parseTs(r.appointment_date);
    return {
      appointmentId: r.appointment_id !== null && r.appointment_id !== undefined ? String(r.appointment_id) : null,
      customerName: r.customer_name || null,
      customerPhone: r.customer_phone || null,
      serviceId: r.service_id !== null && r.service_id !== undefined ? String(r.service_id) : null,
      status: r.status || null,
      duration: toNumber(r.duration),
      dateKey: ts ? dateKey(ts) : null,
      appointmentDate: ts ? tsToIso(ts) : null,
    };
  });

  const snapshot = {
    uploadId: upload.id,
    clientId: upload.clientId,
    businessType: upload.businessType || metadata.business_type || 'unknown',
    fileName: upload.fileName,
    fileHash: upload.fileHash,
    exportId: upload.id,
    warehouseSnapshot: { status: 'COMPLETED', exportId: upload.id },
    builtAt: new Date().toISOString(),
    metadata: {
      schemaVersion: metadata.schema_version ?? metadata.bi_schema_version ?? null,
      exportVersion: metadata.export_version ?? null,
      businessName: metadata.business_name ?? null,
      currency: metadata.currency ?? null,
      timezone: metadata.timezone ?? null,
      language: metadata.language ?? null,
      enabledModules,
      exportTimestamp: metadata.export_timestamp ?? null,
      totalRows: metadata.total_rows ?? null,
    },
    datasets: {
      sales,
      saleItems,
      customers,
      products,
      productFamilies,
      kitchenOrders,
      kitchenOrderItems,
      shifts,
      tables,
      reservations,
      stockMovements,
      suppliers,
      services,
      appointments,
      zReports,
      cashDrawerEvents,
    },
  };

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${upload.id}.json`), JSON.stringify(snapshot), 'utf8');
  const meta = readMeta();
  meta[upload.clientId] = { uploadId: upload.id, builtAt: snapshot.builtAt, fileName: upload.fileName };
  writeMeta(meta);
  LOG(`Cache built for upload=${upload.id} (sales=${sales.length} items=${saleItems.length} customers=${customers.length})`);
  return snapshot;
}

// ─── Public: ensure the cache is fresh for a client ────────────
async function ensureCache(clientId, force = false) {
  const upload = await latestUpload(clientId);
  if (!upload) return { uploadId: null, snapshot: null, reason: 'NO_COMPLETED_UPLOAD' };

  const meta = readMeta();
  const current = meta[clientId];

  if (!force && current && current.uploadId === upload.id && fs.existsSync(path.join(CACHE_DIR, `${upload.id}.json`))) {
    // fresh on disk
    return loadSnapshot(upload, current.uploadId);
  }

  return { uploadId: upload.id, snapshot: buildCache(upload), reason: 'BUILT' };
}

// Load a snapshot (memory LRU first, then disk; build if file missing)
function loadSnapshot(upload, uploadId) {
  const mem = memory.get(upload.clientId);
  if (mem && mem.uploadId === uploadId && mem.snapshot) return { uploadId, snapshot: mem.snapshot, reason: 'MEMORY' };

  const file = path.join(CACHE_DIR, `${uploadId}.json`);
  if (fs.existsSync(file)) {
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    memory.set(upload.clientId, { uploadId, snapshot });
    if (memory.size > MEMORY_MAX) {
      const first = memory.keys().next().value;
      memory.delete(first);
    }
    return { uploadId, snapshot, reason: 'DISK' };
  }
  return { uploadId, snapshot: buildCache(upload), reason: 'BUILT' };
}

// ─── Public: get the enrichment snapshot for a client ──────────
async function getSnapshot(clientId, force = false) {
  const result = await ensureCache(clientId, force);
  return { snapshot: result.snapshot, reason: result.reason };
}

// ─── Public: refresh (admin-triggered rebuild) ─────────────────
async function refresh(clientId) {
  return ensureCache(clientId, true);
}

module.exports = {
  latestUpload,
  ensureCache,
  getSnapshot,
  refresh,
  buildCache,
  parseCsv,
  parseTs,
  dateKey,
  tsToIso,
  dimToDateKey,
  dateKeyToDim,
  CACHE_DIR,
  META_FILE,
};
