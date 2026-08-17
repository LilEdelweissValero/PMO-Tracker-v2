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
  changedBy?: string;
}) {
  const templateStages = await prisma.configValue.findMany({
    where: { category: "flow_template", archived: false },
    orderBy: { sortOrder: "asc" },
  });

  const workStream = await prisma.workStream.create({
    data: {
      projectId: params.projectId,
      name: params.name ?? null,
      assignedDeveloper: params.assignedDeveloper ?? null,
      currentBall: params.currentBall ?? "PMO",
      flowStages: {
        create: templateStages.map((stage, i) => ({
          name: stage.value,
          orderIdx: i,
        })),
      },
    },
  });

  const changedBy = params.changedBy ?? "System";

  await prisma.changeLog.createMany({
    data: [
      {
        workStreamId: workStream.id,
        projectId: params.projectId,
        entryType: "progress",
        fieldName: "status",
        newValue: "Not Started",
        note: "Not Started",
        changedBy,
      },
      {
        workStreamId: workStream.id,
        projectId: params.projectId,
        entryType: "bump",
        fieldName: "status",
        newValue: "PMO",
        note: "Not Started",
        changedBy,
      },
    ],
  });

  await logChange({
    workStreamId: workStream.id,
    projectId: params.projectId,
    entryType: "field_change",
    fieldName: "created",
    newValue: workStream.name ?? "Work Stream",
    changedBy,
  });

  return workStream;
}
