import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id);
  if (isNaN(entryId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const entry = await prisma.systemModuleEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const system = typeof body.system === "string" ? body.system.trim() : entry.system;
  const moduleName = typeof body.module === "string" ? body.module.trim() || null : entry.module;

  if (!system) {
    return NextResponse.json({ error: "System is required" }, { status: 400 });
  }

  const conflict = await prisma.systemModuleEntry.findFirst({
    where: { system, module: moduleName, archived: false, NOT: { id: entryId } },
  });
  if (conflict) {
    return NextResponse.json({ error: "This system and module combination already exists" }, { status: 409 });
  }

  const updated = await prisma.systemModuleEntry.update({
    where: { id: entryId },
    data: {
      system,
      acronym: typeof body.acronym === "string" ? body.acronym.trim() || null : entry.acronym,
      color: typeof body.color === "string" ? body.color.trim() || null : entry.color,
      module: moduleName,
      developerAssigned: typeof body.developerAssigned === "string" ? body.developerAssigned.trim() || null : entry.developerAssigned,
      systemOwnerName: typeof body.systemOwnerName === "string" ? body.systemOwnerName.trim() || null : entry.systemOwnerName,
      systemOwnerDept: typeof body.systemOwnerDept === "string" ? body.systemOwnerDept.trim() || null : entry.systemOwnerDept,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id);
  if (isNaN(entryId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await prisma.systemModuleEntry.update({
    where: { id: entryId },
    data: { archived: true },
  });

  return NextResponse.json({ success: true });
}
