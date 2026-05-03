/*
  Warnings:

  - You are about to drop the column `buildProjectName` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `buildProjectPath` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `buildRunId` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `buildStatus` on the `licenses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "licenses" DROP COLUMN "buildProjectName",
DROP COLUMN "buildProjectPath",
DROP COLUMN "buildRunId",
DROP COLUMN "buildStatus";

-- CreateTable
CREATE TABLE "UserPosConfiguration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "outputPath" TEXT,
    "buildStatus" TEXT NOT NULL DEFAULT 'idle',
    "lastBuiltAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPosConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPosConfiguration_licenseId_key" ON "UserPosConfiguration"("licenseId");

-- AddForeignKey
ALTER TABLE "UserPosConfiguration" ADD CONSTRAINT "UserPosConfiguration_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPosConfiguration" ADD CONSTRAINT "UserPosConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
