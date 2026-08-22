import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  logChange,
  touchLastModified,
  createWorkStreamWithStages,
  defaultWorkStreamName,
} from "@/lib/server-actions";

interface ResolvedAffected {
  entryId: number | null;
  name: string;
}

async function resolveSystemSelections(
  systems: { system: string; moduleEntryIds: number[] }[]
): Promise<ResolvedAffected[]> {
  const resolved: ResolvedAffected[] = [];
  const seenNames = new Set<string>();
  const seenEntryIds = new Set<number>();

  for (const sel of systems) {
    const sys = sel.system.trim();
    if (!sys) continue;

    if (sel.moduleEntryIds.length > 0) {
      const entries = await prisma.systemModuleEntry.findMany({
        where: { id: { in: sel.moduleEntryIds }, archived: false },
      });
      for (const e of entries) {
        if (e.system !== sys) continue;
        const name = defaultWorkStreamName(e.system, e.module);
        if (seenNames.has(name) || seenEntryIds.has(e.id)) continue;
        seenNames.add(name);
        seenEntryIds.add(e.id);
        resolved.push({ entryId: e.id, name });
      }
    } else {
      let entry = await prisma.systemModuleEntry.findFirst({
        where: { system: sys, module: null, archived: false },
      });
      if (!entry) {
        entry = await prisma.systemModuleEntry.create({
          data: { system: sys, module: null },
        });
      }
      const name = defaultWorkStreamName(sys, null);
      if (seenNames.has(name) || seenEntryIds.has(entry.id)) continue;
      seenNames.add(name);
      seenEntryIds.add(entry.id);
      resolved.push({ entryId: entry.id, name });
    }
  }

  return resolved;
}

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
  const systems: { system: string; moduleEntryIds: number[] }[] = Array.isArray(body.systems)
    ? body.systems.map((s: Record<string, unknown>) => ({
        system: typeof s.system === "string" ? s.system.trim() : "",
        moduleEntryIds: Array.isArray(s.moduleEntryIds)
          ? s.moduleEntryIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
          : [],
      }))
    : [];
  const isNewSystem = requestTypeValue === "New System";
  if (!isNewSystem && !systemNameValue && systemEntryIds.length === 0 && systems.length === 0) {
    return NextResponse.json({ error: "System is required when Request Type is not New System" }, { status: 400 });
  }

  const projectOwnerValue = typeof body.projectOwner === "string" ? body.projectOwner.trim() : "";

  if (!projectOwnerValue) {
    return NextResponse.json({ error: "Project Owner is required" }, { status: 400 });
  }

  try {
    let affected: ResolvedAffected[] = [];
    if (systems.length > 0) {
      affected = await resolveSystemSelections(systems);
    } else if (systemEntryIds.length > 0) {
      const entries = await prisma.systemModuleEntry.findMany({
        where: { id: { in: systemEntryIds } },
      });
      const seenNames = new Set<string>();
      for (const e of entries) {
        const name = defaultWorkStreamName(e.system, e.module);
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        affected.push({ entryId: e.id, name });
      }
    } else {
      affected = [{
        entryId: null,
        name: defaultWorkStreamName(systemNameValue || body.name.trim(), body.specificModule ?? null),
      }];
    }

    const uniqueEntryIds = [...new Set(
      affected.map((a) => a.entryId).filter((id): id is number => id !== null)
    )];

    const project = await prisma.project.create({
      data: {
        projectId: projectIdValue,
        name: body.name.trim(),
        priority: body.priority || null,
        scopeDescription: body.scopeDescription || null,
        references: body.references ?? [],
        initiatedBy: body.initiatedBy || null,
        projectOwner: projectOwnerValue || null,
        systemName: systemNameValue || null,
        specificModule: typeof body.specificModule === "string" ? body.specificModule.trim() || null : null,
        requestType: requestTypeValue || null,
        pmOfficer: body.pmOfficer || null,
        remarks: body.remarks || null,
        projectSystems: uniqueEntryIds.length
          ? { create: uniqueEntryIds.map((systemModuleEntryId) => ({ systemModuleEntryId })) }
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

    for (const a of affected) {
      await createWorkStreamWithStages({
        projectId: project.id,
        name: a.name,
        currentBall: body.currentBall,
        responsiblePerson: body.ballPerson || null,
        task: body.currentTask || null,
        firstStage: body.currentStage || null,
        changedBy: body.changedBy ?? "System",
      });
    }

    await touchLastModified(project.id);

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("POST /api/project error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
