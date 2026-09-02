-- Migration: Add BiAnalysisRequest table (Phase 3)
-- Column names are lowercase to match schema.prisma @map() declarations.

CREATE TABLE IF NOT EXISTS "bi_analysis_requests" (
  "id" TEXT NOT NULL,
  "clientid" TEXT NOT NULL,
  "licenseid" TEXT,
  "uploadid" TEXT,
  "businesstype" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "assignedto" TEXT,
  "notes" TEXT,
  "analysissummary" JSONB,
  "insights" JSONB,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedat" TIMESTAMPTZ,

  CONSTRAINT "bi_analysis_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_analysis_requests_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "bi_analysis_requests_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE SET NULL,
  CONSTRAINT "bi_analysis_requests_uploadid_fkey" FOREIGN KEY ("uploadid") REFERENCES "bi_uploads"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bi_analysis_requests_clientid_idx" ON "bi_analysis_requests"("clientid");
CREATE INDEX IF NOT EXISTS "bi_analysis_requests_status_idx" ON "bi_analysis_requests"("status");
