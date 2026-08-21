-- AlterTable: Rename unit_involved to directory_personnel and add department column
ALTER TABLE "unit_involved" RENAME TO "directory_personnel";
ALTER TABLE "directory_personnel" RENAME CONSTRAINT "unit_involved_pkey" TO "directory_personnel_pkey";
ALTER INDEX "unit_involved_group_idx" RENAME TO "directory_personnel_group_idx";
ALTER INDEX "unit_involved_sort_order_idx" RENAME TO "directory_personnel_sort_order_idx";

-- AddColumn
ALTER TABLE "directory_personnel" ADD COLUMN "department" TEXT;

-- Drop directory_departments (data not directly mappable to personnel records)
DROP INDEX IF EXISTS "directory_departments_name_key";
DROP INDEX IF EXISTS "directory_departments_sort_order_idx";
DROP TABLE "directory_departments";
