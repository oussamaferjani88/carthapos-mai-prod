-- Add requestId to BiNotification so the UI can navigate to the linked request.

ALTER TABLE "bi_notifications" ADD COLUMN "requestid" TEXT;

ALTER TABLE "bi_notifications" ADD CONSTRAINT "bi_notifications_requestid_fkey"
  FOREIGN KEY ("requestid") REFERENCES "bi_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "bi_notifications_requestid_idx" ON "bi_notifications"("requestid");
