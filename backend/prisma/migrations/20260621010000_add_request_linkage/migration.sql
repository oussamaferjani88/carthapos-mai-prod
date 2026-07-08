-- AlterTable: Add requestId to bi_uploads for upload-request linkage
ALTER TABLE "bi_uploads" ADD COLUMN "requestid" TEXT;

-- CreateIndex
CREATE INDEX "bi_uploads_requestid_idx" ON "bi_uploads"("requestid");
