import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange, touchLastModified } from "@/lib/server-actions";
import { computeDelayAdvance } from "@/lib/feature";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stageId = parseInt(id);
  if (isNaN(stageId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const existing = await prisma.flowStage.findUnique({
    where: { id: stageId },
    include: { workStream: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wasCompleted = existing.actualDate !== null;

  const plannedDate = body.plannedDate !== undefined
    ? (body.plannedDate ? new Date(body.plannedDate) : null)
    : existing.plannedDate;
  const actualDate = body.actualDate !== undefined
    ? (body.actualDate ? new Date(body.actualDate) : null)
    : existing.actualDate;

  const stage = await prisma.flowStage.update({
    where: { id: stageId },
    data: {
      name: body.name !== undefined ? body.name : existing.name,
      orderIdx: body.orderIdx !== undefined ? body.orderIdx : existing.orderIdx,
      plannedDate,
      actualDate,
      responsiblePerson: body.responsiblePerson !== undefined ? body.responsiblePerson : existing.responsiblePerson,
    },
  });

  if (!wasCompleted && actualDate !== null) {
    await logChange({
      workStreamId: existing.workStreamId,
      projectId: existing.workStream.projectId,
      entryType: "progress",
      fieldName: "actual_date",
      newValue: actualDate.toISOString(),
      note: body.note ?? `Stage "${existing.name}" completed`,
      changedBy: body.changedBy ?? "System",
    });
  } else if (wasCompleted && actualDate === null) {
    await logChange({
      workStreamId: existing.workStreamId,
      projectId: existing.workStream.projectId,
      entryType: "field_change",
      fieldName: "actual_date",
      oldValue: existing.actualDate?.toISOString() ?? "",
      newValue: "",
      changedBy: body.changedBy ?? "System",
    });
  } else if (plannedDate !== existing.plannedDate || actualDate !== existing.actualDate) {
    const delta = computeDelayAdvance(plannedDate, actualDate);
    await logChange({
      workStreamId: existing.workStreamId,
      projectId: existing.workStream.projectId,
      entryType: "field_change",
      fieldName: "dates",
      oldValue: `planned=${existing.plannedDate?.toISOString() ?? ""}, actual=${existing.actualDate?.toISOString() ?? ""}`,
      newValue: `planned=${plannedDate?.toISOString() ?? ""}, actual=${actualDate?.toISOString() ?? ""}${delta !== null ? ` (delta=${delta}d)` : ""}`,
      changedBy: body.changedBy ?? "System",
    });
  }

  if (body.name !== undefined && body.name !== existing.name) {
    await logChange({
      workStreamId: existing.workStreamId,
      projectId: existing.workStream.projectId,
      entryType: "field_change",
      fieldName: "stage_name",
      oldValue: existing.name,
      newValue: body.name,
      changedBy: body.changedBy ?? "System",
    });
  }

  if (body.orderIdx !== undefined && Number(body.orderIdx) !== existing.orderIdx) {
    await logChange({
      workStreamId: existing.workStreamId,
      projectId: existing.workStream.projectId,
      entryType: "field_change",
      fieldName: "stage_order",
      oldValue: String(existing.orderIdx),
      newValue: String(body.orderIdx),
      changedBy: body.changedBy ?? "System",
    });
  }

  if (body.responsiblePerson !== undefined && body.responsiblePerson !== existing.responsiblePerson) {
    await logChange({
      workStreamId: existing.workStreamId,
      projectId: existing.workStream.projectId,
      entryType: "field_change",
      fieldName: "responsible_person",
      oldValue: existing.responsiblePerson ?? "",
      newValue: body.responsiblePerson ?? "",
      changedBy: body.changedBy ?? "System",
    });
  }

  await touchLastModified(existing.workStream.projectId);

  return NextResponse.json(stage);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stageId = parseInt(id);
  if (isNaN(stageId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.flowStage.findUnique({
    where: { id: stageId },
    include: { workStream: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.flowStage.update({
    where: { id: stageId },
    data: { archived: true },
  });

  await logChange({
    workStreamId: existing.workStreamId,
    projectId: existing.workStream.projectId,
    entryType: "field_change",
    fieldName: "stage_deleted",
    oldValue: existing.name,
    changedBy: "System",
  });

  await touchLastModified(existing.workStream.projectId);

  return NextResponse.json({ success: true });
}
