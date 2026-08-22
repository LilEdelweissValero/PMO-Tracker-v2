import { prisma } from "./db";
import type { ChangeLogCreate } from "./types";

export async function logChange(data: ChangeLogCreate) {
  return prisma.changeLog.create({
    data: {
      workStreamId: data.workStreamId ?? null,
      projectId: data.projectId ?? null,
      entryType: data.entryType,
      fieldName: data.fieldName ?? null,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue ?? null,
      note: data.note ?? null,
      changedBy: data.changedBy ?? null,
    },
  });
}

export async function touchLastModified(projectId: number) {
  return prisma.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() },
  });
}

export function defaultWorkStreamName(system: string, moduleName: string | null | undefined): string {
  const base = system.trim();
  const moduleValue = moduleName?.trim();
  return moduleValue ? `${base} - ${moduleValue}` : base;
}

export async function createWorkStreamWithStages(params: {
  projectId: number;
  name: string | null;
  assignedDeveloper?: string | null;
  currentBall?: string;
  task?: string | null;
  responsiblePerson?: string | null;
  firstStage?: string | null;
  changedBy?: string;
}) {
  const templateStages = await prisma.configValue.findMany({
    where: { category: "flow_template", archived: false },
    orderBy: { sortOrder: "asc" },
  });

  const resolvedStages = (() => {
    if (params.firstStage && params.firstStage.trim()) {
      const match = templateStages.find((s) => s.value.toLowerCase() === params.firstStage!.trim().toLowerCase());
      if (match) {
      return templateStages.map((s) => ({ value: s.value, status: s.status, isCustom: false }));
    }
    return [
      { value: params.firstStage.trim(), status: null, isCustom: true },
      ...templateStages.map((s) => ({ value: s.value, status: s.status, isCustom: false })),
    ];
    }
    return templateStages.map((s) => ({ value: s.value, status: s.status, isCustom: false }));
  })();

  const workStream = await prisma.workStream.create({
    data: {
      projectId: params.projectId,
      name: params.name ?? null,
      assignedDeveloper: params.assignedDeveloper ?? null,
      currentBall: params.currentBall ?? "Project Management Office",
      task: params.task ?? null,
      flowStages: {
        create: resolvedStages.map((stage, i) => ({
          name: stage.value,
          orderIdx: i,
          responsibleGroup: i === 0 ? (params.currentBall ?? null) : null,
          responsiblePerson: i === 0 ? (params.responsiblePerson ?? null) : null,
        })),
      },
    },
  });

  const changedBy = params.changedBy ?? "System";
  const initialStatus = resolvedStages[0]?.status ?? "Not Yet Started";

  await prisma.changeLog.create({
    data: {
      workStreamId: workStream.id,
      projectId: params.projectId,
      entryType: "progress",
      fieldName: "status",
      newValue: initialStatus,
      note: initialStatus,
      changedBy,
    },
  });

  await logChange({
    workStreamId: workStream.id,
    projectId: params.projectId,
    entryType: "field_change",
    fieldName: "created",
    newValue: workStream.name ?? "Work Stream",
    changedBy,
  });

  if (params.currentBall || params.responsiblePerson) {
    const holder = params.responsiblePerson
      ? `${params.currentBall} - ${params.responsiblePerson}`
      : params.currentBall ?? undefined;
    await logChange({
      workStreamId: workStream.id,
      projectId: params.projectId,
      entryType: "bump",
      fieldName: resolvedStages[0]?.value ?? "—",
      newValue: holder,
      note: params.task ?? undefined,
      changedBy,
    });
  }

  return workStream;
}
