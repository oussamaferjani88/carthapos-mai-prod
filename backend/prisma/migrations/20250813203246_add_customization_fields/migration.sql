/*
  Warnings:

  - The `shadowIntensity` column on the `license_configurations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "license_configurations" ADD COLUMN     "appTitle" TEXT,
ADD COLUMN     "autoModeSwitch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoSave" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "backdropBlur" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "borderColor" TEXT NOT NULL DEFAULT '#E5E7EB',
ADD COLUMN     "maxWidth" TEXT NOT NULL DEFAULT '1200px',
ADD COLUMN     "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "shadows" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "spacingScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light',
ALTER COLUMN "navbarCollapsible" SET DEFAULT false,
DROP COLUMN "shadowIntensity",
ADD COLUMN     "shadowIntensity" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
