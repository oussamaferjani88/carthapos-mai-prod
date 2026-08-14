-- Migration: Fix v_dashboard_kpis performance
--
-- The original v_dashboard_kpis computed every KPI with one multiplicative
-- cross join:
--   dim_clients × fact_sales × dim_products × fact_kitchen_orders × ...
-- With a restaurant export (2500 sales × 19 products × 402 kitchen orders)
-- that materializes ~19M intermediate rows and takes minutes per query —
-- it blocks any dashboard render.
--
-- The view is rewritten to compute each KPI with an independent, indexed
-- scalar subquery per tenant. Output columns are UNCHANGED, so existing
-- Metabase questions keep working.
--
-- Supporting indexes are added on the tenant-isolation column (tenantId) that
-- the subqueries filter on.

DROP VIEW IF EXISTS v_dashboard_kpis;

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  dc."tenantId"                 AS client_id,
  dc."name"                     AS client_name,
  dc."businessType"             AS business_type,
  (SELECT COUNT(DISTINCT fs."id")
     FROM "fact_sales" fs WHERE fs."tenantId" = dc."tenantId")            AS total_sales,
  (SELECT COALESCE(SUM(fs."total"), 0)
     FROM "fact_sales" fs WHERE fs."tenantId" = dc."tenantId")            AS total_revenue,
  (SELECT ROUND(COALESCE(AVG(fs."total"), 0)::numeric, 2)::double precision
     FROM "fact_sales" fs WHERE fs."tenantId" = dc."tenantId")            AS avg_ticket,
  (SELECT COUNT(DISTINCT dp."id")
     FROM "dim_products" dp WHERE dp."tenantId" = dc."tenantId")          AS total_products,
  (SELECT COUNT(DISTINCT fko."id")
     FROM "fact_kitchen_orders" fko WHERE fko."tenantId" = dc."tenantId") AS total_kitchen_orders,
  (SELECT COUNT(DISTINCT fa."id")
     FROM "fact_appointments" fa WHERE fa."tenantId" = dc."tenantId")     AS total_appointments,
  (SELECT COUNT(DISTINCT dsup."id")
     FROM "dim_suppliers" dsup WHERE dsup."tenantId" = dc."tenantId")     AS total_suppliers,
  (SELECT MAX(dt."date")
     FROM "fact_sales" fs2
     LEFT JOIN "dim_time" dt ON fs2."dimTimeId" = dt."id"
     WHERE fs2."tenantId" = dc."tenantId")                                AS last_sale_date
FROM "dim_clients" dc;

CREATE INDEX IF NOT EXISTS "fact_sales_tenantId_idx" ON "fact_sales"("tenantId");
CREATE INDEX IF NOT EXISTS "fact_kitchen_orders_tenantId_idx" ON "fact_kitchen_orders"("tenantId");
CREATE INDEX IF NOT EXISTS "fact_appointments_tenantId_idx" ON "fact_appointments"("tenantId");
CREATE INDEX IF NOT EXISTS "fact_inventory_tenantId_idx" ON "fact_inventory"("tenantId");
CREATE INDEX IF NOT EXISTS "dim_products_tenantId_idx" ON "dim_products"("tenantId");
CREATE INDEX IF NOT EXISTS "dim_suppliers_tenantId_idx" ON "dim_suppliers"("tenantId");
