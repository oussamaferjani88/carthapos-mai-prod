-- Migration: Add BiDashboard and BiNotification tables (Phase 2)

-- Create bi_dashboards table
CREATE TABLE IF NOT EXISTS "bi_dashboards" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "licenseId" TEXT,
  "uploadId" TEXT,
  "businessType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "dashboardType" TEXT NOT NULL DEFAULT 'custom',
  "dashboardConfig" JSONB,
  "createdBy" TEXT,
  "assignedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bi_dashboards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_dashboards_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "bi_dashboards_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE SET NULL,
  CONSTRAINT "bi_dashboards_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "bi_uploads"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bi_dashboards_clientId_idx" ON "bi_dashboards"("clientId");
CREATE INDEX IF NOT EXISTS "bi_dashboards_status_idx" ON "bi_dashboards"("status");

-- Create bi_notifications table
CREATE TABLE IF NOT EXISTS "bi_notifications" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "dashboardId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'DASHBOARD_READY',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bi_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "bi_notifications_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "bi_dashboards"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bi_notifications_clientId_idx" ON "bi_notifications"("clientId");
CREATE INDEX IF NOT EXISTS "bi_notifications_isRead_idx" ON "bi_notifications"("isRead");
