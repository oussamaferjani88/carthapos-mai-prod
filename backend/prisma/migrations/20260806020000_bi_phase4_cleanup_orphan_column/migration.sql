-- BI Phase 4 hardening: drop orphaned legacy column.
-- bi_dashboards.generationsteps is not referenced by any code (grep of
-- backend/admin/frontend shows zero references) and is not modeled in
-- schema.prisma. Safe to remove.
ALTER TABLE "bi_dashboards" DROP COLUMN IF EXISTS "generationsteps";
