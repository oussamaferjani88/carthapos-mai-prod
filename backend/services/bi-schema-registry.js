/**
 * BI Schema Registry (Server-Side)
 *
 * Mirrors the POS-side BiSchemaContract for server-side ETL validation.
 * This is the single source of truth for expected CSV columns on the backend.
 * Version must match pos-template/src/electron/bi/BiSchemaContract.cjs.
 */

const BI_SCHEMA_VERSION = '1.0.0';

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
const OPTIONAL_DATASETS = ['tables', 'kitchen_orders', 'suppliers', 'services', 'appointments'];
const ALL_DATASETS = [...REQUIRED_DATASETS, ...OPTIONAL_DATASETS];

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
        if (!/^-?\d+$/.test(val) && !/\d+/.test(val)) {
          errors.push(`"${col.name}" expected integer, got "${val}"`);
        }
        break;
      }
      case 'real': {
        if (!/^-?\d+(\.\d+)?$/.test(val)) {
          errors.push(`"${col.name}" expected number, got "${val}"`);
        }
        break;
      }
      case 'datetime': {
        const ts = Date.parse(val);
        if (isNaN(ts)) {
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
};
