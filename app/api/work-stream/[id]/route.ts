import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange, touchLastModified } from "@/lib/server-actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsId = parseInt(id);
  if (isNaN(wsId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const workStream = await prisma.workStream.findUnique({
    where: { id: wsId },
    include: { flowStages: { where: { archived: false }, orderBy: { orderIdx: "asc" } } },
  });

  if (!workStream) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(workStream);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsId = parseInt(id);
  if (isNaN(wsId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const existing = await prisma.workStream.findUnique({ where: { id: wsId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const trackedFields = ["name", "assignedDeveloper", "currentBall", "task"];
  for (const field of trackedFields) {
    if (field in body && body[field] !== (existing as Record<string, unknown>)[field]) {
      await logChange({
        workStreamId: wsId,
        projectId: existing.projectId,
        entryType: "field_change",
        fieldName: field,
        oldValue: String((existing as Record<string, unknown>)[field] ?? ""),
        newValue: String(body[field] ?? ""),
        changedBy: body.changedBy ?? "System",
      });
    }
  }

  const workStream = await prisma.workStream.update({
    where: { id: wsId },
    data: {
      name: body.name !== undefined ? body.name : existing.name,
      assignedDeveloper: body.assignedDeveloper !== undefined ? body.assignedDeveloper : existing.assignedDeveloper,
      currentBall: body.currentBall !== undefined ? body.currentBall : existing.currentBall,
      task: body.task !== undefined ? body.task : existing.task,
    },
    include: { flowStages: true },
  });

  await touchLastModified(existing.projectId);

  return NextResponse.json(workStream);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsId = parseInt(id);
  if (isNaN(wsId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.workStream.findUnique({ where: { id: wsId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.workStream.update({
    where: { id: wsId },
    data: { archived: true },
  });

  await logChange({
    workStreamId: wsId,
    projectId: existing.projectId,
    entryType: "field_change",
    fieldName: "archived",
    newValue: "true",
    changedBy: "System",
  });

  await touchLastModified(existing.projectId);

  return NextResponse.json({ success: true });
}
