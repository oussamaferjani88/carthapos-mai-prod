-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "buildProjectName" TEXT,
ADD COLUMN     "buildProjectPath" TEXT,
ADD COLUMN     "buildRunId" TEXT,
ADD COLUMN     "buildStatus" TEXT DEFAULT 'pending';
