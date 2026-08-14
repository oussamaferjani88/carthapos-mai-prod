-- Migration: Add BiDashboardTemplate registry table
-- Model BiDashboardTemplate exists in schema.prisma but its migration was
-- never created, so the table is missing from the database. This migration
-- brings the database in line with the schema.
--
-- Column names use the Prisma @map values (lowercase), matching the
-- convention of the other BI tables in this database.

CREATE TABLE IF NOT EXISTS "bi_dashboard_templates" (
  "id" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "metabaseDashboardId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "embedType" TEXT NOT NULL DEFAULT 'none',
  "embedPublicUuid" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bi_dashboard_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_dashboard_templates_businessType_key" UNIQUE ("businessType")
);

-- Normalize column names to the Prisma @map values used across the schema.
ALTER TABLE "bi_dashboard_templates"
  RENAME COLUMN "businessType" TO "businesstype";
ALTER TABLE "bi_dashboard_templates"
  RENAME COLUMN "metabaseDashboardId" TO "metabasedashboardid";
ALTER TABLE "bi_dashboard_templates"
  RENAME COLUMN "embedType" TO "embedtype";
ALTER TABLE "bi_dashboard_templates"
  RENAME COLUMN "embedPublicUuid" TO "embedpublicuuid";
ALTER TABLE "bi_dashboard_templates"
  RENAME COLUMN "createdAt" TO "createdat";
ALTER TABLE "bi_dashboard_templates"
  RENAME COLUMN "updatedAt" TO "updatedat";

-- Keep the unique constraint name aligned with the @unique attribute.
ALTER TABLE "bi_dashboard_templates"
  DROP CONSTRAINT "bi_dashboard_templates_businessType_key";
ALTER TABLE "bi_dashboard_templates"
  ADD CONSTRAINT "bi_dashboard_templates_businessType_key" UNIQUE ("businesstype");
