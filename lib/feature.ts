import type { FlowStageWithDerived, WorkStreamWithStages } from "./types";

export function computeDelayAdvance(
  planned: Date | null | undefined,
  actual: Date | null | undefined
): number | null {
  if (!planned || !actual) return null;
  const diffMs = actual.getTime() - planned.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function computeCurrentStage(
  stages: FlowStageWithDerived[]
): FlowStageWithDerived | null {
  const dated = stages
    .filter((s) => s.actualDate !== null)
    .sort((a, b) => {
      const aTime = a.actualDate?.getTime() ?? 0;
      const bTime = b.actualDate?.getTime() ?? 0;
      return bTime - aTime;
    });
  return dated[0] ?? null;
}

export function computeTemplateCurrentStage(
  stages: FlowStageWithDerived[],
  templateStages: TemplateStage[]
): FlowStageWithDerived | null {
  if (templateStages.length === 0) return computeCurrentStage(stages);
  const byName = new Map(stages.map((s) => [s.name, s]));
  for (const tpl of templateStages) {
    const stage = byName.get(tpl.name);
    if (!stage || !stage.actualDate) return stage ?? null;
  }
  return computeCurrentStage(stages);
}

export interface TemplateStage {
  name: string;
  status: string | null;
}

export function computeProjectStatus(
  workStreams: WorkStreamWithStages[],
  templateStages: TemplateStage[]
): string {
  if (templateStages.length === 0) return "";
  if (workStreams.length === 0) return templateStages[0].status || "";

  const templateIndexByName = new Map(templateStages.map((t, i) => [t.name, i]));

  let bottleneckIdx: number | null = null;

  for (const ws of workStreams) {
    let lastCompletedIdx = -1;
    for (const stage of ws.flowStages) {
      if (!stage.actualDate) continue;
      const idx = templateIndexByName.get(stage.name);
      if (idx !== undefined && idx > lastCompletedIdx) lastCompletedIdx = idx;
    }
    const nextIdx = lastCompletedIdx + 1;
    if (nextIdx >= templateStages.length) continue;
    if (bottleneckIdx === null || nextIdx < bottleneckIdx) bottleneckIdx = nextIdx;
  }

  if (bottleneckIdx === null) {
    return templateStages[templateStages.length - 1].status || "";
  }

  return templateStages[bottleneckIdx].status || "";
}

const STATUS_COLOR_PREFIXES = ["nys", "planning", "partial", "mostly", "complete"];

export function getStatusColorClass(status: string, allStatuses?: { value: string }[]): { bg: string; ink: string } {
  if (allStatuses && allStatuses.length > 0) {
    const idx = allStatuses.findIndex((s) => s.value === status);
    const prefix = idx >= 0
      ? (STATUS_COLOR_PREFIXES[idx] ?? STATUS_COLOR_PREFIXES[STATUS_COLOR_PREFIXES.length - 1])
      : STATUS_COLOR_PREFIXES[0];
    return { bg: `var(--status-${prefix}-bg)`, ink: `var(--status-${prefix}-ink)` };
  }

  const fallbackMap: Record<string, { bg: string; ink: string }> = {
    "Not Yet Started": { bg: "var(--status-nys-bg)", ink: "var(--status-nys-ink)" },
    Planning: { bg: "var(--status-planning-bg)", ink: "var(--status-planning-ink)" },
    "Partial Progress": { bg: "var(--status-partial-bg)", ink: "var(--status-partial-ink)" },
    "Mostly Done": { bg: "var(--status-mostly-bg)", ink: "var(--status-mostly-ink)" },
    Complete: { bg: "var(--status-complete-bg)", ink: "var(--status-complete-ink)" },
  };
  return fallbackMap[status] ?? { bg: "var(--status-nys-bg)", ink: "var(--status-nys-ink)" };
}

export function buildStagesWithDerived(
  stages: { id: number; workStreamId: number; name: string; orderIdx: number; plannedDate: Date | null; actualDate: Date | null; responsibleGroup: string | null; responsiblePerson: string | null }[]
): FlowStageWithDerived[] {
  return stages
    .sort((a, b) => a.orderIdx - b.orderIdx)
    .map((s) => ({
      ...s,
      delayAdvanceDays: computeDelayAdvance(s.plannedDate, s.actualDate),
    }));
}

export function buildWorkStreamWithDerived(
  ws: {
    id: number;
    projectId: number;
    name: string | null;
    assignedDeveloper: string | null;
    currentBall: string;
    task?: string | null;
    archived: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    flowStages: { id: number; workStreamId: number; name: string; orderIdx: number; plannedDate: Date | null; actualDate: Date | null; responsibleGroup: string | null; responsiblePerson: string | null }[];
  },
  templateStages: TemplateStage[]
): WorkStreamWithStages {
  const stages = buildStagesWithDerived(ws.flowStages);
  return { ...ws, task: ws.task ?? null, flowStages: stages, currentStage: computeTemplateCurrentStage(stages, templateStages) };
}
