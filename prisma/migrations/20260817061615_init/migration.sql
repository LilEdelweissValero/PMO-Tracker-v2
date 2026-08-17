-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "priority" TEXT,
    "scope_description" TEXT,
    "references" JSONB NOT NULL DEFAULT '[]',
    "initiated_by" TEXT,
    "requested_by_name" TEXT,
    "requested_by_dept" TEXT,
    "system_name" TEXT,
    "specific_module" TEXT,
    "system_owner_name" TEXT,
    "system_owner_dept" TEXT,
    "request_type" TEXT,
    "pm_officer" TEXT,
    "remarks" TEXT,
    "signoff_status" TEXT NOT NULL DEFAULT 'not_signed_off',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_streams" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" TEXT,
    "assigned_developer" TEXT,
    "current_ball" TEXT NOT NULL DEFAULT 'PMO',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_stages" (
    "id" SERIAL NOT NULL,
    "work_stream_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order_idx" INTEGER NOT NULL,
    "planned_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),
    "responsible_person" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_logs" (
    "id" SERIAL NOT NULL,
    "work_stream_id" INTEGER,
    "project_id" INTEGER,
    "entry_type" TEXT NOT NULL,
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "note" TEXT,
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory_systems" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory_departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_values" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_sort_order_idx" ON "projects"("sort_order");

-- CreateIndex
CREATE INDEX "work_streams_project_id_idx" ON "work_streams"("project_id");

-- CreateIndex
CREATE INDEX "work_streams_sort_order_idx" ON "work_streams"("sort_order");

-- CreateIndex
CREATE INDEX "flow_stages_work_stream_id_idx" ON "flow_stages"("work_stream_id");

-- CreateIndex
CREATE INDEX "flow_stages_order_idx_idx" ON "flow_stages"("order_idx");

-- CreateIndex
CREATE INDEX "change_logs_work_stream_id_idx" ON "change_logs"("work_stream_id");

-- CreateIndex
CREATE INDEX "change_logs_project_id_idx" ON "change_logs"("project_id");

-- CreateIndex
CREATE INDEX "change_logs_changed_at_idx" ON "change_logs"("changed_at");

-- CreateIndex
CREATE INDEX "change_logs_entry_type_idx" ON "change_logs"("entry_type");

-- CreateIndex
CREATE UNIQUE INDEX "directory_systems_name_key" ON "directory_systems"("name");

-- CreateIndex
CREATE INDEX "directory_systems_sort_order_idx" ON "directory_systems"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "directory_departments_name_key" ON "directory_departments"("name");

-- CreateIndex
CREATE INDEX "directory_departments_sort_order_idx" ON "directory_departments"("sort_order");

-- CreateIndex
CREATE INDEX "config_values_category_idx" ON "config_values"("category");

-- CreateIndex
CREATE INDEX "config_values_sort_order_idx" ON "config_values"("sort_order");

-- AddForeignKey
ALTER TABLE "work_streams" ADD CONSTRAINT "work_streams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_stages" ADD CONSTRAINT "flow_stages_work_stream_id_fkey" FOREIGN KEY ("work_stream_id") REFERENCES "work_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_work_stream_id_fkey" FOREIGN KEY ("work_stream_id") REFERENCES "work_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
