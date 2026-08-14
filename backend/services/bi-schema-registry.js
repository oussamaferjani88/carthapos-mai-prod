/**
 * BI Schema Registry (Server-Side)
 *
 * Mirrors the POS-side BiSchemaContract for server-side ETL validation.
 * This is the single source of truth for expected CSV columns on the backend.
 * Version must match pos-template/src/electron/bi/BiSchemaContract.cjs.
 */

const { parseDate, parseInteger, parseNumber, parseTableNumber, knownServiceLocation } = require('./bi-data-utils');

const BI_SCHEMA_VERSION = '2.2.0';

const SCHEMAS = {
  sales: {
    columns: [
      { name: 'sale_id', type: 'integer', required: true },
      { name: 'total', type: 'real', required: true },
      { name: 'tax', type: 'real', required: false },
      { name: 'discount', type: 'real', required: false },
      { name: 'payment_method', type: 'text', required: false },
      { name: 'customer_id', type: 'integer', required: false },
      { name: 'table_id', type: 'integer', required: false },
      { name: 'customer_name', type: 'text', required: false },
      { name: 'customer_email', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: true },
    ],
  },
  products: {
    columns: [
      { name: 'product_id', type: 'integer', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'price', type: 'real', required: true },
      { name: 'category', type: 'text', required: false },
      { name: 'family', type: 'text', required: false },
      { name: 'barcode', type: 'text', required: false },
      { name: 'stock', type: 'integer', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'image', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: false },
      { name: 'updated_at', type: 'datetime', required: false },
    ],
  },
  customers: {
    columns: [
      { name: 'customer_id', type: 'integer', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: false },
    ],
  },
  inventory: {
    columns: [
      { name: 'product_id', type: 'integer', required: true },
      { name: 'product_name', type: 'text', required: true },
      { name: 'stock', type: 'integer', required: false },
      { name: 'category', type: 'text', required: false },
      { name: 'family', type: 'text', required: false },
      { name: 'price', type: 'real', required: false },
      { name: 'times_sold', type: 'integer', required: false },
    ],
  },
  tables: {
    columns: [
      { name: 'table_id', type: 'integer', required: true },
      { name: 'table_number', type: 'integer', required: true },
      { name: 'capacity', type: 'integer', required: false },
      { name: 'status', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: false },
    ],
  },
  kitchen_orders: {
    columns: [
      { name: 'order_id', type: 'integer', required: true },
      { name: 'table_number', type: 'integer', required: false },
      { name: 'items', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'priority', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: false },
      { name: 'updated_at', type: 'datetime', required: false },
    ],
  },
  sale_items: {
    columns: [
      { name: 'sale_item_id', type: 'integer', required: true },
      { name: 'sale_id', type: 'integer', required: true },
      { name: 'product_id', type: 'integer', required: true },
      { name: 'quantity', type: 'integer', required: true },
      { name: 'unit_price', type: 'real', required: true },
      { name: 'line_total', type: 'real', required: false },
      { name: 'vat_rate', type: 'real', required: false },
      { name: 'vat_amount', type: 'real', required: false },
      { name: 'payment_method', type: 'text', required: false },
      { name: 'product_name', type: 'text', required: false },
      { name: 'category', type: 'text', required: false },
      { name: 'family', type: 'text', required: false },
      { name: 'sale_date', type: 'datetime', required: true },
    ],
  },
  kitchen_order_items: {
    columns: [
      { name: 'kitchen_order_item_id', type: 'integer', required: true },
      { name: 'order_id', type: 'integer', required: true },
      { name: 'sale_id', type: 'integer', required: false },
      { name: 'product_id', type: 'integer', required: false },
      { name: 'product_name', type: 'text', required: false },
      { name: 'quantity', type: 'integer', required: false },
      { name: 'unit_price', type: 'real', required: false },
      { name: 'line_total', type: 'real', required: false },
      { name: 'department', type: 'text', required: false },
      { name: 'preparation_time', type: 'integer', required: false },
      { name: 'created_at', type: 'datetime', required: false },
    ],
  },
  suppliers: {
    columns: [
      { name: 'supplier_id', type: 'integer', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'contact', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'email', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: false },
    ],
  },
  services: {
    columns: [
      { name: 'service_id', type: 'integer', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text', required: false },
      { name: 'price', type: 'real', required: false },
      { name: 'duration', type: 'integer', required: false },
      { name: 'created_at', type: 'datetime', required: false },
    ],
  },
  appointments: {
    columns: [
      { name: 'appointment_id', type: 'integer', required: true },
      { name: 'customer_name', type: 'text', required: true },
      { name: 'customer_phone', type: 'text', required: false },
      { name: 'service_id', type: 'integer', required: false },
      { name: 'appointment_date', type: 'datetime', required: true },
      { name: 'notes', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
      { name: 'created_at', type: 'datetime', required: false },
    ],
  },
};

const REQUIRED_DATASETS = ['sales', 'products', 'customers', 'inventory'];
const OPTIONAL_DATASETS = ['tables', 'kitchen_orders', 'kitchen_order_items', 'suppliers', 'services', 'appointments', 'sale_items'];
const ALL_DATASETS = [...REQUIRED_DATASETS, ...OPTIONAL_DATASETS];

/**
 * Every dataset the POS export contract can produce (mirrors the POS-side
 * BiDatasetRegistry). Used to decide whether a file found in a ZIP is truly
 * unexpected or simply a known POS dataset that the server does not yet map.
 */
const KNOWN_POS_DATASETS = [
  ...ALL_DATASETS,
  'product_families',
  'kitchen_departments',
  'table_reservations',
  'stock_movements',
  'shifts',
  'cash_drawer_events',
  'audit_logs',
  'vat_rates',
  'z_reports',
];

/**
 * Applicability of each OPTIONAL dataset, mirroring the POS-side
 * BiDatasetRegistry: the module that must be enabled to produce it, and the
 * business types that export it. Used to decide whether a missing optional
 * dataset is "not exported" (INFO) or simply not part of this business config
 * (hidden).
 */
const DATASET_META = {
  tables: { module: 'tables', businessTypes: ['restaurant', 'cafe', 'hotel'] },
  kitchen_orders: { module: 'kitchen', businessTypes: ['restaurant', 'cafe', 'bakery'] },
  kitchen_order_items: { module: 'kitchen', businessTypes: ['restaurant', 'cafe', 'bakery'] },
  suppliers: {
    module: 'suppliers',
    businessTypes: ['retail', 'bakery', 'pharmacy', 'clothing', 'electronics', 'supermarket', 'restaurant', 'cafe'],
  },
  services: { module: null, businessTypes: ['salon', 'hotel', 'clinic'] },
  appointments: { module: null, businessTypes: ['salon', 'clinic', 'hotel'] },
  sale_items: { module: null, businessTypes: null },
};

/**
 * Whether a dataset is applicable to the given business configuration.
 * Falls back to "always applicable" when both the business type and the module
 * list are unknown, so legacy exports are never hidden by accident.
 */
function isDatasetApplicable(datasetKey, businessType, enabledModules) {
  const meta = DATASET_META[datasetKey];
  if (!meta) return true;
  if (Array.isArray(meta.businessTypes) && businessType) {
    const bt = String(businessType).toLowerCase();
    if (!meta.businessTypes.some((t) => bt === t.toLowerCase() || bt.startsWith(t.toLowerCase()))) {
      return false;
    }
  }
  if (meta.module && Array.isArray(enabledModules) && enabledModules.length > 0) {
    if (!enabledModules.includes(meta.module)) return false;
  }
  return true;
}

function getExpectedColumns(datasetKey) {
  const schema = SCHEMAS[datasetKey];
  if (!schema) return null;
  return schema.columns.map(c => c.name);
}

function validateCsvColumns(datasetKey, headerColumns) {
  const schema = SCHEMAS[datasetKey];
  if (!schema) return { valid: false, errors: [`Unknown dataset "${datasetKey}"`] };

  const errors = [];
  const headerSet = new Set(headerColumns.map(c => String(c).trim().toLowerCase()));

  for (const col of schema.columns) {
    if (col.required && !headerSet.has(col.name.toLowerCase())) {
      errors.push(`Missing required column "${col.name}" in ${datasetKey}.csv`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function parseCsvRow(header, line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());

  const row = {};
  header.forEach((col, i) => {
    let val = values[i] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/""/g, '"');
    }
    row[col.trim().toLowerCase()] = val || null;
  });
  return row;
}

/**
 * Strict type validation for a parsed CSV row.
 * Returns an array of error messages (empty = valid).
 */
function validateCsvTypes(datasetKey, row) {
  const schema = SCHEMAS[datasetKey];
  if (!schema) return [`Unknown dataset "${datasetKey}"`];

  const errors = [];

  for (const col of schema.columns) {
    const val = row[col.name.toLowerCase()];

    // Skip null/undefined — column existence is checked by validateCsvColumns
    if (val === null || val === undefined) {
      continue;
    }

    // Empty string: allowed for optional, error for required
    if (val === '') {
      if (col.required) {
        errors.push(`"${col.name}" is required but empty`);
      }
      continue;
    }

    // Type check
    switch (col.type) {
      case 'integer': {
        const parsed = col.name === 'table_number' ? parseTableNumber(val) : parseInteger(val);
        const serviceLocation = col.name === 'table_number' ? knownServiceLocation(val) : null;
        if (parsed.invalid && !serviceLocation) {
          errors.push(`"${col.name}" expected integer, got "${val}"`);
        }
        break;
      }
      case 'real': {
        const parsed = parseNumber(val);
        if (parsed.invalid) {
          errors.push(`"${col.name}" expected number, got "${val}"`);
        }
        break;
      }
      case 'datetime': {
        const parsed = parseDate(val);
        if (parsed.invalid) {
          errors.push(`"${col.name}" expected valid datetime, got "${val}"`);
        }
        break;
      }
      // 'text' — always valid
    }
  }

  return errors;
}

module.exports = {
  BI_SCHEMA_VERSION,
  SCHEMAS,
  REQUIRED_DATASETS,
  OPTIONAL_DATASETS,
  ALL_DATASETS,
  getExpectedColumns,
  validateCsvColumns,
  validateCsvTypes,
  parseCsvRow,
  isDatasetApplicable,
  DATASET_META,
  KNOWN_POS_DATASETS,
};
