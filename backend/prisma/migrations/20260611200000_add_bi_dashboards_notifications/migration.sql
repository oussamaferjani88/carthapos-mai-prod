-- Migration: Add BiDashboard and BiNotification tables (Phase 2)
-- Column names are lowercase to match schema.prisma @map() declarations.

-- Create bi_dashboards table
CREATE TABLE IF NOT EXISTS "bi_dashboards" (
  "id" TEXT NOT NULL,
  "clientid" TEXT NOT NULL,
  "licenseid" TEXT,
  "uploadid" TEXT,
  "businesstype" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "dashboardtype" TEXT NOT NULL DEFAULT 'custom',
  "dashboardconfig" JSONB,
  "createdby" TEXT,
  "assignedat" TIMESTAMPTZ,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bi_dashboards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_dashboards_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "bi_dashboards_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE SET NULL,
  CONSTRAINT "bi_dashboards_uploadid_fkey" FOREIGN KEY ("uploadid") REFERENCES "bi_uploads"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bi_dashboards_clientid_idx" ON "bi_dashboards"("clientid");
CREATE INDEX IF NOT EXISTS "bi_dashboards_status_idx" ON "bi_dashboards"("status");

-- Create bi_notifications table
CREATE TABLE IF NOT EXISTS "bi_notifications" (
  "id" TEXT NOT NULL,
  "clientid" TEXT,
  "dashboardid" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'DASHBOARD_READY',
  "isread" BOOLEAN NOT NULL DEFAULT false,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bi_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_notifications_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "bi_notifications_dashboardid_fkey" FOREIGN KEY ("dashboardid") REFERENCES "bi_dashboards"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bi_notifications_clientid_idx" ON "bi_notifications"("clientid");
CREATE INDEX IF NOT EXISTS "bi_notifications_isread_idx" ON "bi_notifications"("isread");
