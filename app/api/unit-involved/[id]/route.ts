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
  const existing = await prisma.unitInvolved.findUnique({ where: { id: entryId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const group = typeof body.group === "string" ? body.group.trim() : existing.group;
  const name = typeof body.name === "string" ? body.name.trim() : existing.name;

  if (!group || !name) {
    return NextResponse.json({ error: "group and name are required" }, { status: 400 });
  }

  const conflict = await prisma.unitInvolved.findFirst({
    where: { group, name, archived: false, NOT: { id: entryId } },
  });
  if (conflict) {
    return NextResponse.json({ error: "This name already exists in the group" }, { status: 409 });
  }

  const updated = await prisma.unitInvolved.update({
    where: { id: entryId },
    data: {
      group,
      name,
      sortOrder: body.sortOrder !== undefined ? body.sortOrder : existing.sortOrder,
      archived: body.archived !== undefined ? body.archived : existing.archived,
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

  await prisma.unitInvolved.update({
    where: { id: entryId },
    data: { archived: true },
  });

  return NextResponse.json({ success: true });
}