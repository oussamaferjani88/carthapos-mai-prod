const {
  isEmpty,
  normalizeText,
  normalizeCategorical,
  parseNumber,
  parseInteger,
  parseTableNumber,
  knownServiceLocation,
  parseDate,
  normalizeEnum,
  formatNumber,
} = require('./bi-data-utils');

const CHECK_REASONS = {
  NEGATIVE_TOTAL: 'Negative sale total',
  NEGATIVE_STOCK: 'Negative stock',
  NEGATIVE_PRICE: 'Negative product price',
  INVALID_QUANTITY: 'Quantity must be greater than zero',
};

const MISSING_REASON = (col) => `Missing required column ${col}`;
const INVALID_NUMBER_REASON = (col) => `Column ${col} is not a valid number`;
const INVALID_DATE_REASON = (col) => `Column ${col} is not a valid date`;
const UNKNOWN_VALUE_REASON = (col, val) => `Column ${col} value "${val}" is not a known ${col}`;

// Reconciliation tolerances: absolute cents and a small relative allowance.
const RECON_ABS_TOLERANCE = 0.01;
const RECON_REL_TOLERANCE = 0.005;

const DATASET_RULES = {
  sales: {
    required: ['sale_id', 'total', 'created_at'],
    integer: ['sale_id', 'customer_id', 'table_id', 'user_id', 'shift_id'],
    numeric: ['total', 'subtotal', 'tax', 'discount'],
    date: ['created_at'],
    text: ['customer_name', 'customer_email', 'notes', 'receipt_number'],
    categorical: ['payment_method', 'status', 'kitchen_status'],
    enums: { payment_method: 'payment_method', status: 'sale_status', kitchen_status: 'kitchen_status' },
    optionalDefaults: { tax: 0, discount: 0 },
    unknownDefaults: {},
    businessKey: 'sale_id',
    checks: [
      { column: 'total', test: (v) => typeof v === 'number' && v < 0, code: 'NEGATIVE_TOTAL', severity: 'WARN' },
    ],
  },
  products: {
    required: ['product_id'],
    integer: ['product_id', 'stock', 'manage_stock', 'vat_rate_id'],
    numeric: ['price', 'cost_price'],
    date: ['created_at', 'updated_at'],
    text: ['name', 'barcode', 'description', 'unit', 'supplier'],
    categorical: ['category', 'family'],
    enums: {},
    optionalDefaults: {},
    unknownDefaults: { name: 'Unknown Product', category: 'Unknown Category' },
    businessKey: 'product_id',
    checks: [
      { column: 'stock', test: (v) => typeof v === 'number' && v < 0, code: 'NEGATIVE_STOCK', severity: 'WARN' },
      { column: 'price', test: (v) => typeof v === 'number' && v < 0, code: 'NEGATIVE_PRICE', severity: 'WARN' },
    ],
  },
  customers: {
    required: ['customer_id'],
    integer: ['customer_id', 'loyalty_points', 'visit_count', 'is_active'],
    numeric: ['total_spent'],
    date: ['created_at', 'updated_at', 'last_visit_date'],
    text: ['name', 'email', 'phone', 'address', 'tags'],
    categorical: [],
    enums: {},
    optionalDefaults: {},
    unknownDefaults: { name: 'Unknown Customer' },
    businessKey: 'customer_id',
    checks: [],
  },
  inventory: {
    required: ['product_id'],
    integer: ['product_id', 'stock', 'min_stock', 'times_sold', 'needs_reorder', 'manage_stock'],
    numeric: ['price', 'cost_price', 'inventory_value'],
    date: [],
    text: ['product_name', 'unit', 'supplier'],
    categorical: ['category', 'family'],
    enums: {},
    optionalDefaults: {},
    unknownDefaults: { product_name: 'Unknown Product', category: 'Unknown Category' },
    businessKey: 'product_id',
    checks: [
      { column: 'stock', test: (v) => typeof v === 'number' && v < 0, code: 'NEGATIVE_STOCK', severity: 'WARN' },
    ],
  },
  kitchen_orders: {
    required: ['order_id'],
    integer: ['order_id', 'sale_id', 'table_number'],
    numeric: ['total', 'estimated_minutes'],
    date: ['created_at', 'updated_at', 'started_at', 'ready_at', 'served_at', 'completed_at'],
    text: ['items', 'notes', 'cancel_reason', 'cancelled_by', 'server_name', 'customer_name', 'table_number'],
    categorical: ['priority', 'status', 'department'],
    enums: { priority: 'priority', status: 'kitchen_status' },
    optionalDefaults: {},
    unknownDefaults: {},
    businessKey: 'order_id',
    checks: [],
  },
  sale_items: {
    required: ['sale_id', 'product_id', 'quantity'],
    integer: ['sale_item_id', 'sale_id', 'product_id', 'quantity'],
    numeric: ['unit_price', 'line_total', 'vat_rate', 'vat_amount'],
    date: ['sale_date'],
    text: ['product_name'],
    categorical: ['payment_method', 'category', 'family'],
    enums: { payment_method: 'payment_method' },
    optionalDefaults: {},
    unknownDefaults: { product_name: 'Unknown Product', category: 'Unknown Category' },
    businessKey: 'sale_item_id',
    checks: [
      { column: 'quantity', test: (v) => typeof v === 'number' && v <= 0, code: 'INVALID_QUANTITY', severity: 'ERROR' },
    ],
  },
  kitchen_order_items: {
    required: ['kitchen_order_item_id', 'order_id'],
    integer: ['kitchen_order_item_id', 'order_id', 'sale_id', 'product_id', 'quantity', 'preparation_time'],
    numeric: ['unit_price', 'line_total'],
    date: ['created_at'],
    text: ['product_name'],
    categorical: ['department'],
    enums: {},
    optionalDefaults: {},
    unknownDefaults: { product_name: 'Unknown Product' },
    businessKey: 'kitchen_order_item_id',
    checks: [
      { column: 'quantity', test: (v) => typeof v === 'number' && v <= 0, code: 'INVALID_QUANTITY', severity: 'WARN' },
    ],
  },
  appointments: {
    required: ['appointment_id', 'appointment_date'],
    integer: ['appointment_id', 'service_id'],
    numeric: [],
    date: ['appointment_date', 'created_at'],
    text: ['customer_name', 'customer_phone', 'notes'],
    categorical: ['status'],
    enums: { status: 'appointment_status' },
    optionalDefaults: {},
    unknownDefaults: { customer_name: 'Unknown Customer' },
    businessKey: 'appointment_id',
    checks: [],
  },
  suppliers: {
    required: ['supplier_id'],
    integer: ['supplier_id'],
    numeric: [],
    date: ['created_at'],
    text: ['name', 'contact', 'phone', 'email', 'address', 'notes'],
    categorical: [],
    enums: {},
    optionalDefaults: {},
    unknownDefaults: { name: 'Unknown Supplier' },
    businessKey: 'supplier_id',
    checks: [],
  },
  tables: {
    required: ['table_id'],
    integer: ['table_id', 'table_number', 'capacity'],
    numeric: [],
    date: ['created_at', 'dining_started_at'],
    text: ['waiter', 'notes'],
    categorical: ['status', 'zone', 'area_name'],
    enums: { status: 'table_status' },
    optionalDefaults: {},
    unknownDefaults: {},
    businessKey: 'table_id',
    checks: [],
  },
  table_reservations: {
    required: ['reservation_id'],
    integer: ['reservation_id', 'table_id', 'table_number', 'guests', 'duration_minutes'],
    numeric: [],
    date: ['reservation_date', 'created_at'],
    text: ['customer_name', 'customer_phone', 'notes', 'reservation_time'],
    categorical: ['status'],
    enums: { status: 'appointment_status' },
    optionalDefaults: {},
    unknownDefaults: {},
    businessKey: 'reservation_id',
    checks: [],
  },
  services: {
    required: ['service_id'],
    integer: ['service_id', 'duration'],
    numeric: ['price'],
    date: ['created_at'],
    text: ['name', 'description'],
    categorical: [],
    enums: {},
    optionalDefaults: {},
    unknownDefaults: {},
    businessKey: 'service_id',
    checks: [],
  },
};

const EMPTY_RULES = {
  required: [],
  integer: [],
  numeric: [],
  date: [],
  text: [],
  categorical: [],
  enums: {},
  optionalDefaults: {},
  unknownDefaults: {},
  businessKey: null,
  checks: [],
};

function makeChange(dataset, rowIndex, column, originalValue, preparedValue, action, code, reason, severity) {
  return { dataset, rowIndex, column, originalValue, preparedValue, action, code, reason, severity };
}

function isLoadedColumn(rules, column) {
  return rules.integer.includes(column) || rules.numeric.includes(column) || rules.date.includes(column);
}

/**
 * Data-quality profile per dataset. Informational only.
 */
function newProfile(dataset, sourceRows) {
  return {
    dataset,
    sourceRows,
    rowCount: 0,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    duplicateBusinessKeys: [],
    missingValues: 0,
    nullCount: 0,
    distinctCount: 0,
    numericStats: {},
    warnings: 0,
    errors: 0,
  };
}

function computeNumericStats(preparedRows, rules, profile) {
  const cols = [...rules.numeric, ...rules.integer];
  for (const col of cols) {
    const vals = [];
    for (const r of preparedRows) {
      const v = r[col];
      if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
    }
    if (vals.length === 0) continue;
    let min = vals[0], max = vals[0], sum = 0;
    for (const v of vals) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    profile.numericStats[col] = { min, max, avg: sum / vals.length };
  }
}

/**
 * Cross-dataset revenue reconciliation. Report-only: never modifies data.
 */
function runReconciliation(preparedDatasets, changes) {
  const sales = preparedDatasets.sales || [];
  const items = preparedDatasets.sale_items || [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.sale_id == null || typeof it.line_total !== 'number' || typeof it.quantity !== 'number' || typeof it.unit_price !== 'number') continue;
    const expected = it.quantity * it.unit_price;
    const tol = Math.max(RECON_ABS_TOLERANCE, Math.abs(it.line_total) * RECON_REL_TOLERANCE);
    if (Math.abs(it.line_total - expected) > tol) {
      changes.push(makeChange(
        'sale_items', i, 'line_total', null, null, 'NEEDS_REVIEW', 'RECONCILIATION_LINE_TOTAL',
        `Line total mismatch sale_id=${it.sale_id}: expected ${formatNumber(expected)}, actual ${formatNumber(it.line_total)}, difference ${formatNumber(it.line_total - expected)}`,
        'WARN'
      ));
    }
  }

  const bySale = new Map();
  for (const it of items) {
    if (it.sale_id == null) continue;
    const acc = bySale.get(String(it.sale_id)) || { line: 0, vat: 0 };
    if (typeof it.line_total === 'number') acc.line += it.line_total;
    if (typeof it.vat_amount === 'number') acc.vat += it.vat_amount;
    bySale.set(String(it.sale_id), acc);
  }

  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    if (s.sale_id == null || typeof s.total !== 'number') continue;
    let expected;
    if (typeof s.subtotal === 'number') {
      expected = s.subtotal + (typeof s.tax === 'number' ? s.tax : 0) - (typeof s.discount === 'number' ? s.discount : 0);
    } else {
      const acc = bySale.get(String(s.sale_id));
      const lineSum = acc ? acc.line : 0;
      const vatSum = acc ? acc.vat : 0;
      expected = lineSum + vatSum - (typeof s.discount === 'number' ? s.discount : 0);
    }
    const tol = Math.max(RECON_ABS_TOLERANCE, Math.abs(s.total) * RECON_REL_TOLERANCE);
    if (Math.abs(expected - s.total) > tol) {
      changes.push(makeChange(
        'sales', i, 'total', null, null, 'NEEDS_REVIEW', 'RECONCILIATION_SALE_TOTAL',
        `Sale total mismatch sale_id=${s.sale_id}: expected ${formatNumber(expected)}, actual ${formatNumber(s.total)}, difference ${formatNumber(s.total - expected)}`,
        'WARN'
      ));
    }
  }

  if (items.length > 0 && sales.length > 0) {
    let itemTotal = 0, vatTotal = 0, saleTotal = 0, discountTotal = 0;
    for (const it of items) {
      if (typeof it.line_total === 'number') itemTotal += it.line_total;
      if (typeof it.vat_amount === 'number') vatTotal += it.vat_amount;
    }
    for (const s of sales) {
      if (typeof s.total === 'number') saleTotal += s.total;
      if (typeof s.discount === 'number') discountTotal += s.discount;
    }
    // line_total excludes discounts while sale.total subtracts them, so the
    // item grain must subtract the total discount to be comparable.
    const expectedGlobal = itemTotal + vatTotal - discountTotal;
    const tol = Math.max(RECON_ABS_TOLERANCE, Math.abs(saleTotal) * RECON_REL_TOLERANCE);
    if (Math.abs(expectedGlobal - saleTotal) > tol) {
      changes.push(makeChange(
        'sales', null, 'total', null, null, 'NEEDS_REVIEW', 'RECONCILIATION_GLOBAL',
        `Global revenue mismatch: item grain ${formatNumber(itemTotal)} + vat ${formatNumber(vatTotal)} - discounts ${formatNumber(discountTotal)} = ${formatNumber(expectedGlobal)} vs sales grain ${formatNumber(saleTotal)}, difference ${formatNumber(saleTotal - expectedGlobal)}`,
        'WARN'
      ));
    }
    changes.push(makeChange(
      'sales', null, 'total', null, null, 'REPORT', 'RECONCILIATION_GRAIN',
      `Grain gap: sum(line_total)=${formatNumber(itemTotal)}, sum(vat_amount)=${formatNumber(vatTotal)}, discounts=${formatNumber(discountTotal)}, sales grain=${formatNumber(saleTotal)}`,
      'INFO'
    ));
  }
}

function prepare(input) {
  const preparedDatasets = {};
  const changes = [];
  const statistics = { totalRowsProcessed: 0, automaticFixes: 0, warnings: 0, errors: 0, duplicatesRemoved: 0 };
  const profiles = {};

  const source = (input && input.datasets) || {};
  for (const [dataset, rows] of Object.entries(source)) {
    if (!Array.isArray(rows)) {
      preparedDatasets[dataset] = [];
      continue;
    }

    statistics.totalRowsProcessed += rows.length;
    const rules = DATASET_RULES[dataset] || EMPTY_RULES;
    const preparedRows = [];
    const seen = new Set();
    const bizSeen = new Map();
    const profile = newProfile(dataset, rows.length);

    for (const original of rows) {
      if (!original || typeof original !== 'object') continue;

      const fingerprint = JSON.stringify(original);
      if (seen.has(fingerprint)) {
        statistics.duplicatesRemoved += 1;
        profile.duplicateRows += 1;
        changes.push(makeChange(dataset, null, null, null, null, 'REMOVED', 'DUPLICATE_REMOVED', 'Duplicate row removed', 'INFO'));
        continue;
      }
      seen.add(fingerprint);

      const prepared = {};
      const rowChanges = [];
      let nonTableServiceType = null;
      let rowHasError = false;

      for (const column of Object.keys(original)) {
        const value = original[column];
        prepared[column] = value;

        if (isEmpty(value)) {
          if (rules.optionalDefaults && column in rules.optionalDefaults) {
            prepared[column] = rules.optionalDefaults[column];
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, prepared[column], 'AUTO_FIXED', 'AUTO_FIXED', 'Missing optional value', 'INFO'));
          } else if (rules.unknownDefaults && column in rules.unknownDefaults) {
            prepared[column] = rules.unknownDefaults[column];
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, prepared[column], 'AUTO_FIXED', 'AUTO_FIXED', 'Missing optional value', 'INFO'));
          } else if (rules.required.includes(column)) {
            prepared[column] = null;
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, null, 'NEEDS_REVIEW', `MISSING_REQUIRED_${column.toUpperCase()}`, MISSING_REASON(column), 'ERROR'));
          } else if (isLoadedColumn(rules, column)) {
            prepared[column] = null;
          } else {
            profile.missingValues += 1;
          }
          continue;
        }

        if (rules.integer.includes(column)) {
          const parsed = column === 'table_number' ? parseTableNumber(value) : parseInteger(value);
          if (parsed.invalid) {
            prepared[column] = null;
            const location = column === 'table_number' ? knownServiceLocation(value) : null;
            if (location) {
              nonTableServiceType = location;
              rowChanges.push(makeChange(dataset, preparedRows.length, column, value, null, 'REPORT', 'COUNTER_ORDER', 'Known non-table service location. table_number intentionally left NULL.', 'INFO'));
            } else {
              rowChanges.push(makeChange(dataset, preparedRows.length, column, value, null, 'NEEDS_REVIEW', `INVALID_NUMBER_${column.toUpperCase()}`, INVALID_NUMBER_REASON(column), 'ERROR'));
            }
          } else {
            prepared[column] = parsed.value;
            if (parsed.changed) {
              rowChanges.push(makeChange(dataset, preparedRows.length, column, value, parsed.value, 'AUTO_FIXED', parsed.extracted ? 'AUTO_EXTRACTED_NUMBER' : 'AUTO_FIXED', parsed.extracted ? 'Extracted numeric table identifier' : 'Number normalized', 'INFO'));
            }
          }
        } else if (rules.numeric.includes(column)) {
          const parsed = parseNumber(value);
          if (parsed.invalid) {
            prepared[column] = null;
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, null, 'NEEDS_REVIEW', `INVALID_NUMBER_${column.toUpperCase()}`, INVALID_NUMBER_REASON(column), 'ERROR'));
          } else {
            prepared[column] = parsed.value;
            if (parsed.changed) {
              rowChanges.push(makeChange(dataset, preparedRows.length, column, value, parsed.value, 'AUTO_FIXED', 'AUTO_FIXED', 'Number normalized', 'INFO'));
            }
          }
        } else if (rules.date.includes(column)) {
          const parsed = parseDate(value);
          if (parsed.invalid) {
            prepared[column] = null;
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, null, 'NEEDS_REVIEW', `INVALID_DATE_${column.toUpperCase()}`, INVALID_DATE_REASON(column), 'ERROR'));
          } else {
            prepared[column] = parsed.value;
          }
        } else if (rules.categorical.includes(column)) {
          const domain = rules.enums && rules.enums[column];
          const norm = normalizeEnum(value, domain);
          if (norm.value !== value) {
            prepared[column] = norm.value;
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, norm.value, 'AUTO_FIXED', 'AUTO_FIXED', 'Categorical normalization', 'INFO'));
          } else {
            prepared[column] = norm.value;
          }
          if (domain && !norm.known) {
            rowChanges.push(makeChange(dataset, preparedRows.length, column, norm.value, norm.value, 'NEEDS_REVIEW', 'UNKNOWN_CATEGORICAL_VALUE', UNKNOWN_VALUE_REASON(column, norm.value), 'WARN'));
          }
        } else if (rules.text.includes(column)) {
          const normalized = normalizeText(value);
          if (normalized !== value) {
            prepared[column] = normalized;
            rowChanges.push(makeChange(dataset, preparedRows.length, column, value, normalized, 'AUTO_FIXED', 'AUTO_FIXED', 'Text normalization', 'INFO'));
          }
        }
      }

      if (nonTableServiceType) {
        const serviceField = ['service_type', 'order_type', 'fulfillment_type'].find((f) => f in prepared);
        if (serviceField && (prepared[serviceField] === null || prepared[serviceField] === undefined || prepared[serviceField] === '')) {
          prepared[serviceField] = nonTableServiceType;
        }
      }

      if (rules.businessKey) {
        const kv = prepared[rules.businessKey] == null ? 'NULL' : String(prepared[rules.businessKey]);
        bizSeen.set(kv, (bizSeen.get(kv) || 0) + 1);
      }

      for (const check of rules.checks) {
        if (check.test(prepared[check.column])) {
          rowChanges.push(makeChange(dataset, preparedRows.length, check.column, original[check.column], prepared[check.column], 'NEEDS_REVIEW', check.code, CHECK_REASONS[check.code] || check.code, check.severity));
        }
      }

      for (const c of rowChanges) {
        if (c.severity === 'ERROR') rowHasError = true;
      }
      if (rowHasError) profile.invalidRows += 1;
      else profile.validRows += 1;

      preparedRows.push(prepared);
      changes.push(...rowChanges);
    }

    if (rules.businessKey) {
      profile.distinctCount = bizSeen.size;
      for (const [kv, count] of bizSeen) {
        if (count > 1) {
          profile.duplicateBusinessKeys.push({ key: kv, occurrences: count });
          changes.push(makeChange(
            dataset, null, rules.businessKey, null, null, 'NEEDS_REVIEW', 'DUPLICATE_BUSINESS_KEY',
            `Duplicate business key ${rules.businessKey}=${kv} (${count} occurrences)`, 'WARN'
          ));
        }
      }
    }

    for (const row of preparedRows) {
      for (const col of Object.keys(row)) {
        if (row[col] == null) profile.nullCount += 1;
      }
    }
    computeNumericStats(preparedRows, rules, profile);

    profile.rowCount = preparedRows.length;
    profile.warnings = changes.filter((c) => c.dataset === dataset && c.severity === 'WARN').length;
    profile.errors = changes.filter((c) => c.dataset === dataset && c.severity === 'ERROR').length;
    preparedDatasets[dataset] = preparedRows;
    profiles[dataset] = profile;
  }

  runReconciliation(preparedDatasets, changes);

  statistics.automaticFixes = changes.filter((c) => c.severity === 'INFO' && c.action === 'AUTO_FIXED').length;
  statistics.warnings = changes.filter((c) => c.severity === 'WARN').length;
  statistics.errors = changes.filter((c) => c.severity === 'ERROR').length;

  return {
    preparedDatasets,
    changes,
    statistics,
    profiles,
    status: statistics.errors === 0 ? 'READY_FOR_REVIEW' : 'NEEDS_CORRECTION',
  };
}

module.exports = { prepare, DATASET_RULES };
