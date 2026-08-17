import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange, touchLastModified } from "@/lib/server-actions";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.workStreamId) {
    return NextResponse.json({ error: "workStreamId is required" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const workStreamId = parseInt(body.workStreamId);
  const workStream = await prisma.workStream.findUnique({
    where: { id: workStreamId },
    select: { projectId: true },
  });
  if (!workStream) {
    return NextResponse.json({ error: "Work stream not found" }, { status: 404 });
  }

  const maxOrder = await prisma.flowStage.aggregate({
    where: { workStreamId, archived: false },
    _max: { orderIdx: true },
  });

  const stage = await prisma.flowStage.create({
    data: {
      workStreamId,
      name: body.name.trim(),
      orderIdx:
        body.orderIdx !== undefined
          ? Number(body.orderIdx)
          : (maxOrder._max.orderIdx ?? -1) + 1,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : null,
      actualDate: body.actualDate ? new Date(body.actualDate) : null,
      responsiblePerson: body.responsiblePerson ?? null,
    },
  });

  await logChange({
    workStreamId,
    projectId: workStream.projectId,
    entryType: "field_change",
    fieldName: "stage_created",
    newValue: stage.name,
    changedBy: body.changedBy ?? "System",
  });

  await touchLastModified(workStream.projectId);

  return NextResponse.json(stage, { status: 201 });
}