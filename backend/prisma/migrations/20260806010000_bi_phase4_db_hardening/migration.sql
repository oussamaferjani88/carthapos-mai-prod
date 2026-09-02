-- Phase 4: DB hardening — reconcile drift between schema.prisma and the live database.
-- Warehouse/legacy drift is intentionally NOT touched (ETL creates those indexes at runtime
-- and Prisma never modeled them; constraint renames on legacy tables are cosmetic noise).

-- 1) Schema declares BiNotification.category as required with @default("SYSTEM");
--    the Phase 3 migration added it nullable and backfilled. Enforce NOT NULL now.

ALTER TABLE "bi_notifications" ALTER COLUMN "category" SET NOT NULL;

-- 2) Schema declares @unique on BiUpload.fileHash and BiProcessingJob.uploadId.
--    bi_uploads.filehash unique index is already created by 20260606120000;
--    bi_processing_jobs.uploadid unique index was never created, add it now.

CREATE UNIQUE INDEX "bi_processing_jobs_uploadid_key" ON "bi_processing_jobs"("uploadid");

-- 3) bi_analysis_requests @@index([clientId]) is already created by
--    20260611210000 (bi_analysis_requests_clientid_idx). Nothing to add here.
