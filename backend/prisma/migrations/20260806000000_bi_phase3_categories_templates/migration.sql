-- Phase 3: notification categories (Part 8) + template metadata fields (Part 11).

-- 1) BiNotification.category — derived from type so the client/admin inboxes can
--    filter by Request / Dashboard / Payment / Validation / System.

ALTER TABLE "bi_notifications" ADD COLUMN "category" TEXT DEFAULT 'SYSTEM';

UPDATE "bi_notifications" SET "category" = CASE
  WHEN "type" LIKE 'REQUEST_%' OR "type" = 'NEW_REQUEST' THEN 'REQUEST'
  WHEN "type" LIKE 'PAYMENT_%' THEN 'PAYMENT'
  WHEN "type" LIKE 'ZIP_%' OR "type" LIKE 'ETL_%' THEN 'VALIDATION'
  WHEN "type" LIKE 'DASHBOARD_%' THEN 'DASHBOARD'
  ELSE 'SYSTEM'
END;

CREATE INDEX "bi_notifications_category_idx" ON "bi_notifications"("category");

-- 2) BiDashboardTemplate — richer template cards (Part 11): KPI/dimension/fact
--    metadata + an icon/illustration field.

ALTER TABLE "bi_dashboard_templates" ADD COLUMN "kpis" JSONB;
ALTER TABLE "bi_dashboard_templates" ADD COLUMN "dimensions" JSONB;
ALTER TABLE "bi_dashboard_templates" ADD COLUMN "facts" JSONB;
ALTER TABLE "bi_dashboard_templates" ADD COLUMN "image" TEXT;
