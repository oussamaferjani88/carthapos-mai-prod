-- Migration: Add BiAnalysisRequest table (Phase 3)

CREATE TABLE IF NOT EXISTS "bi_analysis_requests" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "licenseId" TEXT,
  "uploadId" TEXT,
  "businessType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "assignedTo" TEXT,
  "notes" TEXT,
  "analysisSummary" JSONB,
  "insights" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ,

  CONSTRAINT "bi_analysis_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bi_analysis_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "bi_analysis_requests_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE SET NULL,
  CONSTRAINT "bi_analysis_requests_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "bi_uploads"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bi_analysis_requests_clientId_idx" ON "bi_analysis_requests"("clientId");
CREATE INDEX IF NOT EXISTS "bi_analysis_requests_status_idx" ON "bi_analysis_requests"("status");
