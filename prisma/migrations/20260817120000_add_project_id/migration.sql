-- Add user-defined project ID
ALTER TABLE "projects" ADD COLUMN "project_id" TEXT;

-- Backfill existing projects with their current primary key as the display ID
UPDATE "projects" SET "project_id" = "id"::text WHERE "project_id" IS NULL;

-- Enforce that every project has an ID
ALTER TABLE "projects" ALTER COLUMN "project_id" SET NOT NULL;

-- Uniqueness among active (non-archived) projects only
CREATE UNIQUE INDEX "projects_project_id_active_key" ON "projects"("project_id") WHERE "archived" = false;
