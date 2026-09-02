-- License V2 security model: lifecycle status, Ed25519 signed payloads,
-- canonical machine/USB binding identity, and audit/history tables.

-- Lifecycle + failure-reason enums
CREATE TYPE "LicenseStatus" AS ENUM (
  'CREATED',
  'ISSUED',
  'ACTIVATED',
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
  'REPLACED',
  'RENEWED'
);

CREATE TYPE "LicenseFailureReason" AS ENUM (
  'NO_LICENSE',
  'INVALID_SIGNATURE',
  'EXPIRED',
  'REVOKED',
  'SUSPENDED',
  'MACHINE_MISMATCH',
  'USB_NOT_FOUND',
  'USB_MISMATCH',
  'HYBRID_BINDING_FAILED',
  'CLOCK_ROLLBACK',
  'OFFLINE_GRACE_EXPIRED',
  'LICENSE_CORRUPTED',
  'UNSUPPORTED_LICENSE_VERSION'
);

-- Lifecycle / security columns on licenses
ALTER TABLE "licenses" ADD COLUMN "status" "LicenseStatus" NOT NULL DEFAULT 'CREATED';
ALTER TABLE "licenses" ADD COLUMN "legacy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "licenses" ADD COLUMN "licenseversion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "licenses" ADD COLUMN "machinefingerprint" TEXT;
ALTER TABLE "licenses" ADD COLUMN "activatedmachineid" TEXT;
ALTER TABLE "licenses" ADD COLUMN "usbdeviceid" TEXT;
ALTER TABLE "licenses" ADD COLUMN "activationcount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "licenses" ADD COLUMN "transfercount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "licenses" ADD COLUMN "maxtransfers" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "licenses" ADD COLUMN "issuedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "suspendedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "revokedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "renewedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "replacedat" TIMESTAMP(3);
ALTER TABLE "licenses" ADD COLUMN "replacedbyid" TEXT;
ALTER TABLE "licenses" ADD COLUMN "signature" TEXT;
ALTER TABLE "licenses" ADD COLUMN "signedlicensepayload" JSONB;
ALTER TABLE "licenses" ADD COLUMN "publickeyfingerprint" TEXT;
ALTER TABLE "licenses" ADD COLUMN "lastvalidationresult" TEXT;

-- Backfill: existing rows are legacy licenses (v0, no Ed25519 signature).
-- Active legacy rows keep working; inactive ones are treated as revoked.
UPDATE "licenses" SET "legacy" = true, "licenseversion" = 0,
  "status" = CASE WHEN "isactive" THEN 'ACTIVE'::"LicenseStatus" ELSE 'REVOKED'::"LicenseStatus" END;

-- License activation / lifecycle audit trail
CREATE TABLE "license_activation_histories" (
    "id" TEXT NOT NULL,
    "licenseid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromstatus" "LicenseStatus",
    "tostatus" "LicenseStatus",
    "details" JSONB,
    "performedby" TEXT,
    "performedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_activation_histories_pkey" PRIMARY KEY ("id")
);

-- License validation log (offline + online attempts)
CREATE TABLE "license_validation_logs" (
    "id" TEXT NOT NULL,
    "licenseid" TEXT NOT NULL,
    "isvalid" BOOLEAN NOT NULL,
    "reason" "LicenseFailureReason",
    "status" TEXT,
    "details" JSONB,
    "validatedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_validation_logs_pkey" PRIMARY KEY ("id")
);

-- License machine/USB transfer audit trail
CREATE TABLE "license_transfer_histories" (
    "id" TEXT NOT NULL,
    "licenseid" TEXT NOT NULL,
    "transfertype" TEXT NOT NULL,
    "frommachinefingerprint" TEXT,
    "tomachinefingerprint" TEXT,
    "fromusbdeviceid" TEXT,
    "tousbdeviceid" TEXT,
    "authorizedby" TEXT,
    "authorizedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_transfer_histories_pkey" PRIMARY KEY ("id")
);

-- Foreign keys + indexes
ALTER TABLE "license_activation_histories" ADD CONSTRAINT "license_activation_histories_licenseid_fkey"
    FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "license_activation_histories_licenseid_idx" ON "license_activation_histories"("licenseid");

ALTER TABLE "license_validation_logs" ADD CONSTRAINT "license_validation_logs_licenseid_fkey"
    FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "license_validation_logs_licenseid_idx" ON "license_validation_logs"("licenseid");
CREATE INDEX "license_validation_logs_validatedat_idx" ON "license_validation_logs"("validatedat");

ALTER TABLE "license_transfer_histories" ADD CONSTRAINT "license_transfer_histories_licenseid_fkey"
    FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "license_transfer_histories_licenseid_idx" ON "license_transfer_histories"("licenseid");
