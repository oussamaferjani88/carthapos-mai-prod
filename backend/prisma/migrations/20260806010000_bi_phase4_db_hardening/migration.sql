-- Phase 4: DB hardening — reconcile drift between schema.prisma and the live database.
-- Warehouse/legacy drift is intentionally NOT touched (ETL creates those indexes at runtime
-- and Prisma never modeled them; constraint renames on legacy tables are cosmetic noise).

-- 1) Schema declares BiNotification.category as required with @default("SYSTEM");
--    the Phase 3 migration added it nullable and backfilled. Enforce NOT NULL now.

ALTER TABLE "bi_notifications" ALTER COLUMN "category" SET NOT NULL;

-- 2) Schema declares @unique on BiUpload.fileHash and BiProcessingJob.uploadId, but the
--    unique constraints were never created. No duplicate rows exist (verified), so safe.

CREATE UNIQUE INDEX "bi_uploads_filehash_key" ON "bi_uploads"("filehash");
CREATE UNIQUE INDEX "bi_processing_jobs_uploadid_key" ON "bi_processing_jobs"("uploadid");

-- 3) Schema declares @@index([clientId]) on BiAnalysisRequest; never created. Add it.

CREATE INDEX "bi_analysis_requests_clientid_idx" ON "bi_analysis_requests"("clientid");
