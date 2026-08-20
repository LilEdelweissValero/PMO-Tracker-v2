-- AlterTable
ALTER TABLE "config_values" ADD COLUMN     "acronym" TEXT;

-- AlterTable
ALTER TABLE "work_streams" ALTER COLUMN "current_ball" SET DEFAULT 'Project Management Office';
