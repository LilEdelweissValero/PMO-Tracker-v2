-- AlterTable: Add new columns
ALTER TABLE "system_module_entries" ADD COLUMN "link" TEXT;
ALTER TABLE "projects" ADD COLUMN "project_owner" TEXT;

-- Backfill: Copy requested_by_name to project_owner
UPDATE "projects" SET "project_owner" = "requested_by_name";

-- DropColumns
ALTER TABLE "projects" DROP COLUMN "requested_by_name";
ALTER TABLE "projects" DROP COLUMN "requested_by_dept";
