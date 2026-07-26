/**
 * BI Schema Contract
 *
 * Defines the canonical column schemas for every export dataset.
 * The schema version MUST be incremented whenever a column is added, removed, or renamed.
 *
 * Each schema entry describes:
 *   - column name (canonical)
 *   - type hint (for ETL consumption)
 *   - required (true = must always have a value; false = may be null)
 *   - description (human-readable)
 */

const BI_SCHEMA_VERSION = '1.0.0';

const SCHEMAS = {

  sales: {
    columns: [
      { name: 'sale_id',        type: 'integer',  required: true,  description: 'Unique sale identifier' },
      { name: 'total',          type: 'real',     required: true,  description: 'Sale total amount' },
      { name: 'tax',            type: 'real',     required: false, description: 'Tax amount' },
      { name: 'discount',       type: 'real',     required: false, description: 'Discount amount' },
      { name: 'payment_method', type: 'text',     required: false, description: 'Payment method (cash/card/mobile/…)' },
      { name: 'customer_id',    type: 'integer',  required: false, description: 'FK to customers' },
      { name: 'table_id',       type: 'integer',  required: false, description: 'FK to restaurant_tables' },
      { name: 'customer_name',  type: 'text',     required: false, description: 'Customer display name (denormalized)' },
      { name: 'customer_email', type: 'text',     required: false, description: 'Customer email (denormalized)' },
      { name: 'created_at',     type: 'datetime', required: true,  description: 'Sale timestamp (ISO 8601)' },
    ],
    order: 'sale_id',
  },

  products: {
    columns: [
      { name: 'product_id',   type: 'integer',  required: true,  description: 'Unique product identifier' },
      { name: 'name',         type: 'text',     required: true,  description: 'Product name' },
      { name: 'price',        type: 'real',     required: true,  description: 'Unit price' },
      { name: 'category',     type: 'text',     required: false, description: 'Product category' },
      { name: 'family',       type: 'text',     required: false, description: 'Product family / group' },
      { name: 'barcode',      type: 'text',     required: false, description: 'EAN-13 barcode' },
      { name: 'stock',        type: 'integer',  required: false, description: 'Current stock quantity' },
      { name: 'description',  type: 'text',     required: false, description: 'Product description' },
      { name: 'image',        type: 'text',     required: false, description: 'Image URL / path' },
      { name: 'created_at',   type: 'datetime', required: false, description: 'Product creation timestamp' },
      { name: 'updated_at',   type: 'datetime', required: false, description: 'Last update timestamp' },
    ],
    order: 'product_id',
  },

  customers: {
    columns: [
      { name: 'customer_id', type: 'integer',  required: true,  description: 'Unique customer identifier' },
      { name: 'name',        type: 'text',     required: true,  description: 'Customer full name' },
      { name: 'email',       type: 'text',     required: false, description: 'Email address' },
      { name: 'phone',       type: 'text',     required: false, description: 'Phone number' },
      { name: 'address',     type: 'text',     required: false, description: 'Physical address' },
      { name: 'created_at',  type: 'datetime', required: false, description: 'Customer creation timestamp' },
    ],
    order: 'customer_id',
  },

  inventory: {
    columns: [
      { name: 'product_id',   type: 'integer', required: true,  description: 'FK to products' },
      { name: 'product_name', type: 'text',    required: true,  description: 'Product name (denormalized)' },
      { name: 'stock',        type: 'integer', required: false, description: 'Current stock quantity' },
      { name: 'category',     type: 'text',    required: false, description: 'Product category' },
      { name: 'family',       type: 'text',    required: false, description: 'Product family' },
      { name: 'price',        type: 'real',    required: false, description: 'Unit price' },
      { name: 'times_sold',   type: 'integer', required: false, description: 'Total times this product has been sold' },
    ],
    order: 'product_id',
  },

  tables: {
    columns: [
      { name: 'table_id',     type: 'integer',  required: true,  description: 'Unique table identifier' },
      { name: 'table_number', type: 'integer',  required: true,  description: 'Table display number' },
      { name: 'capacity',     type: 'integer',  required: false, description: 'Number of seats' },
      { name: 'status',       type: 'text',     required: false, description: 'Current status (available/occupied/reserved)' },
      { name: 'created_at',   type: 'datetime', required: false, description: 'Table creation timestamp' },
    ],
    order: 'table_id',
  },

  kitchen_orders: {
    columns: [
      { name: 'order_id',          type: 'integer',  required: true,  description: 'Unique kitchen order identifier' },
      { name: 'table_number',      type: 'text',     required: false, description: 'Source table number' },
      { name: 'items',             type: 'text',     required: false, description: 'Order items (JSON array)' },
      { name: 'notes',             type: 'text',     required: false, description: 'Special instructions' },
      { name: 'priority',          type: 'text',     required: false, description: 'Priority level (low/normal/high/urgent)' },
      { name: 'status',            type: 'text',     required: false, description: 'Order status (pending/preparing/ready/served/completed/cancelled)' },
      { name: 'sale_id',           type: 'integer',  required: false, description: 'FK to sales table' },
      { name: 'total',             type: 'real',     required: false, description: 'Order total (server-calculated)' },
      { name: 'server_name',       type: 'text',     required: false, description: 'Server/waiter name' },
      { name: 'customer_name',     type: 'text',     required: false, description: 'Customer name' },
      { name: 'department',        type: 'text',     required: false, description: 'Kitchen department (Cuisine/Bar/Grill/etc.)' },
      { name: 'estimated_minutes', type: 'integer',  required: false, description: 'Estimated preparation time in minutes' },
      { name: 'started_at',        type: 'datetime', required: false, description: 'Timestamp when preparation started' },
      { name: 'ready_at',          type: 'datetime', required: false, description: 'Timestamp when order was marked ready' },
      { name: 'served_at',         type: 'datetime', required: false, description: 'Timestamp when order was served' },
      { name: 'completed_at',      type: 'datetime', required: false, description: 'Timestamp when order was completed/cancelled' },
      { name: 'cancel_reason',     type: 'text',     required: false, description: 'Reason for cancellation' },
      { name: 'cancelled_by',      type: 'text',     required: false, description: 'User who cancelled the order' },
      { name: 'created_at',        type: 'datetime', required: false, description: 'Order creation timestamp' },
      { name: 'updated_at',        type: 'datetime', required: false, description: 'Last update timestamp' },
    ],
    order: 'order_id',
  },

  suppliers: {
    columns: [
      { name: 'supplier_id', type: 'integer',  required: true,  description: 'Unique supplier identifier' },
      { name: 'name',        type: 'text',     required: true,  description: 'Supplier name' },
      { name: 'contact',     type: 'text',     required: false, description: 'Contact person' },
      { name: 'phone',       type: 'text',     required: false, description: 'Phone number' },
      { name: 'email',       type: 'text',     required: false, description: 'Email address' },
      { name: 'address',     type: 'text',     required: false, description: 'Business address' },
      { name: 'created_at',  type: 'datetime', required: false, description: 'Supplier creation timestamp' },
    ],
    order: 'supplier_id',
  },

  services: {
    columns: [
      { name: 'service_id',  type: 'integer',  required: true,  description: 'Unique service identifier' },
      { name: 'name',        type: 'text',     required: true,  description: 'Service name' },
      { name: 'description', type: 'text',     required: false, description: 'Service description' },
      { name: 'price',       type: 'real',     required: false, description: 'Service price' },
      { name: 'duration',    type: 'integer',  required: false, description: 'Duration in minutes' },
      { name: 'created_at',  type: 'datetime', required: false, description: 'Service creation timestamp' },
    ],
    order: 'service_id',
  },

  appointments: {
    columns: [
      { name: 'appointment_id',   type: 'integer',  required: true,  description: 'Unique appointment identifier' },
      { name: 'customer_name',    type: 'text',     required: true,  description: 'Customer name' },
      { name: 'customer_phone',   type: 'text',     required: false, description: 'Customer phone' },
      { name: 'service_id',       type: 'integer',  required: false, description: 'FK to services' },
      { name: 'appointment_date', type: 'datetime',  required: true,  description: 'Scheduled appointment datetime' },
      { name: 'notes',            type: 'text',     required: false, description: 'Appointment notes' },
      { name: 'status',           type: 'text',     required: false, description: 'Status (scheduled/completed/cancelled)' },
      { name: 'created_at',       type: 'datetime', required: false, description: 'Record creation timestamp' },
    ],
    order: 'appointment_id',
  },

};

/**
 * Return the canonical column names for a given dataset in declaration order.
 */
function getColumnNames(datasetKey) {
  const schema = SCHEMAS[datasetKey];
  if (!schema) return [];
  return schema.columns.map(c => c.name);
}

/**
 * Return column definitions for a dataset.
 */
function getSchema(datasetKey) {
  return SCHEMAS[datasetKey] || null;
}

/**
 * Return the header row for a CSV file derived from canonical column names.
 */
function getCsvHeader(datasetKey) {
  return getColumnNames(datasetKey).join(',') + '\n';
}

/**
 * Check whether an array of column names satisfies the "required" contract
 * for the given dataset.  Returns an array of missing-required-field messages.
 */
function validateSchema(datasetKey, actualColumns) {
  const schema = SCHEMAS[datasetKey];
  if (!schema) return [`Unknown dataset "${datasetKey}"`];

  const errors = [];
  const colSet = new Set(actualColumns.map(c => String(c).toLowerCase()));

  for (const col of schema.columns) {
    if (col.required && !colSet.has(col.name.toLowerCase())) {
      errors.push(`Missing required column "${col.name}" (${col.type}) in ${datasetKey}.csv`);
    }
  }
  return errors;
}

module.exports = {
  BI_SCHEMA_VERSION,
  SCHEMAS,
  getColumnNames,
  getSchema,
  getCsvHeader,
  validateSchema,
};
