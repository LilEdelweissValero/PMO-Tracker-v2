import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWorkStreamWithDerived } from "@/lib/feature";
import type { TemplateStage } from "@/lib/feature";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf");

  if (!asOf) {
    return NextResponse.json({ error: "asOf date parameter is required" }, { status: 400 });
  }

  const asOfDate = new Date(asOf);
  if (isNaN(asOfDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const logs = await prisma.changeLog.findMany({
    where: { changedAt: { lte: asOfDate } },
    orderBy: { changedAt: "asc" },
  });

  const projects = await prisma.project.findMany({
    where: { archived: false },
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

  const flowTemplateRows = await prisma.configValue.findMany({
    where: { category: "flow_template", archived: false },
    orderBy: { sortOrder: "asc" },
  });
  const templateStages: TemplateStage[] = flowTemplateRows.map((r) => ({ name: r.value, status: r.status }));

  const projectStates = new Map<number, Record<string, string>>();
  const wsStates = new Map<number, Record<string, string>>();
  const wsFlowDates = new Map<number, Map<number, { planned: string | null; completion: string | null }>>();

  for (const log of logs) {
    if (log.projectId && log.fieldName) {
      if (!projectStates.has(log.projectId)) projectStates.set(log.projectId, {});
      const state = projectStates.get(log.projectId)!;
      state[log.fieldName] = log.newValue ?? "";
    }

    if (log.workStreamId && log.fieldName) {
      if (!wsStates.has(log.workStreamId)) wsStates.set(log.workStreamId, {});
      const state = wsStates.get(log.workStreamId)!;
      state[log.fieldName] = log.newValue ?? "";
    }

    if (log.entryType === "progress" && log.workStreamId) {
      const ws = projects
        .flatMap((p) => p.workStreams)
        .find((w) => w.id === log.workStreamId);
      if (ws) {
        const stage = ws.flowStages.find(
          (s) => s.name.toLowerCase().includes((log.fieldName ?? "").toLowerCase()) ||
                 log.newValue?.includes(String(s.id))
        );
        if (stage) {
          if (!wsFlowDates.has(log.workStreamId)) wsFlowDates.set(log.workStreamId, new Map());
          const dates = wsFlowDates.get(log.workStreamId)!;
          dates.set(stage.id, {
            planned: stage.plannedDate?.toISOString() ?? null,
            completion: log.newValue ?? null,
          });
        }
      }
    }
  }

  const reconstructed = projects.map((project) => {
    const pState = projectStates.get(project.id) ?? {};
    const ws = project.workStreams.map((ws) => {
      const wsState = wsStates.get(ws.id) ?? {};
      const flowDates = wsFlowDates.get(ws.id);

      const stages = ws.flowStages.map((stage) => {
        const fd = flowDates?.get(stage.id);
        return {
          ...stage,
          plannedDate: fd?.planned ? new Date(fd.planned) : stage.plannedDate,
          completionDate: fd?.completion ? new Date(fd.completion) : stage.completionDate,
        };
      });

      return buildWorkStreamWithDerived({
        ...ws,
        name: wsState.name ?? ws.name,
        assignedDeveloper: wsState.assignedDeveloper ?? ws.assignedDeveloper,
        currentBall: wsState.currentBall ?? ws.currentBall,
        flowStages: stages,
      }, templateStages);
    });

    return {
      ...project,
      name: pState.name ?? project.name,
      priority: pState.priority ?? project.priority,
      pmOfficer: pState.pmOfficer ?? project.pmOfficer,
      requestType: pState.requestType ?? project.requestType,
      initiatedBy: pState.initiatedBy ?? project.initiatedBy,
      systemName: pState.systemName ?? project.systemName,
      signoffStatus: pState.signoffStatus ?? project.signoffStatus,
      systems: project.projectSystems
        .map((ps) => ps.systemModuleEntry)
        .filter((s) => !s.archived),
      workStreams: ws,
    };
  });

  return NextResponse.json({ projects: reconstructed, asOfDate: asOf });
}
