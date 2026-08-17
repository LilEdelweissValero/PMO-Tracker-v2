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
        projectSystems: {
          include: { systemModuleEntry: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(
      projects.map(({ projectSystems, ...p }) => ({
        ...p,
        systems: projectSystems
          .map((ps) => ps.systemModuleEntry)
          .filter((s) => !s.archived),
      }))
    );
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

  const requestTypeValue = typeof body.requestType === "string" ? body.requestType.trim() : "";
  const systemNameValue = typeof body.systemName === "string" ? body.systemName.trim() : "";
  const systemEntryIds: number[] = Array.isArray(body.systemEntryIds)
    ? body.systemEntryIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
    : [];
  const isNewSystem = requestTypeValue === "New System";
  if (!isNewSystem && !systemNameValue && systemEntryIds.length === 0) {
    return NextResponse.json({ error: "System is required when Request Type is not New System" }, { status: 400 });
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
        systemName: systemNameValue || null,
        specificModule: typeof body.specificModule === "string" ? body.specificModule.trim() || null : null,
        systemOwnerName: body.systemOwnerName || null,
        systemOwnerDept: body.systemOwnerDept || null,
        requestType: requestTypeValue || null,
        pmOfficer: body.pmOfficer || null,
        remarks: body.remarks || null,
        projectSystems: systemEntryIds.length
          ? { create: systemEntryIds.map((systemModuleEntryId) => ({ systemModuleEntryId })) }
          : undefined,
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
