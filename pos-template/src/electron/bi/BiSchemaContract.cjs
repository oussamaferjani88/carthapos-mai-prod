/**
 * BI Schema Contract v2
 *
 * Canonical column schemas for every export dataset.
 * Schema version MUST be incremented when columns are added/removed/renamed.
 *
 * Each schema entry describes:
 *   - column name (canonical)
 *   - type hint (for ETL consumption)
 *   - required (true = must always have a value)
 *   - description (human-readable)
 *
 * v2.2 — Added kitchen_order_items dataset; removed items JSON column
 *         from kitchen_orders; optimized audit_logs JSON payloads.
 */

const BI_SCHEMA_VERSION = '2.2.0';
const EXPORT_VERSION = '2.0.0';
const GENERATOR_VERSION = '2.0.0';

const SCHEMAS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // FACT DATASETS
  // ═══════════════════════════════════════════════════════════════════════════

  sales: {
    columns: [
      { name: 'sale_id',          type: 'integer',  required: true,  description: 'Unique sale identifier' },
      { name: 'total',            type: 'real',     required: true,  description: 'Sale total amount (TTC)' },
      { name: 'tax',              type: 'real',     required: false, description: 'Tax amount' },
      { name: 'discount',         type: 'real',     required: false, description: 'Discount amount' },
      { name: 'subtotal',         type: 'real',     required: false, description: 'Subtotal before tax/discount' },
      { name: 'payment_method',   type: 'text',     required: false, description: 'Payment method (cash/card/mobile/...)' },
      { name: 'customer_id',      type: 'integer',  required: false, description: 'FK to customers' },
      { name: 'table_id',         type: 'integer',  required: false, description: 'FK to restaurant_tables' },
      { name: 'user_id',          type: 'integer',  required: false, description: 'FK to users (cashier)' },
      { name: 'shift_id',         type: 'integer',  required: false, description: 'FK to shifts' },
      { name: 'status',           type: 'text',     required: false, description: 'Sale status (paid/refunded/voided)' },
      { name: 'receipt_number',   type: 'text',     required: false, description: 'Receipt reference number' },
      { name: 'kitchen_status',   type: 'text',     required: false, description: 'Kitchen status for restaurant orders' },
      { name: 'notes',            type: 'text',     required: false, description: 'Sale notes' },
      { name: 'customer_name',    type: 'text',     required: false, description: 'Customer display name (denormalized)' },
      { name: 'customer_email',   type: 'text',     required: false, description: 'Customer email (denormalized)' },
      { name: 'cashier_name',     type: 'text',     required: false, description: 'Cashier username (denormalized)' },
      { name: 'cashier_full_name',type: 'text',     required: false, description: 'Cashier full name (denormalized)' },
      { name: 'created_at',       type: 'datetime', required: true,  description: 'Sale timestamp (UTC)' },
    ],
    order: 'sale_id',
  },

  sale_items: {
    columns: [
      { name: 'sale_item_id',   type: 'integer',  required: true,  description: 'Unique sale item identifier' },
      { name: 'sale_id',        type: 'integer',  required: true,  description: 'FK to sales' },
      { name: 'product_id',     type: 'integer',  required: true,  description: 'FK to products' },
      { name: 'quantity',       type: 'integer',  required: true,  description: 'Quantity sold' },
      { name: 'unit_price',     type: 'real',     required: true,  description: 'Unit price at time of sale' },
      { name: 'line_total',     type: 'real',     required: false, description: 'quantity * unit_price' },
      { name: 'vat_rate',       type: 'real',     required: false, description: 'VAT rate applied (%)' },
      { name: 'vat_amount',     type: 'real',     required: false, description: 'VAT amount for this line' },
      { name: 'payment_method', type: 'text',     required: false, description: 'Payment method (denormalized from sale)' },
      { name: 'product_name',   type: 'text',     required: false, description: 'Product name (denormalized)' },
      { name: 'category',       type: 'text',     required: false, description: 'Product category (denormalized)' },
      { name: 'family',         type: 'text',     required: false, description: 'Product family (denormalized)' },
      { name: 'sale_date',      type: 'datetime', required: true,  description: 'Sale timestamp (denormalized from sale)' },
    ],
    order: 'sale_item_id',
  },

  kitchen_orders: {
    columns: [
      { name: 'order_id',          type: 'integer',  required: true,  description: 'Unique kitchen order identifier' },
      { name: 'table_number',      type: 'text',     required: false, description: 'Source table number' },
      { name: 'notes',             type: 'text',     required: false, description: 'Special instructions' },
      { name: 'priority',          type: 'text',     required: false, description: 'Priority level (low/normal/high/urgent)' },
      { name: 'status',            type: 'text',     required: false, description: 'Order status' },
      { name: 'sale_id',           type: 'integer',  required: false, description: 'FK to sales' },
      { name: 'total',             type: 'real',     required: false, description: 'Order total (server-calculated)' },
      { name: 'server_name',       type: 'text',     required: false, description: 'Server/waiter name' },
      { name: 'customer_name',     type: 'text',     required: false, description: 'Customer name' },
      { name: 'department',        type: 'text',     required: false, description: 'Kitchen department' },
      { name: 'estimated_minutes', type: 'integer',  required: false, description: 'Estimated prep time (minutes)' },
      { name: 'started_at',        type: 'datetime', required: false, description: 'Preparation started timestamp' },
      { name: 'ready_at',          type: 'datetime', required: false, description: 'Marked ready timestamp' },
      { name: 'served_at',         type: 'datetime', required: false, description: 'Served to customer timestamp' },
      { name: 'completed_at',      type: 'datetime', required: false, description: 'Completed/cancelled timestamp' },
      { name: 'cancel_reason',     type: 'text',     required: false, description: 'Reason for cancellation' },
      { name: 'cancelled_by',      type: 'text',     required: false, description: 'User who cancelled' },
      { name: 'created_at',        type: 'datetime', required: false, description: 'Order creation timestamp' },
      { name: 'updated_at',        type: 'datetime', required: false, description: 'Last update timestamp' },
    ],
    order: 'order_id',
  },

  kitchen_order_items: {
    columns: [
      { name: 'kitchen_order_item_id', type: 'integer',  required: true,  description: 'Synthetic unique ID per order item' },
      { name: 'order_id',              type: 'integer',  required: true,  description: 'FK to kitchen_orders' },
      { name: 'sale_id',               type: 'integer',  required: false, description: 'FK to sales (denormalized from kitchen_orders)' },
      { name: 'product_id',            type: 'integer',  required: false, description: 'FK to products (nullable — items may only have a name)' },
      { name: 'product_name',          type: 'text',     required: false, description: 'Item name (denormalized from items JSON)' },
      { name: 'quantity',              type: 'integer',  required: false, description: 'Quantity ordered' },
      { name: 'unit_price',            type: 'real',     required: false, description: 'Unit price at time of order' },
      { name: 'line_total',            type: 'real',     required: false, description: 'quantity * unit_price' },
      { name: 'department',            type: 'text',     required: false, description: 'Kitchen department (denormalized from kitchen_orders)' },
      { name: 'preparation_time',      type: 'integer',  required: false, description: 'Estimated prep time per item (minutes)' },
      { name: 'created_at',            type: 'datetime', required: false, description: 'Kitchen order creation timestamp (denormalized)' },
    ],
    order: 'kitchen_order_item_id',
  },

  stock_movements: {
    columns: [
      { name: 'movement_id',     type: 'integer',  required: true,  description: 'Unique movement identifier' },
      { name: 'product_id',      type: 'integer',  required: true,  description: 'FK to products' },
      { name: 'product_name',    type: 'text',     required: false, description: 'Product name (denormalized)' },
      { name: 'movement_type',   type: 'text',     required: true,  description: 'Type (in/out/adjustment/purchase/waste/return/sale)' },
      { name: 'quantity',        type: 'integer',  required: true,  description: 'Quantity moved (positive)' },
      { name: 'stock_before',    type: 'integer',  required: false, description: 'Stock level before movement' },
      { name: 'stock_after',     type: 'integer',  required: false, description: 'Stock level after movement' },
      { name: 'reason',          type: 'text',     required: false, description: 'Reason / description' },
      { name: 'reference',       type: 'text',     required: false, description: 'External reference (PO number, etc.)' },
      { name: 'user_name',       type: 'text',     required: false, description: 'User who performed the movement' },
      { name: 'created_at',      type: 'datetime', required: false, description: 'Movement timestamp' },
    ],
    order: 'movement_id',
  },

  shifts: {
    columns: [
      { name: 'shift_id',          type: 'integer',  required: true,  description: 'Unique shift identifier' },
      { name: 'user_id',           type: 'integer',  required: false, description: 'FK to users' },
      { name: 'user_name',         type: 'text',     required: false, description: 'User display name' },
      { name: 'opening_float',     type: 'real',     required: false, description: 'Cash at shift open' },
      { name: 'opened_at',         type: 'datetime', required: false, description: 'Shift open timestamp' },
      { name: 'closed_at',         type: 'datetime', required: false, description: 'Shift close timestamp' },
      { name: 'status',            type: 'text',     required: false, description: 'Shift status (open/closed)' },
      { name: 'closing_expected',  type: 'real',     required: false, description: 'Expected cash at close' },
      { name: 'closing_actual',    type: 'real',     required: false, description: 'Actual cash at close' },
      { name: 'difference',        type: 'real',     required: false, description: 'Cash difference (actual - expected)' },
      { name: 'cash_sales',        type: 'real',     required: false, description: 'Total cash sales during shift' },
      { name: 'card_sales',        type: 'real',     required: false, description: 'Total card sales during shift' },
      { name: 'other_sales',       type: 'real',     required: false, description: 'Total other payment sales during shift' },
      { name: 'note',              type: 'text',     required: false, description: 'Shift notes' },
    ],
    order: 'shift_id',
  },

  cash_drawer_events: {
    columns: [
      { name: 'event_id',        type: 'integer',  required: true,  description: 'Unique event identifier' },
      { name: 'timestamp',       type: 'datetime', required: true,  description: 'Event timestamp' },
      { name: 'user_id',         type: 'integer',  required: false, description: 'FK to users' },
      { name: 'user_name',       type: 'text',     required: false, description: 'User display name' },
      { name: 'action',          type: 'text',     required: true,  description: 'Action (shift_open/shift_close/drawer_open/cash_count/cash_adjustment)' },
      { name: 'reason',          type: 'text',     required: false, description: 'Reason for drawer access' },
      { name: 'amount_expected', type: 'real',     required: false, description: 'Expected amount' },
      { name: 'amount_actual',   type: 'real',     required: false, description: 'Actual counted amount' },
      { name: 'difference',      type: 'real',     required: false, description: 'Difference (actual - expected)' },
      { name: 'notes',           type: 'text',     required: false, description: 'Event notes' },
    ],
    order: 'event_id',
  },

  z_reports: {
    columns: [
      { name: 'z_report_id',          type: 'integer',  required: true,  description: 'Unique Z report identifier' },
      { name: 'shift_id',             type: 'integer',  required: false, description: 'FK to shifts' },
      { name: 'user_id',              type: 'integer',  required: false, description: 'FK to users' },
      { name: 'user_name',            type: 'text',     required: false, description: 'User display name' },
      { name: 'report_number',        type: 'text',     required: true,  description: 'Report sequence number' },
      { name: 'period_start',         type: 'datetime', required: true,  description: 'Reporting period start' },
      { name: 'period_end',           type: 'datetime', required: true,  description: 'Reporting period end' },
      { name: 'total_sales',          type: 'integer',  required: false, description: 'Total number of transactions' },
      { name: 'total_revenue',        type: 'real',     required: false, description: 'Total revenue' },
      { name: 'total_tax',            type: 'real',     required: false, description: 'Total tax collected' },
      { name: 'total_discounts',      type: 'real',     required: false, description: 'Total discounts given' },
      { name: 'cash_sales',           type: 'real',     required: false, description: 'Total cash payments' },
      { name: 'card_sales',           type: 'real',     required: false, description: 'Total card payments' },
      { name: 'other_sales',          type: 'real',     required: false, description: 'Total other payments' },
      { name: 'refund_count',         type: 'integer',  required: false, description: 'Number of refunds' },
      { name: 'refund_total',         type: 'real',     required: false, description: 'Total refund amount' },
      { name: 'opening_float',        type: 'real',     required: false, description: 'Opening cash float' },
      { name: 'closing_expected',     type: 'real',     required: false, description: 'Expected closing amount' },
      { name: 'closing_actual',       type: 'real',     required: false, description: 'Actual closing amount' },
      { name: 'difference',           type: 'real',     required: false, description: 'Cash difference' },
      { name: 'transaction_count',    type: 'integer',  required: false, description: 'Total transactions' },
      { name: 'items_sold',           type: 'integer',  required: false, description: 'Total items sold' },
      { name: 'notes',                type: 'text',     required: false, description: 'Report notes' },
      { name: 'printed_at',           type: 'datetime', required: false, description: 'Report printed timestamp' },
      { name: 'created_at',           type: 'datetime', required: false, description: 'Record creation timestamp' },
    ],
    order: 'z_report_id',
  },

  appointments: {
    columns: [
      { name: 'appointment_id',   type: 'integer',  required: true,  description: 'Unique appointment identifier' },
      { name: 'customer_name',    type: 'text',     required: true,  description: 'Customer name' },
      { name: 'customer_phone',   type: 'text',     required: false, description: 'Customer phone' },
      { name: 'service_id',       type: 'integer',  required: false, description: 'FK to services' },
      { name: 'appointment_date', type: 'datetime', required: true,  description: 'Scheduled datetime' },
      { name: 'notes',            type: 'text',     required: false, description: 'Appointment notes' },
      { name: 'status',           type: 'text',     required: false, description: 'Status' },
      { name: 'service_name',     type: 'text',     required: false, description: 'Service name (denormalized)' },
      { name: 'service_price',    type: 'real',     required: false, description: 'Service price (denormalized)' },
      { name: 'created_at',       type: 'datetime', required: false, description: 'Record creation timestamp' },
    ],
    order: 'appointment_id',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIMENSION DATASETS
  // ═══════════════════════════════════════════════════════════════════════════

  products: {
    columns: [
      { name: 'product_id',              type: 'integer',  required: true,  description: 'Unique product identifier' },
      { name: 'name',                    type: 'text',     required: true,  description: 'Product name' },
      { name: 'price',                   type: 'real',     required: true,  description: 'Selling price (TTC)' },
      { name: 'cost_price',              type: 'real',     required: false, description: 'Cost price (HT)' },
      { name: 'category',                type: 'text',     required: false, description: 'Product category' },
      { name: 'family',                  type: 'text',     required: false, description: 'Product family / group' },
      { name: 'barcode',                 type: 'text',     required: false, description: 'EAN-13 barcode' },
      { name: 'stock',                   type: 'integer',  required: false, description: 'Current stock quantity' },
      { name: 'min_stock',               type: 'integer',  required: false, description: 'Minimum stock (reorder point)' },
      { name: 'unit',                    type: 'text',     required: false, description: 'Unit of measure' },
      { name: 'supplier',                type: 'text',     required: false, description: 'Supplier name' },
      { name: 'description',             type: 'text',     required: false, description: 'Product description' },
      { name: 'image',                   type: 'text',     required: false, description: 'Image URL / path' },
      { name: 'vat_rate_id',             type: 'integer',  required: false, description: 'FK to vat_rates' },
      { name: 'price_type',              type: 'text',     required: false, description: 'Price type (ttc/ht)' },
      { name: 'requires_kitchen',        type: 'integer',  required: false, description: 'Requires kitchen preparation (0/1)' },
      { name: 'manage_stock',            type: 'integer',  required: false, description: 'Stock managed in inventory (0/1)' },
      { name: 'preparation_department',  type: 'text',     required: false, description: 'Kitchen department for preparation' },
      { name: 'preparation_time',        type: 'integer',  required: false, description: 'Estimated prep time (minutes)' },
      { name: 'created_at',              type: 'datetime', required: false, description: 'Product creation timestamp' },
      { name: 'updated_at',              type: 'datetime', required: false, description: 'Last update timestamp' },
    ],
    order: 'product_id',
  },

  customers: {
    columns: [
      { name: 'customer_id',     type: 'integer',  required: true,  description: 'Unique customer identifier' },
      { name: 'name',            type: 'text',     required: true,  description: 'Customer full name' },
      { name: 'email',           type: 'text',     required: false, description: 'Email address' },
      { name: 'phone',           type: 'text',     required: false, description: 'Phone number' },
      { name: 'address',         type: 'text',     required: false, description: 'Physical address' },
      { name: 'loyalty_points',  type: 'integer',  required: false, description: 'Current loyalty points balance' },
      { name: 'total_spent',     type: 'real',     required: false, description: 'Lifetime total spending' },
      { name: 'visit_count',     type: 'integer',  required: false, description: 'Total number of visits' },
      { name: 'last_visit_date', type: 'datetime', required: false, description: 'Last visit timestamp' },
      { name: 'tags',            type: 'text',     required: false, description: 'Customer tags (comma-separated)' },
      { name: 'is_active',       type: 'integer',  required: false, description: 'Active status (0/1)' },
      { name: 'created_at',      type: 'datetime', required: false, description: 'Customer creation timestamp' },
      { name: 'updated_at',      type: 'datetime', required: false, description: 'Last update timestamp' },
    ],
    order: 'customer_id',
  },

  inventory: {
    columns: [
      { name: 'product_id',     type: 'integer',  required: true,  description: 'FK to products' },
      { name: 'product_name',   type: 'text',     required: true,  description: 'Product name (denormalized)' },
      { name: 'stock',          type: 'integer',  required: false, description: 'Current stock quantity' },
      { name: 'min_stock',      type: 'integer',  required: false, description: 'Minimum stock level' },
      { name: 'category',       type: 'text',     required: false, description: 'Product category' },
      { name: 'family',         type: 'text',     required: false, description: 'Product family' },
      { name: 'price',          type: 'real',     required: false, description: 'Selling price' },
      { name: 'cost_price',     type: 'real',     required: false, description: 'Cost price' },
      { name: 'unit',           type: 'text',     required: false, description: 'Unit of measure' },
      { name: 'supplier',       type: 'text',     required: false, description: 'Supplier name' },
      { name: 'times_sold',     type: 'integer',  required: false, description: 'Total units sold' },
      { name: 'inventory_value',type: 'real',     required: false, description: 'stock * price (inventory valuation)' },
      { name: 'needs_reorder',  type: 'integer',  required: false, description: 'Stock <= min_stock (0/1)' },
      { name: 'manage_stock',    type: 'integer',  required: false, description: 'Stock managed in inventory (0/1)' },
    ],
    order: 'product_id',
  },

  product_families: {
    columns: [
      { name: 'family_id',   type: 'integer',  required: true,  description: 'Unique family identifier' },
      { name: 'name',        type: 'text',     required: true,  description: 'Family name' },
      { name: 'description', type: 'text',     required: false, description: 'Family description' },
      { name: 'icon',        type: 'text',     required: false, description: 'Display icon' },
      { name: 'created_at',  type: 'datetime', required: false, description: 'Creation timestamp' },
    ],
    order: 'family_id',
  },

  tables: {
    columns: [
      { name: 'table_id',         type: 'integer',  required: true,  description: 'Unique table identifier' },
      { name: 'table_number',     type: 'text',     required: true,  description: 'Table display number' },
      { name: 'capacity',         type: 'integer',  required: false, description: 'Number of seats' },
      { name: 'status',           type: 'text',     required: false, description: 'Current status' },
      { name: 'zone',             type: 'text',     required: false, description: 'Table zone/area' },
      { name: 'area_name',        type: 'text',     required: false, description: 'Named area' },
      { name: 'waiter',           type: 'text',     required: false, description: 'Assigned waiter' },
      { name: 'customer_count',   type: 'integer',  required: false, description: 'Current guest count' },
      { name: 'notes',            type: 'text',     required: false, description: 'Table notes' },
      { name: 'current_order_id', type: 'integer',  required: false, description: 'FK to current sales order' },
      { name: 'dining_started_at',type: 'datetime', required: false, description: 'When dining session started' },
      { name: 'created_at',       type: 'datetime', required: false, description: 'Table creation timestamp' },
    ],
    order: 'table_id',
  },

  kitchen_departments: {
    columns: [
      { name: 'dept_id',            type: 'integer',  required: true,  description: 'Unique department identifier' },
      { name: 'name',               type: 'text',     required: true,  description: 'Department name' },
      { name: 'icon',               type: 'text',     required: false, description: 'Display icon' },
      { name: 'color',              type: 'text',     required: false, description: 'Display color hex' },
      { name: 'is_active',          type: 'integer',  required: false, description: 'Active status (0/1)' },
      { name: 'sort_order',         type: 'integer',  required: false, description: 'Display sort order' },
      { name: 'sla_target_minutes', type: 'integer',  required: false, description: 'SLA target (minutes)' },
      { name: 'created_at',         type: 'datetime', required: false, description: 'Creation timestamp' },
    ],
    order: 'dept_id',
  },

  table_reservations: {
    columns: [
      { name: 'reservation_id',    type: 'integer',  required: true,  description: 'Unique reservation identifier' },
      { name: 'table_id',          type: 'integer',  required: false, description: 'FK to restaurant_tables' },
      { name: 'table_number',      type: 'text',     required: false, description: 'Table number (denormalized)' },
      { name: 'customer_name',     type: 'text',     required: true,  description: 'Guest name' },
      { name: 'customer_phone',    type: 'text',     required: false, description: 'Guest phone' },
      { name: 'guests',            type: 'integer',  required: false, description: 'Number of guests' },
      { name: 'reservation_date',  type: 'text',     required: true,  description: 'Reservation date' },
      { name: 'reservation_time',  type: 'text',     required: true,  description: 'Reservation time' },
      { name: 'duration_minutes',  type: 'integer',  required: false, description: 'Expected duration (minutes)' },
      { name: 'notes',             type: 'text',     required: false, description: 'Special requests' },
      { name: 'status',            type: 'text',     required: false, description: 'Status' },
      { name: 'created_at',        type: 'datetime', required: false, description: 'Creation timestamp' },
    ],
    order: 'reservation_id',
  },

  suppliers: {
    columns: [
      { name: 'supplier_id', type: 'integer',  required: true,  description: 'Unique supplier identifier' },
      { name: 'name',        type: 'text',     required: true,  description: 'Supplier name' },
      { name: 'contact',     type: 'text',     required: false, description: 'Contact person' },
      { name: 'phone',       type: 'text',     required: false, description: 'Phone number' },
      { name: 'email',       type: 'text',     required: false, description: 'Email address' },
      { name: 'address',     type: 'text',     required: false, description: 'Business address' },
      { name: 'notes',       type: 'text',     required: false, description: 'Supplier notes' },
      { name: 'is_active',   type: 'integer',  required: false, description: 'Active status (0/1)' },
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

  audit_logs: {
    columns: [
      { name: 'log_id',      type: 'integer',  required: true,  description: 'Unique audit log entry identifier' },
      { name: 'timestamp',   type: 'datetime', required: true,  description: 'Event timestamp' },
      { name: 'user_id',     type: 'integer',  required: false, description: 'FK to users' },
      { name: 'user_name',   type: 'text',     required: false, description: 'User display name at time of event' },
      { name: 'action_type', type: 'text',     required: true,  description: 'Action classification (LOGIN_SUCCESS, SHIFT_OPEN, CUSTOMER_CREATE, ...)' },
      { name: 'entity_type', type: 'text',     required: false, description: 'Type of entity affected (user, shift, customer, supplier, backup, ...)' },
      { name: 'entity_id',   type: 'integer',  required: false, description: 'ID of the affected entity' },
      { name: 'old_value',   type: 'text',     required: false, description: 'Previous state (JSON for complex changes)' },
      { name: 'new_value',   type: 'text',     required: false, description: 'New state (JSON for complex changes)' },
      { name: 'ip_address',  type: 'text',     required: false, description: 'Client IP address at time of event' },
      { name: 'notes',       type: 'text',     required: false, description: 'Human-readable event description' },
    ],
    order: 'log_id',
  },

  vat_rates: {
    columns: [
      { name: 'vat_rate_id', type: 'integer',  required: true,  description: 'Unique VAT rate identifier' },
      { name: 'name',        type: 'text',     required: true,  description: 'Rate display name (e.g. TVA 20%)' },
      { name: 'rate',        type: 'real',     required: true,  description: 'VAT percentage (e.g. 20.00)' },
      { name: 'is_active',   type: 'integer',  required: false, description: 'Whether this rate is currently active (0/1)' },
      { name: 'created_at',  type: 'datetime', required: false, description: 'Rate creation timestamp' },
    ],
    order: 'vat_rate_id',
  },

};

/**
 * Return canonical column names for a dataset in declaration order.
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
 * Return the header row for a CSV.
 */
function getCsvHeader(datasetKey) {
  return getColumnNames(datasetKey).join(',') + '\n';
}

/**
 * Check whether actual columns satisfy the schema contract.
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

/**
 * Return all dataset keys.
 */
function getAllDatasetKeys() {
  return Object.keys(SCHEMAS);
}

module.exports = {
  BI_SCHEMA_VERSION,
  EXPORT_VERSION,
  GENERATOR_VERSION,
  SCHEMAS,
  getColumnNames,
  getSchema,
  getCsvHeader,
  validateSchema,
  getAllDatasetKeys,
};
