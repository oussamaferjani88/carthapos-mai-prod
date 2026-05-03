-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "buildProjectPath" TEXT,
ADD COLUMN     "buildRunId" TEXT,
ADD COLUMN     "buildStatus" TEXT;
