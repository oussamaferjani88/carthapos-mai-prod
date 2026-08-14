-- Collection-based dashboard assignment: BiDashboard gains the Metabase
-- dashboard id chosen by the admin at generation time. This replaces the
-- hardcoded businessType -> metabaseDashboardId mapping from the template
-- registry (which remains only as a fallback).

ALTER TABLE "bi_dashboards" ADD COLUMN IF NOT EXISTS "metabasedashboardid" INTEGER;
CREATE INDEX IF NOT EXISTS "bi_dashboards_metabasedashboardid_idx" ON "bi_dashboards"("metabasedashboardid");
