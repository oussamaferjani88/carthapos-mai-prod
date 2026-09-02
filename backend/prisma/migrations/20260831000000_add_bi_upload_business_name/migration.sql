-- AlterTable: carry the detected business name through the upload so the
-- per-client dashboard keeps the real business name instead of falling back to
-- the client name.
ALTER TABLE "bi_uploads" ADD COLUMN "businessname" TEXT;
