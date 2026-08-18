-- AlterTable
ALTER TABLE "flow_stages" ADD COLUMN     "responsible_group" TEXT;

-- Backfill: move legacy ball-group values from responsible_person into responsible_group
UPDATE "flow_stages"
SET "responsible_group" = "responsible_person",
    "responsible_person" = NULL
WHERE "responsible_person" IN ('PMO', 'Developers', 'System Owner');

-- CreateTable
CREATE TABLE "unit_involved" (
    "id" SERIAL NOT NULL,
    "group" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_involved_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unit_involved_group_idx" ON "unit_involved"("group");

-- CreateIndex
CREATE INDEX "unit_involved_sort_order_idx" ON "unit_involved"("sort_order");
