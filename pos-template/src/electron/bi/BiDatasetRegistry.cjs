/**
 * BI Dataset Registry
 *
 * Centralized single source of truth for ALL export datasets.
 * Each dataset declares:
 *   - key:            CSV filename (without .csv)
 *   - sql:            Query to extract raw data
 *   - module:         Module dependency (null = always included)
 *   - businessTypes:  Array of business types that export this dataset
 *   - category:       'fact' or 'dimension'
 *   - description:    Human-readable description
 *   - required:       Whether this dataset must always be present
 *
 * The export engine uses this registry to:
 *   1. Determine which datasets to export based on business type + modules
 *   2. Execute the correct SQL for each dataset
 *   3. Map rows using BiDataMapper
 *   4. Validate against BiSchemaContract
 *   5. Generate CSVs in the correct column order
 *
 * To add a new dataset, ONLY this file needs updating (plus schema in
 * BiSchemaContract.cjs and mapper in BiDataMapper.cjs).
 */

const CORE_DATASETS = [
  'sales', 'sale_items', 'products', 'customers', 'inventory',
  'product_families',
];

const BUSINESS_TYPE_DATASETS = {
  retail: [
    'sales', 'sale_items', 'products', 'customers', 'inventory',
    'product_families', 'suppliers', 'stock_movements',
  ],
  restaurant: [
    'sales', 'sale_items', 'products', 'customers', 'tables',
    'kitchen_orders', 'kitchen_order_items', 'kitchen_departments', 'table_reservations',
    'product_families',
  ],
  cafe: [
    'sales', 'sale_items', 'products', 'customers', 'tables',
    'kitchen_orders', 'kitchen_order_items', 'kitchen_departments', 'product_families',
  ],
  bakery: [
    'sales', 'sale_items', 'products', 'customers', 'inventory',
    'kitchen_orders', 'kitchen_order_items', 'kitchen_departments', 'suppliers', 'stock_movements',
    'product_families',
  ],
  pharmacy: [
    'sales', 'sale_items', 'products', 'customers', 'inventory',
    'suppliers', 'stock_movements', 'product_families',
  ],
  clothing: [
    'sales', 'sale_items', 'products', 'customers', 'inventory',
    'suppliers', 'stock_movements', 'product_families',
  ],
  electronics: [
    'sales', 'sale_items', 'products', 'customers', 'inventory',
    'suppliers', 'stock_movements', 'product_families',
  ],
  supermarket: [
    'sales', 'sale_items', 'products', 'customers', 'inventory',
    'suppliers', 'stock_movements', 'product_families',
  ],
  salon: [
    'sales', 'sale_items', 'products', 'customers', 'services',
    'appointments', 'product_families',
  ],
  hotel: [
    'sales', 'sale_items', 'products', 'customers', 'services',
    'appointments', 'tables', 'product_families',
  ],
  clinic: [
    'sales', 'sale_items', 'products', 'customers', 'services',
    'appointments', 'product_families',
  ],
};

const DATASETS = new Map([
  [
    'sales',
    {
      key: 'sales',
      sql: `SELECT s.id, s.total, s.tax, s.discount, s.payment_method,
                    s.customer_id, s.table_id, s.user_id, s.shift_id,
                    s.status, s.subtotal, s.notes, s.receipt_number,
                    s.kitchen_status,
                    strftime('%Y-%m-%d %H:%M:%S', s.created_at) AS created_at,
                    c.name AS customer_name, c.email AS customer_email,
                    u.username AS cashier_name, u.full_name AS cashier_full_name
             FROM sales s
             LEFT JOIN customers c ON s.customer_id = c.id
             LEFT JOIN users u ON s.user_id = u.id
             ORDER BY s.created_at DESC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'Transactions (sales, refunds, voids)',
      required: true,
      mapper: 'mapSalesRows',
    },
  ],
  [
    'sale_items',
    {
      key: 'sale_items',
      sql: `SELECT si.id, si.sale_id, si.product_id, si.quantity,
                    si.price, si.vat_rate, si.vat_amount,
                    s.payment_method,
                    strftime('%Y-%m-%d %H:%M:%S', s.created_at) AS sale_date,
                    p.name AS product_name, p.category, p.family
             FROM sale_items si
             JOIN sales s ON si.sale_id = s.id
             LEFT JOIN products p ON si.product_id = p.id
             ORDER BY s.created_at DESC, si.id ASC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'Line items per transaction (product-level sales)',
      required: true,
      mapper: 'mapSaleItemRows',
    },
  ],
  [
    'products',
    {
      key: 'products',
      sql: `SELECT id, name, price, cost_price, category, family, barcode,
                    stock, min_stock, manage_stock, unit, supplier, description, image,
                    vat_rate_id, price_type, requires_kitchen,
                    preparation_department, preparation_time,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at,
                    strftime('%Y-%m-%d %H:%M:%S', updated_at) AS updated_at
             FROM products ORDER BY name ASC`,
      module: null,
      businessTypes: 'all',
      category: 'dimension',
      description: 'Product catalog with pricing and stock levels',
      required: true,
      mapper: 'mapProductRows',
    },
  ],
  [
    'customers',
    {
      key: 'customers',
      sql: `SELECT id, name, email, phone, address, loyalty_points,
                    total_spent, visit_count,
                    strftime('%Y-%m-%d %H:%M:%S', last_visit_date) AS last_visit_date,
                    notes, tags, is_active,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at,
                    strftime('%Y-%m-%d %H:%M:%S', updated_at) AS updated_at
             FROM customers ORDER BY name ASC`,
      module: null,
      businessTypes: 'all',
      category: 'dimension',
      description: 'Customer profiles with loyalty and spending data',
      required: true,
      mapper: 'mapCustomerRows',
    },
  ],
  [
    'inventory',
    {
      key: 'inventory',
      sql: `SELECT p.id AS product_id, p.name AS product_name, p.stock,
                   p.min_stock, p.manage_stock, p.category, p.family, p.price,
                   p.cost_price, p.unit, p.supplier,
                   COALESCE(sold.qty_sold, 0) AS times_sold,
                   ROUND(p.price * p.stock, 2) AS inventory_value,
                   CASE WHEN p.stock <= p.min_stock THEN 1 ELSE 0 END AS needs_reorder
            FROM products p
            LEFT JOIN (
              SELECT si.product_id, SUM(si.quantity) AS qty_sold
              FROM sale_items si
              GROUP BY si.product_id
            ) sold ON p.id = sold.product_id
            WHERE p.manage_stock = 1
            ORDER BY p.name ASC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'Stock levels with inventory valuation and reorder flags',
      required: true,
      mapper: 'mapInventoryRows',
    },
  ],
  [
    'product_families',
    {
      key: 'product_families',
      sql: `SELECT id, name, description, icon,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at
             FROM product_families ORDER BY name ASC`,
      module: null,
      businessTypes: 'all',
      category: 'dimension',
      description: 'Product family/group reference data',
      required: false,
      mapper: 'mapProductFamilyRows',
    },
  ],
  [
    'tables',
    {
      key: 'tables',
      sql: `SELECT id, table_number, capacity, status, zone, area_name,
                    waiter, notes, current_order_id, customer_count,
                    strftime('%Y-%m-%d %H:%M:%S', dining_started_at) AS dining_started_at,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at
             FROM restaurant_tables ORDER BY table_number ASC`,
      module: 'tables',
      businessTypes: ['restaurant', 'cafe', 'hotel'],
      category: 'dimension',
      description: 'Restaurant table layout and status',
      required: false,
      mapper: 'mapTableRows',
    },
  ],
  [
    'kitchen_orders',
    {
      key: 'kitchen_orders',
      sql: `SELECT id, table_number, notes, priority, status,
                    sale_id, total, server_name, customer_name,
                    department, estimated_minutes,
                    strftime('%Y-%m-%d %H:%M:%S', started_at) AS started_at,
                    strftime('%Y-%m-%d %H:%M:%S', ready_at) AS ready_at,
                    strftime('%Y-%m-%d %H:%M:%S', served_at) AS served_at,
                    strftime('%Y-%m-%d %H:%M:%S', completed_at) AS completed_at,
                    cancel_reason, cancelled_by,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at,
                    strftime('%Y-%m-%d %H:%M:%S', updated_at) AS updated_at
             FROM kitchen_orders ORDER BY created_at DESC`,
      module: 'kitchen',
      businessTypes: ['restaurant', 'cafe', 'bakery'],
      category: 'fact',
      description: 'Kitchen order lifecycle with full timeline',
      required: false,
      mapper: 'mapKitchenOrderRows',
    },
  ],
  [
    'kitchen_order_items',
    {
      key: 'kitchen_order_items',
      sql: `SELECT
              ko.id * 10000 + CAST(je.key AS INTEGER) + 1 AS kitchen_order_item_id,
              ko.id AS order_id,
              ko.sale_id,
              CAST(je.value ->> 'product_id' AS INTEGER) AS product_id,
              COALESCE(je.value ->> 'product_name', je.value ->> 'name', '') AS product_name,
              COALESCE(CAST(je.value ->> 'quantity' AS INTEGER), 1) AS quantity,
              COALESCE(CAST(je.value ->> 'price' AS REAL), 0) AS unit_price,
              COALESCE(CAST(je.value ->> 'quantity' AS INTEGER), 1) * COALESCE(CAST(je.value ->> 'price' AS REAL), 0) AS line_total,
              ko.department,
              NULL AS preparation_time,
              strftime('%Y-%m-%d %H:%M:%S', ko.created_at) AS created_at
            FROM kitchen_orders ko, json_each(ko.items) je
            ORDER BY ko.id, CAST(je.key AS INTEGER)`,
      module: 'kitchen',
      businessTypes: ['restaurant', 'cafe', 'bakery'],
      category: 'fact',
      description: 'Normalized line items per kitchen order (extracted from items JSON)',
      required: false,
      mapper: 'mapKitchenOrderItemRows',
    },
  ],
  [
    'kitchen_departments',
    {
      key: 'kitchen_departments',
      sql: `SELECT id, name, icon, color, is_active, sort_order,
                    sla_target_minutes,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at
             FROM kitchen_departments ORDER BY sort_order ASC, name ASC`,
      module: 'kitchen',
      businessTypes: ['restaurant', 'cafe', 'bakery'],
      category: 'dimension',
      description: 'Kitchen department/station configuration',
      required: false,
      mapper: 'mapKitchenDepartmentRows',
    },
  ],
  [
    'table_reservations',
    {
      key: 'table_reservations',
      sql: `SELECT tr.id, tr.table_id, tr.customer_name, tr.customer_phone,
                    tr.guests, tr.reservation_date, tr.reservation_time,
                    tr.duration_minutes, tr.notes, tr.status,
                    strftime('%Y-%m-%d %H:%M:%S', tr.created_at) AS created_at,
                    rt.table_number
             FROM table_reservations tr
             LEFT JOIN restaurant_tables rt ON tr.table_id = rt.id
             ORDER BY tr.reservation_date DESC, tr.reservation_time DESC`,
      module: 'tables',
      businessTypes: ['restaurant', 'cafe', 'hotel'],
      category: 'fact',
      description: 'Table reservations with guest and table details',
      required: false,
      mapper: 'mapTableReservationRows',
    },
  ],
  [
    'suppliers',
    {
      key: 'suppliers',
      sql: `SELECT id, name, contact, phone, email, address,
                    notes, is_active,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at
             FROM suppliers ORDER BY name ASC`,
      module: 'suppliers',
      businessTypes: ['retail', 'bakery', 'pharmacy', 'clothing',
                       'electronics', 'supermarket', 'restaurant', 'cafe'],
      category: 'dimension',
      description: 'Supplier contact information and status',
      required: false,
      mapper: 'mapSupplierRows',
    },
  ],
  [
    'services',
    {
      key: 'services',
      sql: `SELECT id, name, description, price, duration,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at
             FROM services ORDER BY name ASC`,
      module: null,
      businessTypes: ['salon', 'hotel', 'clinic'],
      category: 'dimension',
      description: 'Service catalog with pricing and duration',
      required: false,
      mapper: 'mapServiceRows',
    },
  ],
  [
    'appointments',
    {
      key: 'appointments',
      sql: `SELECT a.id, a.customer_name, a.customer_phone, a.service_id,
                    strftime('%Y-%m-%d %H:%M:%S', a.appointment_date) AS appointment_date,
                    a.notes, a.status,
                    strftime('%Y-%m-%d %H:%M:%S', a.created_at) AS created_at,
                    s.name AS service_name, s.price AS service_price
             FROM appointments a
             LEFT JOIN services s ON a.service_id = s.id
             ORDER BY a.appointment_date DESC`,
      module: null,
      businessTypes: ['salon', 'clinic', 'hotel'],
      category: 'fact',
      description: 'Scheduled appointments with service details',
      required: false,
      mapper: 'mapAppointmentRows',
    },
  ],
  [
    'stock_movements',
    {
      key: 'stock_movements',
      sql: `SELECT sm.id, sm.product_id, sm.product_name,
                    sm.movement_type, sm.quantity,
                    sm.stock_before, sm.stock_after,
                    sm.reason, sm.reference, sm.user_name,
                    strftime('%Y-%m-%d %H:%M:%S', sm.created_at) AS created_at
             FROM stock_movements sm
             ORDER BY sm.created_at DESC`,
      module: 'inventory',
      businessTypes: ['retail', 'bakery', 'pharmacy', 'clothing',
                       'electronics', 'supermarket'],
      category: 'fact',
      description: 'Inventory movement audit trail (in/out/adjustments)',
      required: false,
      mapper: 'mapStockMovementRows',
    },
  ],
  [
    'shifts',
    {
      key: 'shifts',
      sql: `SELECT sh.id, sh.user_id, sh.user_name, sh.opening_float,
                    strftime('%Y-%m-%d %H:%M:%S', sh.opened_at) AS opened_at,
                    strftime('%Y-%m-%d %H:%M:%S', sh.closed_at) AS closed_at,
                    sh.status,
                    sh.closing_expected, sh.closing_actual, sh.difference,
                    sh.cash_sales, sh.card_sales, sh.other_sales,
                    sh.note
             FROM shifts sh
             ORDER BY sh.opened_at DESC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'Cash register shift summaries with reconciliation',
      required: false,
      mapper: 'mapShiftRows',
    },
  ],
  [
    'cash_drawer_events',
    {
      key: 'cash_drawer_events',
      sql: `SELECT cde.id,
                    strftime('%Y-%m-%d %H:%M:%S', cde.timestamp) AS timestamp,
                    cde.user_id, cde.user_name,
                    cde.action, cde.reason,
                    cde.amount_expected, cde.amount_actual, cde.difference,
                    cde.notes
             FROM cash_drawer_events cde
             ORDER BY cde.timestamp DESC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'Cash events journal (shift_open, shift_close, drawer_open, cash_count, cash_adjustment)',
      required: false,
      mapper: 'mapCashDrawerEventRows',
    },
  ],
  [
    'audit_logs',
    {
      key: 'audit_logs',
      sql: `SELECT al.id,
                    strftime('%Y-%m-%d %H:%M:%S', al.timestamp) AS timestamp,
                    al.user_id, al.user_name,
                    al.action_type, al.entity_type, al.entity_id,
                    al.old_value, al.new_value, al.ip_address, al.notes
             FROM audit_logs al
             ORDER BY al.timestamp DESC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'Full audit trail (logins, CRUD operations, shift events, settings changes)',
      required: false,
      mapper: 'mapAuditLogRows',
    },
  ],
  [
    'vat_rates',
    {
      key: 'vat_rates',
      sql: `SELECT id, name, rate, is_active,
                    strftime('%Y-%m-%d %H:%M:%S', created_at) AS created_at
             FROM vat_rates ORDER BY rate ASC`,
      module: null,
      businessTypes: 'all',
      category: 'dimension',
      description: 'VAT rate definitions used for tax calculation on products and sale items',
      required: false,
      mapper: 'mapVatRateRows',
    },
  ],
  [
    'z_reports',
    {
      key: 'z_reports',
      sql: `SELECT z.id, z.shift_id, z.user_id, z.user_name,
                    z.report_number,
                    strftime('%Y-%m-%d %H:%M:%S', z.period_start) AS period_start,
                    strftime('%Y-%m-%d %H:%M:%S', z.period_end) AS period_end,
                    z.total_sales, z.total_revenue, z.total_tax,
                    z.total_discounts, z.cash_sales, z.card_sales,
                    z.other_sales, z.refund_count, z.refund_total,
                    z.opening_float, z.closing_expected, z.closing_actual,
                    z.difference, z.transaction_count, z.items_sold,
                    z.payment_methods_json, z.products_json,
                    z.notes,
                    strftime('%Y-%m-%d %H:%M:%S', z.printed_at) AS printed_at,
                    strftime('%Y-%m-%d %H:%M:%S', z.created_at) AS created_at
             FROM z_reports z
             ORDER BY z.period_end DESC`,
      module: null,
      businessTypes: 'all',
      category: 'fact',
      description: 'End-of-day / end-of-shift Z reports',
      required: false,
      mapper: 'mapZReportRows',
    },
  ],
]);

/**
 * Resolve which datasets to export for a given business type and module set.
 *
 * @param {string}   businessType    - e.g. 'retail', 'restaurant', 'salon'
 * @param {string[]} enabledModules  - e.g. ['pos-core', 'kitchen']
 * @returns {string[]} Dataset keys to export
 */
function resolveExportDatasets(businessType, enabledModules) {
  const moduleSet = new Set(enabledModules || []);
  const result = [];

  for (const [key, ds] of DATASETS) {
    const isCore = CORE_DATASETS.includes(key);

    if (isCore) {
      result.push(key);
      continue;
    }

    const typeMatch =
      ds.businessTypes === 'all' ||
      (Array.isArray(ds.businessTypes) &&
        ds.businessTypes.some(
          t => t === businessType || businessType.startsWith(t)
        ));

    if (!typeMatch) continue;

    if (ds.module && !moduleSet.has(ds.module)) continue;

    result.push(key);
  }

  return result;
}

function getRegistryEntry(datasetKey) {
  return DATASETS.get(datasetKey) || null;
}

function getAllRegistryEntries() {
  return Object.fromEntries(DATASETS);
}

function getBusinessTypePreset(businessType) {
  return BUSINESS_TYPE_DATASETS[businessType] || null;
}

function getRegistrySize() {
  return DATASETS.size;
}

module.exports = {
  DATASETS,
  CORE_DATASETS,
  BUSINESS_TYPE_DATASETS,
  resolveExportDatasets,
  getRegistryEntry,
  getAllRegistryEntries,
  getBusinessTypePreset,
  getRegistrySize,
};
