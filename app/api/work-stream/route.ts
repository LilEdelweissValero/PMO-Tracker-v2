import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange, touchLastModified } from "@/lib/server-actions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const where: Record<string, unknown> = { archived: false };
  if (projectId) where.projectId = parseInt(projectId);

  const workStreams = await prisma.workStream.findMany({
    where,
    include: { flowStages: { where: { archived: false } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(workStreams);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const templateStages = await prisma.configValue.findMany({
    where: { category: "flow_template", archived: false },
    orderBy: { sortOrder: "asc" },
  });

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { name: true },
  });

  const workStream = await prisma.workStream.create({
    data: {
      projectId: body.projectId,
      name: body.name ?? project?.name ?? null,
      assignedDeveloper: body.assignedDeveloper ?? null,
      currentBall: body.currentBall ?? "PMO",
      flowStages: {
        create: templateStages.map((stage, i) => ({
          name: stage.value,
          orderIdx: i,
        })),
      },
    },
    include: { flowStages: true },
  });

  await logChange({
    workStreamId: workStream.id,
    projectId: body.projectId,
    entryType: "field_change",
    fieldName: "created",
    newValue: workStream.name ?? "Work Stream",
    changedBy: body.changedBy ?? "System",
  });

  await touchLastModified(body.projectId);

  return NextResponse.json(workStream, { status: 201 });
}
