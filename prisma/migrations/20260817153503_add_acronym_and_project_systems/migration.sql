-- AlterTable
ALTER TABLE "system_module_entries" ADD COLUMN     "acronym" TEXT;

-- CreateTable
CREATE TABLE "project_systems" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "system_module_entry_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_systems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_systems_project_id_idx" ON "project_systems"("project_id");

-- CreateIndex
CREATE INDEX "project_systems_system_module_entry_id_idx" ON "project_systems"("system_module_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_systems_project_id_system_module_entry_id_key" ON "project_systems"("project_id", "system_module_entry_id");

-- AddForeignKey
ALTER TABLE "project_systems" ADD CONSTRAINT "project_systems_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_systems" ADD CONSTRAINT "project_systems_system_module_entry_id_fkey" FOREIGN KEY ("system_module_entry_id") REFERENCES "system_module_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
