-- Migration: Create BI Views for Metabase
-- Pre-joins fact + dimension tables so Metabase users see clean flat tables.

-- 1. v_sales — Complete sales with client and date dimensions
CREATE OR REPLACE VIEW v_sales AS
SELECT
  fs."id"            AS id,
  fs."tenantId"      AS client_id,
  dc."name"          AS client_name,
  dc."businessType"  AS business_type,
  fs."saleId"        AS sale_id,
  fs."total"         AS total,
  fs."tax"           AS tax,
  fs."discount"      AS discount,
  fs."paymentMethod" AS payment_method,
  fs."createdAt"     AS sale_created_at,
  dt."date"          AS sale_date,
  dt."year"          AS year,
  dt."quarter"       AS quarter,
  dt."month"         AS month,
  dt."day"           AS day,
  dt."dayOfWeek"     AS day_of_week,
  dt."isWeekend"     AS is_weekend
FROM "fact_sales" fs
LEFT JOIN "dim_clients" dc ON fs."tenantId" = dc."tenantId"
LEFT JOIN "dim_time" dt ON fs."dimTimeId" = dt."id";

-- 2. v_revenue_daily — Pre-aggregated daily revenue per client
CREATE OR REPLACE VIEW v_revenue_daily AS
SELECT
  fs."tenantId"      AS client_id,
  dc."name"          AS client_name,
  dc."businessType"  AS business_type,
  dt."date"          AS date,
  dt."year"          AS year,
  dt."month"         AS month,
  dt."day"           AS day,
  dt."dayOfWeek"     AS day_of_week,
  COUNT(*)           AS transaction_count,
  SUM(fs."total")    AS revenue,
  AVG(fs."total")    AS avg_ticket
FROM "fact_sales" fs
LEFT JOIN "dim_clients" dc ON fs."tenantId" = dc."tenantId"
LEFT JOIN "dim_time" dt ON fs."dimTimeId" = dt."id"
GROUP BY fs."tenantId", dc."name", dc."businessType", dt."date", dt."year", dt."month", dt."day", dt."dayOfWeek";

-- 3. v_inventory — Inventory snapshot with product details
CREATE OR REPLACE VIEW v_inventory AS
SELECT
  fi."id"             AS id,
  fi."tenantId"       AS client_id,
  fi."productName"    AS product_name,
  dp."category"       AS category,
  dp."family"         AS family,
  dp."barcode"        AS barcode,
  fi."stock"          AS stock,
  fi."price"          AS price,
  fi."timesSold"      AS times_sold,
  CASE WHEN fi."stock" > 0
    THEN ROUND(fi."timesSold" * 1.0 / fi."stock", 2)
    ELSE 0
  END                 AS turnover_ratio,
  fi."createdAt"      AS snapshot_date
FROM "fact_inventory" fi
LEFT JOIN "dim_products" dp ON fi."dimProductId" = dp."id";

-- 4. v_product_performance — Product sales aggregated per client
CREATE OR REPLACE VIEW v_product_performance AS
SELECT
  fi."tenantId"       AS client_id,
  fi."productName"    AS product_name,
  dp."category"       AS category,
  dp."family"         AS family,
  SUM(fi."timesSold") AS total_sold,
  MAX(fi."stock")     AS current_stock,
  MAX(fi."price")     AS unit_price,
  SUM(fi."price" * fi."timesSold") AS estimated_revenue,
  CASE WHEN MAX(fi."stock") > 0
    THEN ROUND(SUM(fi."timesSold") * 1.0 / GREATEST(MAX(fi."stock"), 1), 2)
    ELSE 0
  END                 AS turnover_ratio
FROM "fact_inventory" fi
LEFT JOIN "dim_products" dp ON fi."dimProductId" = dp."id"
GROUP BY fi."tenantId", fi."productName", dp."category", dp."family";

-- 5. v_kitchen_orders — Kitchen orders with date info (restaurant)
CREATE OR REPLACE VIEW v_kitchen_orders AS
SELECT
  fko."id"            AS id,
  fko."tenantId"      AS client_id,
  fko."tableNumber"   AS table_number,
  fko."items"         AS items,
  fko."priority"      AS priority,
  fko."status"        AS status,
  fko."createdAt"     AS order_created_at,
  dt."date"           AS order_date,
  dt."year"           AS year,
  dt."month"          AS month,
  dt."day"            AS day,
  dt."dayOfWeek"      AS day_of_week,
  dt."isWeekend"      AS is_weekend
FROM "fact_kitchen_orders" fko
LEFT JOIN "dim_time" dt ON fko."dimTimeId" = dt."id";

-- 6. v_table_turnover — Orders per table (restaurant)
CREATE OR REPLACE VIEW v_table_turnover AS
SELECT
  fko."tenantId"       AS client_id,
  fko."tableNumber"    AS table_number,
  COUNT(*)             AS order_count,
  MIN(fko."createdAt") AS first_order,
  MAX(fko."createdAt") AS last_order
FROM "fact_kitchen_orders" fko
WHERE fko."tableNumber" IS NOT NULL
GROUP BY fko."tenantId", fko."tableNumber";

-- 7. v_peak_hours — Sales distribution by hour of day
CREATE OR REPLACE VIEW v_peak_hours AS
SELECT
  fs."tenantId"        AS client_id,
  EXTRACT(HOUR FROM fs."createdAt") AS hour_of_day,
  COUNT(*)             AS order_count,
  SUM(fs."total")      AS revenue
FROM "fact_sales" fs
GROUP BY fs."tenantId", EXTRACT(HOUR FROM fs."createdAt")
ORDER BY fs."tenantId", hour_of_day;

-- 8. v_appointments — Appointments with date info (pharmacy)
CREATE OR REPLACE VIEW v_appointments AS
SELECT
  fa."id"               AS id,
  fa."tenantId"         AS client_id,
  fa."customerName"     AS customer_name,
  fa."customerPhone"    AS customer_phone,
  fa."serviceId"        AS service_id,
  fa."duration"         AS duration_minutes,
  fa."status"           AS status,
  fa."createdAt"        AS appointment_created_at,
  dt."date"             AS appointment_date,
  dt."year"             AS year,
  dt."month"            AS month,
  dt."day"              AS day
FROM "fact_appointments" fa
LEFT JOIN "dim_time" dt ON fa."dimTimeId" = dt."id";

-- 9. v_suppliers — Supplier directory
CREATE OR REPLACE VIEW v_suppliers AS
SELECT
  ds."id"          AS id,
  ds."tenantId"    AS client_id,
  ds."name"        AS supplier_name,
  ds."contact"     AS contact_person,
  ds."phone"       AS phone,
  ds."email"       AS email
FROM "dim_suppliers" ds;

-- 10. v_dashboard_kpis — High-level KPIs per client
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  dc."tenantId"                          AS client_id,
  dc."name"                              AS client_name,
  dc."businessType"                      AS business_type,
  COUNT(DISTINCT fs."id")                AS total_sales,
  COALESCE(SUM(fs."total"), 0)           AS total_revenue,
  COALESCE(AVG(fs."total"), 0)           AS avg_ticket,
  COUNT(DISTINCT dp."id")                AS total_products,
  COUNT(DISTINCT fko."id")               AS total_kitchen_orders,
  COUNT(DISTINCT fa."id")                AS total_appointments,
  COUNT(DISTINCT dsup."id")              AS total_suppliers,
  MAX(fs."createdAt")                    AS last_sale_date
FROM "dim_clients" dc
LEFT JOIN "fact_sales" fs ON dc."tenantId" = fs."tenantId"
LEFT JOIN "dim_products" dp ON dc."tenantId" = dp."tenantId"
LEFT JOIN "fact_kitchen_orders" fko ON dc."tenantId" = fko."tenantId"
LEFT JOIN "fact_appointments" fa ON dc."tenantId" = fa."tenantId"
LEFT JOIN "dim_suppliers" dsup ON dc."tenantId" = dsup."tenantId"
GROUP BY dc."tenantId", dc."name", dc."businessType";
