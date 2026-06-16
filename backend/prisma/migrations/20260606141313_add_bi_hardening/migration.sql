-- AlterTable
ALTER TABLE "fact_appointments" ALTER COLUMN "rowIndex" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fact_inventory" ALTER COLUMN "rowIndex" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fact_kitchen_orders" ALTER COLUMN "rowIndex" DROP DEFAULT;
