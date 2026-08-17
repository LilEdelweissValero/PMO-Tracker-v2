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

export function computeHealth(
  stage: FlowStageWithDerived | null
): "completed" | "ontime" | "atrisk" | "delayed" | "notdue" {
  if (!stage) return "notdue";
  if (stage.name.toLowerCase().includes("closed") && stage.actualDate) return "completed";
  if (stage.delayAdvanceDays === null) return "notdue";
  if (stage.delayAdvanceDays <= 0) return "ontime";
  if (stage.delayAdvanceDays <= 7) return "atrisk";
  return "delayed";
}

export function getHealthLabel(health: string): string {
  const labels: Record<string, string> = {
    completed: "Completed",
    ontime: "On Time",
    atrisk: "At Risk",
    delayed: "Delayed",
    notdue: "Not Yet Due",
  };
  return labels[health] ?? health;
}

export function computeAggregateStatus(
  workStreams: WorkStreamWithStages[]
): string {
  if (workStreams.length === 0) return "Not Yet Started";
  const totalStages = workStreams.reduce(
    (sum, ws) => sum + ws.flowStages.length,
    0
  );
  const completedStages = workStreams.reduce(
    (sum, ws) => sum + ws.flowStages.filter((s) => s.actualDate !== null).length,
    0
  );
  if (totalStages === 0) return "Not Yet Started";
  const pct = completedStages / totalStages;
  if (pct === 0) return "Not Yet Started";
  if (pct <= 0.3) return "Planning";
  if (pct <= 0.7) return "Partial Progress";
  if (pct < 1) return "Mostly Done";
  return "Complete";
}

export function getStatusColorClass(status: string): { bg: string; ink: string } {
  const map: Record<string, { bg: string; ink: string }> = {
    "Not Yet Started": { bg: "var(--status-nys-bg)", ink: "var(--status-nys-ink)" },
    Planning: { bg: "var(--status-planning-bg)", ink: "var(--status-planning-ink)" },
    "Partial Progress": { bg: "var(--status-partial-bg)", ink: "var(--status-partial-ink)" },
    "Mostly Done": { bg: "var(--status-mostly-bg)", ink: "var(--status-mostly-ink)" },
    Complete: { bg: "var(--status-complete-bg)", ink: "var(--status-complete-ink)" },
  };
  return map[status] ?? { bg: "var(--status-nys-bg)", ink: "var(--status-nys-ink)" };
}

export function getHealthColorClass(health: string): { bg: string; ink: string } {
  const map: Record<string, { bg: string; ink: string }> = {
    completed: { bg: "var(--health-completed-bg)", ink: "var(--health-completed-ink)" },
    ontime: { bg: "var(--health-ontime-bg)", ink: "var(--health-ontime-ink)" },
    atrisk: { bg: "var(--health-atrisk-bg)", ink: "var(--health-atrisk-ink)" },
    delayed: { bg: "var(--health-delayed-bg)", ink: "var(--health-delayed-ink)" },
    notdue: { bg: "var(--health-notdue-bg)", ink: "var(--health-notdue-ink)" },
  };
  return map[health] ?? { bg: "var(--health-notdue-bg)", ink: "var(--health-notdue-ink)" };
}

export function buildStagesWithDerived(
  stages: { id: number; workStreamId: number; name: string; orderIdx: number; plannedDate: Date | null; actualDate: Date | null; responsiblePerson: string | null }[]
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
    archived: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    flowStages: { id: number; workStreamId: number; name: string; orderIdx: number; plannedDate: Date | null; actualDate: Date | null; responsiblePerson: string | null }[];
  }
): WorkStreamWithStages {
  const stages = buildStagesWithDerived(ws.flowStages);
  return { ...ws, flowStages: stages, currentStage: computeCurrentStage(stages) };
}
