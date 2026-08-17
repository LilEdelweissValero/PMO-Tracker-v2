import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange, touchLastModified } from "@/lib/server-actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bumpLogs = await prisma.changeLog.findMany({
    where: { projectId, entryType: "bump" },
    orderBy: { changedAt: "desc" },
  });

  const latestBumpByWs = new Map<number, (typeof bumpLogs)[number]>();
  for (const log of bumpLogs) {
    if (log.workStreamId && !latestBumpByWs.has(log.workStreamId)) {
      latestBumpByWs.set(log.workStreamId, log);
    }
  }

  const { projectSystems, ...rest } = project;
  return NextResponse.json({
    ...rest,
    workStreams: rest.workStreams.map((ws) => ({
      ...ws,
      latestBump: latestBumpByWs.get(ws.id) ?? null,
    })),
    systems: projectSystems
      .map((ps) => ps.systemModuleEntry)
      .filter((s) => !s.archived),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectSystems: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.projectId !== undefined) {
    const nextProjectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    if (!nextProjectId) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    const duplicate = await prisma.project.findFirst({
      where: { projectId: nextProjectId, archived: false, NOT: { id: projectId } },
    });
    if (duplicate) {
      return NextResponse.json({ error: `ID "${nextProjectId}" is already in use` }, { status: 409 });
    }
  }

  const trackedFields = [
    "projectId", "name", "priority", "scopeDescription", "initiatedBy",
    "requestedByName", "requestedByDept", "systemName", "specificModule",
    "systemOwnerName", "systemOwnerDept", "requestType", "pmOfficer",
    "remarks", "signoffStatus",
  ];

  for (const field of trackedFields) {
    if (field in body && body[field] !== (existing as Record<string, unknown>)[field]) {
      await logChange({
        projectId,
        entryType: "field_change",
        fieldName: field,
        oldValue: String((existing as Record<string, unknown>)[field] ?? ""),
        newValue: String(body[field] ?? ""),
        changedBy: body.changedBy ?? "System",
      });
    }
  }

  if ("references" in body) {
    await logChange({
      projectId,
      entryType: "field_change",
      fieldName: "references",
      oldValue: JSON.stringify(existing.references),
      newValue: JSON.stringify(body.references),
      changedBy: body.changedBy ?? "System",
    });
  }

  if (body.systemEntryIds !== undefined) {
    const systemEntryIds: number[] = Array.isArray(body.systemEntryIds)
      ? body.systemEntryIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
      : [];
    await prisma.projectSystem.deleteMany({ where: { projectId } });
    if (systemEntryIds.length) {
      await prisma.projectSystem.createMany({
        data: systemEntryIds.map((systemModuleEntryId) => ({ projectId, systemModuleEntryId })),
        skipDuplicates: true,
      });
    }
    await logChange({
      projectId,
      entryType: "field_change",
      fieldName: "systemEntryIds",
      oldValue: JSON.stringify(existing.projectSystems ?? []),
      newValue: JSON.stringify(systemEntryIds),
      changedBy: body.changedBy ?? "System",
    });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      projectId: body.projectId !== undefined ? (typeof body.projectId === "string" ? body.projectId.trim() : existing.projectId) : existing.projectId,
      name: body.name ?? existing.name,
      priority: body.priority !== undefined ? body.priority : existing.priority,
      scopeDescription: body.scopeDescription !== undefined ? body.scopeDescription : existing.scopeDescription,
      references: body.references !== undefined ? body.references : existing.references,
      initiatedBy: body.initiatedBy !== undefined ? body.initiatedBy : existing.initiatedBy,
      requestedByName: body.requestedByName !== undefined ? body.requestedByName : existing.requestedByName,
      requestedByDept: body.requestedByDept !== undefined ? body.requestedByDept : existing.requestedByDept,
      systemName: body.systemName !== undefined ? body.systemName : existing.systemName,
      specificModule: body.specificModule !== undefined ? body.specificModule : existing.specificModule,
      systemOwnerName: body.systemOwnerName !== undefined ? body.systemOwnerName : existing.systemOwnerName,
      systemOwnerDept: body.systemOwnerDept !== undefined ? body.systemOwnerDept : existing.systemOwnerDept,
      requestType: body.requestType !== undefined ? body.requestType : existing.requestType,
      pmOfficer: body.pmOfficer !== undefined ? body.pmOfficer : existing.pmOfficer,
      remarks: body.remarks !== undefined ? body.remarks : existing.remarks,
      signoffStatus: body.signoffStatus !== undefined ? body.signoffStatus : existing.signoffStatus,
    },
  });

  await touchLastModified(projectId);

  return NextResponse.json(project);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { archived: true },
  });

  await logChange({
    projectId,
    entryType: "field_change",
    fieldName: "archived",
    newValue: "true",
    changedBy: "System",
  });

  return NextResponse.json({ success: true });
}
