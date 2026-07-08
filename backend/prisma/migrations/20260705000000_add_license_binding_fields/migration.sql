-- Add license binding and activation fields for Machine/USB/Hybrid support

ALTER TABLE "licenses" ADD COLUMN "bindingtype" TEXT NOT NULL DEFAULT 'MACHINE';
ALTER TABLE "licenses" ADD COLUMN "usbserialnumber" TEXT;
ALTER TABLE "licenses" ADD COLUMN "isactivated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "licenses" ADD COLUMN "activatedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "lastvalidatedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "createdby" TEXT DEFAULT 'admin';
