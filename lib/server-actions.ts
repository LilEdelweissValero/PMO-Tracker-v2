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
