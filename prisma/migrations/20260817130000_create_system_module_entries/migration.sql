-- CreateTable
CREATE TABLE "system_module_entries" (
    "id" SERIAL NOT NULL,
    "system" TEXT NOT NULL,
    "module" TEXT,
    "developer_assigned" TEXT,
    "system_owner_name" TEXT,
    "system_owner_dept" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_module_entries_pkey" PRIMARY KEY ("id")
);

-- One row per module per system, among active entries only
CREATE UNIQUE INDEX "system_module_entries_active_key" ON "system_module_entries"("system", "module") WHERE "archived" = false;

-- CreateIndex
CREATE INDEX "system_module_entries_sort_order_idx" ON "system_module_entries"("sort_order");

-- DropTable
DROP TABLE "directory_systems";
