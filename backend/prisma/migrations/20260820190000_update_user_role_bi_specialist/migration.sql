-- Replace CASHIER/KITCHEN (POS-application-only roles, not platform roles)
-- with BI_SPECIALIST on the platform's UserRole enum. CASHIER/KITCHEN
-- continue to exist as local roles inside each generated POS's own
-- SQLite `users` table — this migration only touches the central
-- CarthaPOS platform's Postgres `UserRole` enum.
--
-- No existing "users" row uses CASHIER or KITCHEN at the time of writing
-- (verified: single row, role = SUPER_ADMIN), so this is a safe direct
-- swap with no data backfill required.

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CLIENT', 'BI_SPECIALIST');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT';

DROP TYPE "UserRole_old";
