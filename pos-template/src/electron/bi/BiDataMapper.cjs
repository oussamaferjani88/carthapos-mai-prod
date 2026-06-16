/**
 * BI Data Mapper
 *
 * Transforms raw database rows into normalized BI schema objects.
 *
 * This is the ONLY place where DB column names are mapped to BI column names.
 * If a DB column is renamed, only this file needs updating — the schema contract
 * (BiSchemaContract) and downstream ETL never change.
 */

const BiSchemaContract = require('./BiSchemaContract.cjs');

/**
 * Normalize a raw DB row into the BI schema for the given dataset.
 * Returns a plain object whose keys match the canonical column names exactly.
 * Unknown DB fields are silently dropped.  Missing fields are set to null.
 */
function mapRow(datasetKey, rawRow) {
  const schema = BiSchemaContract.getSchema(datasetKey);
  if (!schema) return null;

  const row = {};
  for (const col of schema.columns) {
    row[col.name] = rawRow[col.name] ?? rawRow[col.name.replace(/^[a-z]+_/, '')] ?? null;
  }
  return row;
}

/**
 * Map an array of raw DB rows to BI schema objects.
 */
function mapRows(datasetKey, rawRows) {
  return rawRows.map(row => mapRow(datasetKey, row));
}

/**
 * Specific mapper for sales: denormalize customer info, rename fields.
 */
function mapSaleRow(row) {
  return {
    sale_id:        row.id ?? null,
    total:          row.total ?? 0,
    tax:            row.tax ?? 0,
    discount:       row.discount ?? 0,
    payment_method: row.payment_method ?? null,
    customer_id:    row.customer_id ?? null,
    table_id:       row.table_id ?? null,
    customer_name:  row.customer_name ?? null,
    customer_email: row.customer_email ?? null,
    created_at:     row.created_at ?? null,
  };
}

function mapSalesRows(rows) {
  return rows.map(mapSaleRow);
}

/**
 * Specific mapper for products.
 */
function mapProductRow(row) {
  return {
    product_id:   row.id ?? null,
    name:         row.name ?? '',
    price:        row.price ?? 0,
    category:     row.category ?? null,
    family:       row.family ?? null,
    barcode:      row.barcode ?? null,
    stock:        row.stock ?? 0,
    description:  row.description ?? null,
    image:        row.image ?? null,
    created_at:   row.created_at ?? null,
    updated_at:   row.updated_at ?? null,
  };
}

function mapProductRows(rows) {
  return rows.map(mapProductRow);
}

/**
 * Specific mapper for customers.
 */
function mapCustomerRow(row) {
  return {
    customer_id: row.id ?? null,
    name:        row.name ?? '',
    email:       row.email ?? null,
    phone:       row.phone ?? null,
    address:     row.address ?? null,
    created_at:  row.created_at ?? null,
  };
}

function mapCustomerRows(rows) {
  return rows.map(mapCustomerRow);
}

/**
 * Specific mapper for inventory (aggregated from products).
 */
function mapInventoryRow(row) {
  return {
    product_id:   row.product_id ?? row.id ?? null,
    product_name: row.product_name ?? row.name ?? '',
    stock:        row.stock ?? 0,
    category:     row.category ?? null,
    family:       row.family ?? null,
    price:        row.price ?? 0,
    times_sold:   row.times_sold ?? 0,
  };
}

function mapInventoryRows(rows) {
  return rows.map(mapInventoryRow);
}

/**
 * Specific mapper for restaurant tables.
 */
function mapTableRow(row) {
  return {
    table_id:     row.id ?? null,
    table_number: row.table_number ?? 0,
    capacity:     row.capacity ?? null,
    status:       row.status ?? 'available',
    created_at:   row.created_at ?? null,
  };
}

function mapTableRows(rows) {
  return rows.map(mapTableRow);
}

/**
 * Specific mapper for kitchen orders.
 */
function mapKitchenOrderRow(row) {
  return {
    order_id:     row.id ?? null,
    table_number: row.table_number ?? null,
    items:        row.items ?? null,
    notes:        row.notes ?? null,
    priority:     row.priority ?? 'normal',
    status:       row.status ?? 'pending',
    created_at:   row.created_at ?? null,
    updated_at:   row.updated_at ?? null,
  };
}

function mapKitchenOrderRows(rows) {
  return rows.map(mapKitchenOrderRow);
}

/**
 * Specific mapper for suppliers.
 */
function mapSupplierRow(row) {
  return {
    supplier_id: row.id ?? null,
    name:        row.name ?? '',
    contact:     row.contact ?? null,
    phone:       row.phone ?? null,
    email:       row.email ?? null,
    address:     row.address ?? null,
    created_at:  row.created_at ?? null,
  };
}

function mapSupplierRows(rows) {
  return rows.map(mapSupplierRow);
}

/**
 * Specific mapper for services.
 */
function mapServiceRow(row) {
  return {
    service_id:  row.id ?? null,
    name:        row.name ?? '',
    description: row.description ?? null,
    price:       row.price ?? 0,
    duration:    row.duration ?? null,
    created_at:  row.created_at ?? null,
  };
}

function mapServiceRows(rows) {
  return rows.map(mapServiceRow);
}

/**
 * Specific mapper for appointments.
 */
function mapAppointmentRow(row) {
  return {
    appointment_id:   row.id ?? null,
    customer_name:    row.customer_name ?? '',
    customer_phone:   row.customer_phone ?? null,
    service_id:       row.service_id ?? null,
    appointment_date: row.appointment_date ?? null,
    notes:            row.notes ?? null,
    status:           row.status ?? 'scheduled',
    created_at:       row.created_at ?? null,
  };
}

function mapAppointmentRows(rows) {
  return rows.map(mapAppointmentRow);
}

module.exports = {
  mapRow,
  mapRows,
  mapSaleRow,
  mapSalesRows,
  mapProductRow,
  mapProductRows,
  mapCustomerRow,
  mapCustomerRows,
  mapInventoryRow,
  mapInventoryRows,
  mapTableRow,
  mapTableRows,
  mapKitchenOrderRow,
  mapKitchenOrderRows,
  mapSupplierRow,
  mapSupplierRows,
  mapServiceRow,
  mapServiceRows,
  mapAppointmentRow,
  mapAppointmentRows,
};
