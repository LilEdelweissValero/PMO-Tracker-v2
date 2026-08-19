import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TABLE_BY_ENTITY: Record<string, string> = {
  project: "projects",
  "directory-entry": "system_module_entries",
  "directory-department": "directory_departments",
  "unit-involved": "unit_involved",
  "config-value": "config_values",
};

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { entityType, orderedIds } = body as {
    entityType?: unknown;
    orderedIds?: unknown;
  };

  const table = typeof entityType === "string" ? TABLE_BY_ENTITY[entityType] : undefined;
  if (!table) {
    return NextResponse.json({ error: "Unsupported entityType" }, { status: 400 });
  }

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "orderedIds must be a non-empty array" },
      { status: 400 }
    );
  }

  const ids = orderedIds.map((x) => Number(x));
  if (!ids.every((x) => Number.isInteger(x) && x > 0)) {
    return NextResponse.json({ error: "orderedIds must be positive integers" }, { status: 400 });
  }

  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return NextResponse.json({ error: "orderedIds must be unique" }, { status: 400 });
  }

  try {
    const cases = ids.map((id, i) => `WHEN ${id} THEN ${i}`).join(" ");
    const sql = `UPDATE ${table} SET sort_order = CASE id ${cases} END WHERE id IN (${ids.join(", ")})`;
    await prisma.$executeRawUnsafe(sql);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/reorder error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}