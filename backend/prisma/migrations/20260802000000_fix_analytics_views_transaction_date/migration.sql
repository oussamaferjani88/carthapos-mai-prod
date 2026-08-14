-- Migration: Fix Analytics Views — bucket by TRANSACTION DATE (dim_time via dimTimeId)
--
-- Bug being fixed: several BI views used fact_*.createdAt, which is the ETL
-- load/insert time (when the ZIP was imported), not when the POS transaction
-- happened. Analytics must represent the business date, i.e. the date stored in
-- dim_time (joined via fact_*.dimTimeId = YYYYMMDD).
--
-- createdAt columns are NOT removed — they are retained as audit/ETL metadata
-- under an explicit etl_loaded_at name so they cannot be mistaken for business
-- dates.
--
-- Postgres requires DROP before re-CREATE when view output columns change name.

DROP VIEW IF EXISTS v_peak_hours;
DROP VIEW IF EXISTS v_dashboard_kpis;
DROP VIEW IF EXISTS v_table_turnover;
DROP VIEW IF EXISTS v_appointments;
DROP VIEW IF EXISTS v_kitchen_orders;
DROP VIEW IF EXISTS v_sales;

-- 1. v_sales — sale_created_at was ETL load time; now labeled etl_loaded_at
-- (transaction date remains sale_date from dim_time)
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
  fs."createdAt"     AS etl_loaded_at,
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

-- 2. v_revenue_daily — already grouped by transaction date (dim_time); unchanged
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

-- 3. v_inventory — inventory is a point-in-time snapshot (no transaction date);
-- snapshot_date stays the load time. No business-date bucketing applies.
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

-- 4. v_product_performance — aggregate without a time dimension; unchanged
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

-- 5. v_kitchen_orders — order_created_at was ETL load time; now etl_loaded_at
-- (transaction date remains order_date from dim_time)
CREATE OR REPLACE VIEW v_kitchen_orders AS
SELECT
  fko."id"            AS id,
  fko."tenantId"      AS client_id,
  fko."tableNumber"   AS table_number,
  fko."items"         AS items,
  fko."priority"      AS priority,
  fko."status"        AS status,
  fko."createdAt"     AS etl_loaded_at,
  dt."date"           AS order_date,
  dt."year"           AS year,
  dt."month"          AS month,
  dt."day"            AS day,
  dt."dayOfWeek"      AS day_of_week,
  dt."isWeekend"      AS is_weekend
FROM "fact_kitchen_orders" fko
LEFT JOIN "dim_time" dt ON fko."dimTimeId" = dt."id";

-- 6. v_table_turnover — first/last order used ETL load time; now the TRANSACTION
-- date range from dim_time (joined via dimTimeId)
CREATE OR REPLACE VIEW v_table_turnover AS
SELECT
  fko."tenantId"        AS client_id,
  fko."tableNumber"     AS table_number,
  COUNT(*)              AS order_count,
  MIN(dt."date")        AS first_order_date,
  MAX(dt."date")        AS last_order_date
FROM "fact_kitchen_orders" fko
LEFT JOIN "dim_time" dt ON fko."dimTimeId" = dt."id"
WHERE fko."tableNumber" IS NOT NULL
GROUP BY fko."tenantId", fko."tableNumber";

-- 7. v_peak_hours — previously EXTRACT(HOUR FROM fact_sales.createdAt) i.e. the
-- LOAD hour. The warehouse schema stores only the transaction DATE (dim_time,
-- YYYYMMDD), no hour-of-day, so the honest fix is to aggregate by TRANSACTION
-- DATE instead of load time. Hour-of-day analytics for dashboards come from the
-- POS export timestamps (analytics cache), which carry the real business hour.
CREATE OR REPLACE VIEW v_peak_hours AS
SELECT
  fs."tenantId"         AS client_id,
  dt."date"             AS sale_date,
  COUNT(*)              AS order_count,
  SUM(fs."total")       AS revenue
FROM "fact_sales" fs
LEFT JOIN "dim_time" dt ON fs."dimTimeId" = dt."id"
GROUP BY fs."tenantId", dt."date"
ORDER BY fs."tenantId", sale_date;

-- 8. v_appointments — appointment_created_at was ETL load time; now etl_loaded_at
-- (appointment date remains appointment_date from dim_time)
CREATE OR REPLACE VIEW v_appointments AS
SELECT
  fa."id"               AS id,
  fa."tenantId"         AS client_id,
  fa."customerName"     AS customer_name,
  fa."customerPhone"    AS customer_phone,
  fa."serviceId"        AS service_id,
  fa."duration"         AS duration_minutes,
  fa."status"           AS status,
  fa."createdAt"        AS etl_loaded_at,
  dt."date"             AS appointment_date,
  dt."year"             AS year,
  dt."month"            AS month,
  dt."day"              AS day
FROM "fact_appointments" fa
LEFT JOIN "dim_time" dt ON fa."dimTimeId" = dt."id";

-- 9. v_suppliers — unchanged
CREATE OR REPLACE VIEW v_suppliers AS
SELECT
  ds."id"          AS id,
  ds."tenantId"    AS client_id,
  ds."name"        AS supplier_name,
  ds."contact"     AS contact_person,
  ds."phone"       AS phone,
  ds."email"       AS email
FROM "dim_suppliers" ds;

-- 10. v_dashboard_kpis — last_sale_date was MAX(fact_sales.createdAt) i.e. the
-- last LOAD time; now the last TRANSACTION date from dim_time
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
  MAX(dt."date")                         AS last_sale_date
FROM "dim_clients" dc
LEFT JOIN "fact_sales" fs ON dc."tenantId" = fs."tenantId"
LEFT JOIN "dim_time" dt ON fs."dimTimeId" = dt."id"
LEFT JOIN "dim_products" dp ON dc."tenantId" = dp."tenantId"
LEFT JOIN "fact_kitchen_orders" fko ON dc."tenantId" = fko."tenantId"
LEFT JOIN "fact_appointments" fa ON dc."tenantId" = fa."tenantId"
LEFT JOIN "dim_suppliers" dsup ON dc."tenantId" = dsup."tenantId"
GROUP BY dc."tenantId", dc."name", dc."businessType";
