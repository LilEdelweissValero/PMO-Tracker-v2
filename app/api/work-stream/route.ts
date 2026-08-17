import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { touchLastModified, createWorkStreamWithStages } from "@/lib/server-actions";

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

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { name: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const workStream = await createWorkStreamWithStages({
    projectId: body.projectId,
    name: body.name ?? project.name,
    assignedDeveloper: body.assignedDeveloper ?? null,
    currentBall: body.currentBall ?? "PMO",
    changedBy: body.changedBy ?? "System",
  });

  await touchLastModified(body.projectId);

  return NextResponse.json(workStream, { status: 201 });
}
