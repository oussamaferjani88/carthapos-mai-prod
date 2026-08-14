-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';

-- AlterTable: clients -> user linkage
ALTER TABLE "clients" ADD COLUMN "userid" TEXT;

-- AlterTable: bi_dashboards -> versioning + request linkage
ALTER TABLE "bi_dashboards"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "templateused" TEXT,
ADD COLUMN "generator" TEXT NOT NULL DEFAULT 'wizard',
ADD COLUMN "generatedat" TIMESTAMP(3),
ADD COLUMN "requestid" TEXT;

-- AlterTable: bi_notifications -> role scoping
ALTER TABLE "bi_notifications" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'CLIENT';

-- AlterTable: bi_requests -> template + payment lifecycle
ALTER TABLE "bi_requests"
ADD COLUMN "dashboardtemplate" TEXT,
ADD COLUMN "paymentrequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bi_requests" ALTER COLUMN "paymentStatus" SET DEFAULT 'NOT_REQUIRED';

-- CreateTable: bi_dashboard_assignments
CREATE TABLE "bi_dashboard_assignments" (
    "id" TEXT NOT NULL,
    "clientid" TEXT NOT NULL,
    "dashboardid" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_dashboard_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bi_request_events
CREATE TABLE "bi_request_events" (
    "id" TEXT NOT NULL,
    "requestid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "performedby" TEXT,
    "performedbyrole" TEXT,
    "performedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_userid_key" ON "clients"("userid");
CREATE INDEX "bi_dashboards_clientid_idx" ON "bi_dashboards"("clientid");
CREATE INDEX "bi_dashboards_uploadid_idx" ON "bi_dashboards"("uploadid");
CREATE INDEX "bi_dashboards_requestid_idx" ON "bi_dashboards"("requestid");
CREATE INDEX "bi_notifications_clientid_idx" ON "bi_notifications"("clientid");
CREATE INDEX "bi_notifications_role_idx" ON "bi_notifications"("role");
CREATE INDEX "bi_dashboard_assignments_clientid_idx" ON "bi_dashboard_assignments"("clientid");
CREATE INDEX "bi_dashboard_assignments_dashboardid_idx" ON "bi_dashboard_assignments"("dashboardid");
CREATE INDEX "bi_request_events_requestid_idx" ON "bi_request_events"("requestid");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_requestid_fkey" FOREIGN KEY ("requestid") REFERENCES "bi_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bi_dashboard_assignments" ADD CONSTRAINT "bi_dashboard_assignments_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_dashboard_assignments" ADD CONSTRAINT "bi_dashboard_assignments_dashboardid_fkey" FOREIGN KEY ("dashboardid") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_request_events" ADD CONSTRAINT "bi_request_events_requestid_fkey" FOREIGN KEY ("requestid") REFERENCES "bi_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
