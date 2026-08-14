-- Migration: Materialize Missing BI Datasets + Warehouse Readiness Fix
--
-- WHAT THIS DOES
-- 1. Materializes datasets that the POS exports but the ETL previously DROPPED:
--    customers -> dim_customers, sale_items -> fact_sale_items,
--    kitchen_order_items -> fact_kitchen_order_items.
-- 2. Adds hourly support to the warehouse: fact_sales.transactionHour and
--    fact_kitchen_orders.transactionHour (business hour-of-day, 0-23) so
--    peak-hours/sales-by-hour analytics live in the warehouse, not in load time.
-- 3. Links facts to dimensions: fact_sales.dimClientId is now populated, plus
--    fact_sales.customerId / dimCustomerId for customer analytics.
-- 4. Stores kitchen prep timestamps (started/ready/completed) and the source
--    order_id on fact_kitchen_orders so kitchen performance (prep minutes) and
--    the order<->order_items join are possible.
-- 5. FIXES product-performance analytics: v_product_performance now aggregates
--    REAL sale lines (fact_sale_items) instead of the point-in-time inventory
--    snapshot, and v_peak_hours buckets by the business hour instead of load time.
--
-- All additions are additive. Existing fact/dimension tables and columns are
-- kept; createdAt columns remain ETL load time (etl_loaded_at in views).

-- 1. dim_customers -----------------------------------------------------------
CREATE TABLE "dim_customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "exportId" TEXT,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "loyaltyPoints" INTEGER,
    "totalSpent" DOUBLE PRECISION,
    "visitCount" INTEGER,
    "lastVisitDate" TIMESTAMP(3),
    "tags" TEXT,
    "isActive" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dim_customers_tenantId_idx" ON "dim_customers"("tenantId");
CREATE INDEX "dim_customers_customerId_idx" ON "dim_customers"("customerId");

-- 2. fact_sale_items ---------------------------------------------------------
CREATE TABLE "fact_sale_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "exportId" TEXT,
    "dimClientId" TEXT,
    "dimProductId" TEXT,
    "dimTimeId" INTEGER,
    "saleItemId" TEXT,
    "saleId" TEXT,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "lineTotal" DOUBLE PRECISION,
    "vatRate" DOUBLE PRECISION,
    "vatAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "productName" TEXT,
    "category" TEXT,
    "family" TEXT,
    "transactionHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_sale_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fact_sale_items_exportId_saleItemId_key" ON "fact_sale_items"("exportId", "saleItemId");
CREATE INDEX "fact_sale_items_tenantId_idx" ON "fact_sale_items"("tenantId");
CREATE INDEX "fact_sale_items_dimProductId_idx" ON "fact_sale_items"("dimProductId");
CREATE INDEX "fact_sale_items_dimTimeId_idx" ON "fact_sale_items"("dimTimeId");

-- 3. fact_kitchen_order_items ------------------------------------------------
CREATE TABLE "fact_kitchen_order_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "exportId" TEXT,
    "dimClientId" TEXT,
    "dimTimeId" INTEGER,
    "kitchenOrderItemId" TEXT,
    "orderId" TEXT,
    "saleId" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "lineTotal" DOUBLE PRECISION,
    "department" TEXT,
    "preparationTime" INTEGER,
    "transactionHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_kitchen_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fact_kitchen_order_items_exportId_kitchenOrderItemId_key" ON "fact_kitchen_order_items"("exportId", "kitchenOrderItemId");
CREATE INDEX "fact_kitchen_order_items_tenantId_idx" ON "fact_kitchen_order_items"("tenantId");
CREATE INDEX "fact_kitchen_order_items_orderId_idx" ON "fact_kitchen_order_items"("orderId");
CREATE INDEX "fact_kitchen_order_items_dimTimeId_idx" ON "fact_kitchen_order_items"("dimTimeId");

-- 4. fact_sales additions (hour + customer linkage) ---------------------------
ALTER TABLE "fact_sales"
    ADD COLUMN "customerId" TEXT,
    ADD COLUMN "dimCustomerId" TEXT,
    ADD COLUMN "transactionHour" INTEGER;

CREATE INDEX "fact_sales_customerId_idx" ON "fact_sales"("customerId");
CREATE INDEX "fact_sales_dimCustomerId_idx" ON "fact_sales"("dimCustomerId");
CREATE INDEX "fact_sales_transactionHour_idx" ON "fact_sales"("transactionHour");

-- 5. fact_kitchen_orders additions (hour + prep timestamps + order link) ------
ALTER TABLE "fact_kitchen_orders"
    ADD COLUMN "orderId" TEXT,
    ADD COLUMN "transactionHour" INTEGER,
    ADD COLUMN "startedAt" TIMESTAMP(3),
    ADD COLUMN "readyAt" TIMESTAMP(3),
    ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX "fact_kitchen_orders_orderId_idx" ON "fact_kitchen_orders"("orderId");
CREATE INDEX "fact_kitchen_orders_transactionHour_idx" ON "fact_kitchen_orders"("transactionHour");

-- 6. Foreign keys ---------------------------------------------------------------
ALTER TABLE "fact_sale_items" ADD CONSTRAINT "fact_sale_items_dimClientId_fkey" FOREIGN KEY ("dimClientId") REFERENCES "dim_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fact_sale_items" ADD CONSTRAINT "fact_sale_items_dimProductId_fkey" FOREIGN KEY ("dimProductId") REFERENCES "dim_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fact_sale_items" ADD CONSTRAINT "fact_sale_items_dimTimeId_fkey" FOREIGN KEY ("dimTimeId") REFERENCES "dim_time"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fact_kitchen_order_items" ADD CONSTRAINT "fact_kitchen_order_items_dimClientId_fkey" FOREIGN KEY ("dimClientId") REFERENCES "dim_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fact_kitchen_order_items" ADD CONSTRAINT "fact_kitchen_order_items_dimTimeId_fkey" FOREIGN KEY ("dimTimeId") REFERENCES "dim_time"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fact_sales" ADD CONSTRAINT "fact_sales_dimCustomerId_fkey" FOREIGN KEY ("dimCustomerId") REFERENCES "dim_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- Postgres requires DROP before re-CREATE when view output columns change name.
-- ═════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_product_performance;
DROP VIEW IF EXISTS v_peak_hours;

-- 7. v_product_performance — FIXED: real revenue from sale lines
-- (previously it aggregated the point-in-time inventory snapshot, which
-- under-reported and broke when source stock was missing).
CREATE OR REPLACE VIEW v_product_performance AS
SELECT
  fsi."tenantId" AS client_id,
  COALESCE(NULLIF(fsi."productName", ''), dp."name", 'Unknown Product') AS product_name,
  dp."category"  AS category,
  dp."family"    AS family,
  SUM(fsi."quantity") AS total_sold,
  COUNT(DISTINCT fsi."saleId") AS order_count,
  ROUND(AVG(fsi."unitPrice")::numeric, 2)::double precision AS unit_price,
  ROUND(SUM(fsi."lineTotal")::numeric, 2)::double precision AS revenue,
  ROUND(SUM(fsi."vatAmount")::numeric, 2)::double precision AS vat_amount
FROM "fact_sale_items" fsi
LEFT JOIN "dim_products" dp ON fsi."dimProductId" = dp."id"
GROUP BY fsi."tenantId", COALESCE(NULLIF(fsi."productName", ''), dp."name", 'Unknown Product'), dp."category", dp."family";

-- 8. v_peak_hours — FIXED: buckets by the BUSINESS HOUR (transactionHour)
-- (previously it grouped by the ETL load date because the warehouse only kept
-- the transaction date; hour-of-day now lives in the warehouse schema).
CREATE OR REPLACE VIEW v_peak_hours AS
SELECT
  fs."tenantId"        AS client_id,
  fs."transactionHour" AS hour_of_day,
  COUNT(*)             AS order_count,
  SUM(fs."total")      AS revenue
FROM "fact_sales" fs
WHERE fs."transactionHour" IS NOT NULL
GROUP BY fs."tenantId", fs."transactionHour"
ORDER BY fs."tenantId", hour_of_day;

-- 9. v_sales_hourly — transaction date x hour grid (NEW)
CREATE OR REPLACE VIEW v_sales_hourly AS
SELECT
  fs."tenantId"        AS client_id,
  dt."date"            AS sale_date,
  fs."transactionHour" AS hour_of_day,
  COUNT(*)             AS order_count,
  SUM(fs."total")      AS revenue,
  SUM(fs."tax")        AS tax
FROM "fact_sales" fs
LEFT JOIN "dim_time" dt ON fs."dimTimeId" = dt."id"
WHERE fs."transactionHour" IS NOT NULL
GROUP BY fs."tenantId", dt."date", fs."transactionHour";

-- 10. v_customer_analysis — customer dimension + lifetime behaviour (NEW)
CREATE OR REPLACE VIEW v_customer_analysis AS
SELECT
  dc."tenantId"       AS client_id,
  dc."customerId"     AS customer_id,
  dc."name"           AS customer_name,
  dc."email"          AS email,
  dc."phone"          AS phone,
  dc."loyaltyPoints"  AS loyalty_points,
  dc."totalSpent"     AS total_spent,
  dc."visitCount"     AS visit_count,
  dc."lastVisitDate"  AS last_visit_date,
  COUNT(DISTINCT fs."id") AS order_count,
  COALESCE(SUM(fs."total"), 0) AS lifetime_revenue,
  ROUND(COALESCE(AVG(fs."total"), 0)::numeric, 2)::double precision AS avg_ticket,
  MIN(dt."date")      AS first_order_date,
  MAX(dt."date")      AS last_order_date
FROM "dim_customers" dc
LEFT JOIN "fact_sales" fs ON fs."tenantId" = dc."tenantId" AND fs."customerId" = dc."customerId"
LEFT JOIN "dim_time" dt ON fs."dimTimeId" = dt."id"
GROUP BY dc."tenantId", dc."customerId", dc."name", dc."email", dc."phone",
         dc."loyaltyPoints", dc."totalSpent", dc."visitCount", dc."lastVisitDate";

-- 11. v_kitchen_performance — order grain + line aggregates + prep minutes (NEW)
CREATE OR REPLACE VIEW v_kitchen_performance AS
SELECT
  fko."id"            AS id,
  fko."tenantId"      AS client_id,
  fko."orderId"       AS order_id,
  fko."tableNumber"   AS table_number,
  fko."priority"      AS priority,
  fko."status"        AS status,
  dt."date"           AS order_date,
  fko."startedAt"     AS started_at,
  fko."readyAt"       AS ready_at,
  fko."completedAt"   AS completed_at,
  ROUND(EXTRACT(EPOCH FROM (COALESCE(fko."readyAt", fko."completedAt") - fko."startedAt")) / 60, 1) AS prep_minutes,
  COUNT(fkoi."id")    AS item_count,
  COALESCE(SUM(fkoi."quantity"), 0) AS total_quantity,
  COALESCE(SUM(fkoi."lineTotal"), 0) AS total_revenue
FROM "fact_kitchen_orders" fko
LEFT JOIN "dim_time" dt ON fko."dimTimeId" = dt."id"
LEFT JOIN "fact_kitchen_order_items" fkoi ON fkoi."tenantId" = fko."tenantId" AND fkoi."orderId" = fko."orderId"
GROUP BY fko."id", fko."tenantId", fko."orderId", fko."tableNumber", fko."priority",
         fko."status", dt."date", fko."startedAt", fko."readyAt", fko."completedAt";

-- 12. v_inventory_status — stock status + data-quality warning (NEW)
-- The warning surfaces when the source export carries no stock at all
-- (products.csv stock = 0 everywhere), so dashboards never present a
-- "0 in stock" report as if it were real inventory data.
CREATE OR REPLACE VIEW v_inventory_status AS
WITH tenant_max AS (
  SELECT "tenantId", MAX("stock") AS max_stock FROM "fact_inventory" GROUP BY "tenantId"
)
SELECT
  fi."tenantId"       AS client_id,
  fi."productName"    AS product_name,
  dp."category"       AS category,
  dp."family"         AS family,
  fi."stock"          AS stock,
  fi."price"          AS price,
  fi."timesSold"      AS times_sold,
  CASE
    WHEN fi."stock" <= 0 THEN 'OUT_OF_STOCK'
    WHEN fi."stock" <= 5 THEN 'LOW'
    ELSE 'IN_STOCK'
  END                 AS stock_status,
  CASE
    WHEN tm."max_stock" IS NULL OR tm."max_stock" <= 0 THEN 'INVENTORY_DATA_NOT_AVAILABLE'
    ELSE NULL
  END                 AS data_warning
FROM "fact_inventory" fi
LEFT JOIN "dim_products" dp ON fi."dimProductId" = dp."id"
LEFT JOIN tenant_max tm ON tm."tenantId" = fi."tenantId";
