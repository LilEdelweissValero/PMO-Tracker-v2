import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange, touchLastModified } from "@/lib/server-actions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";

  try {
    const projects = await prisma.project.findMany({
      where: { archived },
      include: {
        workStreams: {
          where: { archived: false },
          include: { flowStages: { where: { archived: false } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/project error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!body.projectId || typeof body.projectId !== "string" || !body.projectId.trim()) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  const projectIdValue = body.projectId.trim();

  const duplicate = await prisma.project.findFirst({
    where: { projectId: projectIdValue, archived: false },
  });
  if (duplicate) {
    return NextResponse.json({ error: `ID "${projectIdValue}" is already in use` }, { status: 409 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        projectId: projectIdValue,
        name: body.name.trim(),
        priority: body.priority || null,
        scopeDescription: body.scopeDescription || null,
        references: body.references ?? [],
        initiatedBy: body.initiatedBy || null,
        requestedByName: body.requestedByName || null,
        requestedByDept: body.requestedByDept || null,
        systemName: body.systemName || null,
        specificModule: body.specificModule || null,
        systemOwnerName: body.systemOwnerName || null,
        systemOwnerDept: body.systemOwnerDept || null,
        requestType: body.requestType || null,
        pmOfficer: body.pmOfficer || null,
        remarks: body.remarks || null,
      },
    });

    await logChange({
      projectId: project.id,
      entryType: "field_change",
      fieldName: "created",
      newValue: project.name,
      changedBy: body.changedBy ?? "System",
    });

    await touchLastModified(project.id);

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("POST /api/project error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
