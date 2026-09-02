/**
 * BI Data Mapper v2
 *
 * Transforms raw database rows into normalized BI schema objects.
 *
 * This is the ONLY place where DB column names are mapped to BI column names.
 * If a DB column is renamed, only this file needs updating — the schema contract
 * (BiSchemaContract) and downstream ETL never change.
 *
 * v2 — Full enterprise rewrite: 19 dataset mappers, enriched fields.
 */

const BiSchemaContract = require('./BiSchemaContract.cjs');

/**
 * Generic mapper: normalize a raw DB row into the BI schema for any dataset.
 * Returns a plain object whose keys match the canonical column names.
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

function mapRows(datasetKey, rawRows) {
  return rawRows.map(row => mapRow(datasetKey, row));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACT MAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mapSaleRow(row) {
  return {
    sale_id:          row.id ?? null,
    total:            row.total ?? 0,
    tax:              row.tax ?? 0,
    discount:         row.discount ?? 0,
    subtotal:         row.subtotal ?? null,
    payment_method:   row.payment_method ?? null,
    customer_id:      row.customer_id ?? null,
    table_id:         row.table_id ?? null,
    user_id:          row.user_id ?? null,
    shift_id:         row.shift_id ?? null,
    status:           row.status ?? 'paid',
    receipt_number:   row.receipt_number ?? null,
    kitchen_status:   row.kitchen_status ?? null,
    notes:            row.notes ?? null,
    customer_name:    row.customer_name ?? null,
    customer_email:   row.customer_email ?? null,
    cashier_name:     row.cashier_name ?? null,
    cashier_full_name:row.cashier_full_name ?? null,
    created_at:       row.created_at ?? null,
  };
}

function mapSalesRows(rows) {
  return rows.map(mapSaleRow);
}

function mapSaleItemRow(row) {
  const qty = row.quantity ?? 0;
  const price = row.price ?? 0;
  return {
    sale_item_id:   row.id ?? null,
    sale_id:        row.sale_id ?? null,
    product_id:     row.product_id ?? null,
    quantity:       qty,
    unit_price:     price,
    line_total:     Math.round(qty * price * 100) / 100,
    vat_rate:       row.vat_rate ?? null,
    vat_amount:     row.vat_amount ?? null,
    payment_method: row.payment_method ?? null,
    product_name:   row.product_name ?? null,
    category:       row.category ?? null,
    family:         row.family ?? null,
    sale_date:      row.sale_date ?? row.created_at ?? null,
  };
}

function mapSaleItemRows(rows) {
  return rows.map(mapSaleItemRow);
}

function mapKitchenOrderRow(row) {
  return {
    order_id:          row.id ?? null,
    table_number:      row.table_number ?? null,
    items:             row.items ?? null,
    notes:             row.notes ?? null,
    priority:          row.priority ?? 'normal',
    status:            row.status ?? 'pending',
    sale_id:           row.sale_id ?? null,
    total:             row.total ?? 0,
    server_name:       row.server_name ?? null,
    customer_name:     row.customer_name ?? null,
    department:        row.department ?? null,
    estimated_minutes: row.estimated_minutes ?? null,
    started_at:        row.started_at ?? null,
    ready_at:          row.ready_at ?? null,
    served_at:         row.served_at ?? null,
    completed_at:      row.completed_at ?? null,
    cancel_reason:     row.cancel_reason ?? null,
    cancelled_by:      row.cancelled_by ?? null,
    created_at:        row.created_at ?? null,
    updated_at:        row.updated_at ?? null,
  };
}

function mapKitchenOrderRows(rows) {
  return rows.map(mapKitchenOrderRow);
}

function mapKitchenOrderItemRow(row) {
  return {
    kitchen_order_item_id: row.kitchen_order_item_id ?? null,
    order_id:              row.order_id ?? null,
    sale_id:               row.sale_id ?? null,
    product_id:            row.product_id ?? null,
    product_name:          row.product_name ?? '',
    quantity:              row.quantity ?? 1,
    unit_price:            row.unit_price ?? 0,
    line_total:            row.line_total ?? 0,
    department:            row.department ?? null,
    preparation_time:      row.preparation_time ?? null,
    created_at:            row.created_at ?? null,
  };
}

function mapKitchenOrderItemRows(rows) {
  return rows.map(mapKitchenOrderItemRow);
}

function mapStockMovementRow(row) {
  return {
    movement_id:     row.id ?? null,
    product_id:      row.product_id ?? null,
    product_name:    row.product_name ?? null,
    movement_type:   row.movement_type ?? null,
    quantity:        row.quantity ?? 0,
    stock_before:    row.stock_before ?? null,
    stock_after:     row.stock_after ?? null,
    reason:          row.reason ?? null,
    reference:       row.reference ?? null,
    user_name:       row.user_name ?? null,
    created_at:      row.created_at ?? null,
  };
}

function mapStockMovementRows(rows) {
  return rows.map(mapStockMovementRow);
}

function mapShiftRow(row) {
  return {
    shift_id:          row.id ?? null,
    user_id:           row.user_id ?? null,
    user_name:         row.user_name ?? null,
    opening_float:     row.opening_float ?? 0,
    opened_at:         row.opened_at ?? null,
    closed_at:         row.closed_at ?? null,
    status:            row.status ?? 'open',
    closing_expected:  row.closing_expected ?? 0,
    closing_actual:    row.closing_actual ?? 0,
    difference:        row.difference ?? 0,
    cash_sales:        row.cash_sales ?? 0,
    card_sales:        row.card_sales ?? 0,
    other_sales:       row.other_sales ?? 0,
    note:              row.note ?? null,
  };
}

function mapShiftRows(rows) {
  return rows.map(mapShiftRow);
}

function mapCashDrawerEventRow(row) {
  return {
    event_id:        row.id ?? null,
    timestamp:       row.timestamp ?? null,
    user_id:         row.user_id ?? null,
    user_name:       row.user_name ?? null,
    action:          row.action ?? null,
    reason:          row.reason ?? null,
    amount_expected: row.amount_expected ?? null,
    amount_actual:   row.amount_actual ?? null,
    difference:      row.difference ?? null,
    notes:           row.notes ?? null,
  };
}

function mapCashDrawerEventRows(rows) {
  return rows.map(mapCashDrawerEventRow);
}

function mapZReportRow(row) {
  return {
    z_report_id:       row.id ?? null,
    shift_id:          row.shift_id ?? null,
    user_id:           row.user_id ?? null,
    user_name:         row.user_name ?? null,
    report_number:     row.report_number ?? null,
    period_start:      row.period_start ?? null,
    period_end:        row.period_end ?? null,
    total_sales:       row.total_sales ?? 0,
    total_revenue:     row.total_revenue ?? 0,
    total_tax:         row.total_tax ?? 0,
    total_discounts:   row.total_discounts ?? 0,
    cash_sales:        row.cash_sales ?? 0,
    card_sales:        row.card_sales ?? 0,
    other_sales:       row.other_sales ?? 0,
    refund_count:      row.refund_count ?? 0,
    refund_total:      row.refund_total ?? 0,
    opening_float:     row.opening_float ?? 0,
    closing_expected:  row.closing_expected ?? 0,
    closing_actual:    row.closing_actual ?? 0,
    difference:        row.difference ?? 0,
    transaction_count: row.transaction_count ?? 0,
    items_sold:        row.items_sold ?? 0,
    notes:             row.notes ?? null,
    printed_at:        row.printed_at ?? null,
    created_at:        row.created_at ?? null,
  };
}

function mapZReportRows(rows) {
  return rows.map(mapZReportRow);
}

function mapAppointmentRow(row) {
  return {
    appointment_id:   row.id ?? null,
    customer_name:    row.customer_name ?? '',
    customer_phone:   row.customer_phone ?? null,
    service_id:       row.service_id ?? null,
    appointment_date: row.appointment_date ?? null,
    notes:            row.notes ?? null,
    status:           row.status ?? 'scheduled',
    service_name:     row.service_name ?? null,
    service_price:    row.service_price ?? null,
    created_at:       row.created_at ?? null,
  };
}

function mapAppointmentRows(rows) {
  return rows.map(mapAppointmentRow);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION MAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mapProductRow(row) {
  return {
    product_id:              row.id ?? null,
    name:                    row.name ?? '',
    price:                   row.price ?? 0,
    cost_price:              row.cost_price ?? 0,
    category:                row.category ?? null,
    family:                  row.family ?? null,
    barcode:                 row.barcode ?? null,
    stock:                   row.stock ?? 0,
    min_stock:               row.min_stock ?? 0,
    unit:                    row.unit ?? null,
    supplier:                row.supplier ?? null,
    description:             row.description ?? null,
    image:                   row.image ?? null,
    vat_rate_id:             row.vat_rate_id ?? null,
    price_type:              row.price_type ?? null,
    manage_stock:            row.manage_stock ?? 1,
    requires_kitchen:        row.requires_kitchen ?? 0,
    preparation_department:  row.preparation_department ?? null,
    preparation_time:        row.preparation_time ?? null,
    created_at:              row.created_at ?? null,
    updated_at:              row.updated_at ?? null,
  };
}

function mapProductRows(rows) {
  return rows.map(mapProductRow);
}

function mapCustomerRow(row) {
  return {
    customer_id:     row.id ?? null,
    name:            row.name ?? '',
    email:           row.email ?? null,
    phone:           row.phone ?? null,
    address:         row.address ?? null,
    loyalty_points:  row.loyalty_points ?? 0,
    total_spent:     row.total_spent ?? 0,
    visit_count:     row.visit_count ?? 0,
    last_visit_date: row.last_visit_date ?? null,
    tags:            row.tags ?? null,
    is_active:       row.is_active ?? 1,
    created_at:      row.created_at ?? null,
    updated_at:      row.updated_at ?? null,
  };
}

function mapCustomerRows(rows) {
  return rows.map(mapCustomerRow);
}

function mapInventoryRow(row) {
  return {
    product_id:      row.product_id ?? row.id ?? null,
    product_name:    row.product_name ?? row.name ?? '',
    stock:           row.stock ?? 0,
    min_stock:       row.min_stock ?? 0,
    category:        row.category ?? null,
    family:          row.family ?? null,
    price:           row.price ?? 0,
    cost_price:      row.cost_price ?? 0,
    unit:            row.unit ?? null,
    supplier:        row.supplier ?? null,
    manage_stock:    row.manage_stock ?? 1,
    times_sold:      row.times_sold ?? 0,
    inventory_value: row.inventory_value ?? 0,
    needs_reorder:   row.needs_reorder ?? 0,
  };
}

function mapInventoryRows(rows) {
  return rows.map(mapInventoryRow);
}

function mapProductFamilyRow(row) {
  return {
    family_id:   row.id ?? null,
    name:        row.name ?? '',
    description: row.description ?? null,
    icon:        row.icon ?? null,
    created_at:  row.created_at ?? null,
  };
}

function mapProductFamilyRows(rows) {
  return rows.map(mapProductFamilyRow);
}

function mapTableRow(row) {
  return {
    table_id:          row.id ?? null,
    table_number:      row.table_number ?? '',
    capacity:          row.capacity ?? null,
    status:            row.status ?? 'available',
    zone:              row.zone ?? null,
    area_name:         row.area_name ?? null,
    waiter:            row.waiter ?? null,
    customer_count:    row.customer_count ?? 0,
    notes:             row.notes ?? null,
    current_order_id:  row.current_order_id ?? null,
    dining_started_at: row.dining_started_at ?? null,
    created_at:        row.created_at ?? null,
  };
}

function mapTableRows(rows) {
  return rows.map(mapTableRow);
}

function mapKitchenDepartmentRow(row) {
  return {
    dept_id:            row.id ?? null,
    name:               row.name ?? '',
    icon:               row.icon ?? null,
    color:              row.color ?? null,
    is_active:          row.is_active ?? 1,
    sort_order:         row.sort_order ?? 0,
    sla_target_minutes: row.sla_target_minutes ?? null,
    created_at:         row.created_at ?? null,
  };
}

function mapKitchenDepartmentRows(rows) {
  return rows.map(mapKitchenDepartmentRow);
}

function mapTableReservationRow(row) {
  return {
    reservation_id:    row.id ?? null,
    table_id:          row.table_id ?? null,
    table_number:      row.table_number ?? null,
    customer_name:     row.customer_name ?? '',
    customer_phone:    row.customer_phone ?? null,
    guests:            row.guests ?? 2,
    reservation_date:  row.reservation_date ?? null,
    reservation_time:  row.reservation_time ?? null,
    duration_minutes:  row.duration_minutes ?? null,
    notes:             row.notes ?? null,
    status:            row.status ?? 'confirmed',
    created_at:        row.created_at ?? null,
  };
}

function mapTableReservationRows(rows) {
  return rows.map(mapTableReservationRow);
}

function mapSupplierRow(row) {
  return {
    supplier_id: row.id ?? null,
    name:        row.name ?? '',
    contact:     row.contact ?? null,
    phone:       row.phone ?? null,
    email:       row.email ?? null,
    address:     row.address ?? null,
    notes:       row.notes ?? null,
    is_active:   row.is_active ?? 1,
    created_at:  row.created_at ?? null,
  };
}

function mapSupplierRows(rows) {
  return rows.map(mapSupplierRow);
}

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

function mapAuditLogRow(row) {
  const analyticalActions = new Set([
    'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
    'CUSTOMER_CREATE', 'CUSTOMER_UPDATE',
    'SUPPLIER_CREATE', 'SUPPLIER_UPDATE',
    'SHIFT_CLOSE',
    'SETTINGS_UPDATE', 'SETTINGS_IMPORT',
    'FAMILY_MOVE', 'FAMILY_CREATE', 'FAMILY_DELETE',
  ]);
  const action = row.action_type || '';
  const keepValues = analyticalActions.has(action);

  return {
    log_id:      row.id ?? null,
    timestamp:   row.timestamp ?? null,
    user_id:     row.user_id ?? null,
    user_name:   row.user_name ?? null,
    action_type: action,
    entity_type: row.entity_type ?? null,
    entity_id:   row.entity_id ?? null,
    old_value:   keepValues ? (row.old_value ?? null) : null,
    new_value:   keepValues ? (row.new_value ?? null) : null,
    ip_address:  row.ip_address ?? null,
    notes:       row.notes ?? null,
  };
}

function mapAuditLogRows(rows) {
  return rows.map(mapAuditLogRow);
}

function mapVatRateRow(row) {
  return {
    vat_rate_id: row.id ?? null,
    name:        row.name ?? '',
    rate:        row.rate ?? 0,
    is_active:   row.is_active ?? 1,
    created_at:  row.created_at ?? null,
  };
}

function mapVatRateRows(rows) {
  return rows.map(mapVatRateRow);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH MAP — Used by the handler to call mappers by name
// ═══════════════════════════════════════════════════════════════════════════════

const MAPPER_DISPATCH = {
  mapSalesRows,
  mapSaleItemRows,
  mapProductRows,
  mapCustomerRows,
  mapInventoryRows,
  mapProductFamilyRows,
  mapTableRows,
  mapKitchenOrderRows,
  mapKitchenOrderItemRows,
  mapKitchenDepartmentRows,
  mapTableReservationRows,
  mapSupplierRows,
  mapServiceRows,
  mapAppointmentRows,
  mapStockMovementRows,
  mapShiftRows,
  mapCashDrawerEventRows,
  mapZReportRows,
  mapAuditLogRows,
  mapVatRateRows,
};

function getMapper(mapperName) {
  return MAPPER_DISPATCH[mapperName] || null;
}

module.exports = {
  mapRow,
  mapRows,
  getMapper,
  MAPPER_DISPATCH,
  mapSaleRow, mapSalesRows,
  mapSaleItemRow, mapSaleItemRows,
  mapProductRow, mapProductRows,
  mapCustomerRow, mapCustomerRows,
  mapInventoryRow, mapInventoryRows,
  mapProductFamilyRow, mapProductFamilyRows,
  mapTableRow, mapTableRows,
  mapKitchenOrderRow, mapKitchenOrderRows,
  mapKitchenOrderItemRow, mapKitchenOrderItemRows,
  mapKitchenDepartmentRow, mapKitchenDepartmentRows,
  mapTableReservationRow, mapTableReservationRows,
  mapSupplierRow, mapSupplierRows,
  mapServiceRow, mapServiceRows,
  mapAppointmentRow, mapAppointmentRows,
  mapStockMovementRow, mapStockMovementRows,
  mapShiftRow, mapShiftRows,
  mapCashDrawerEventRow, mapCashDrawerEventRows,
  mapZReportRow, mapZReportRows,
  mapAuditLogRow, mapAuditLogRows,
  mapVatRateRow, mapVatRateRows,
};
