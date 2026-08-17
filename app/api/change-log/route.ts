import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workStreamId = searchParams.get("workStreamId");
  const projectId = searchParams.get("projectId");
  const entryType = searchParams.get("entryType");
  const asOf = searchParams.get("asOf");

  const where: Record<string, unknown> = {};
  if (workStreamId) where.workStreamId = parseInt(workStreamId);
  if (projectId) where.projectId = parseInt(projectId);
  if (entryType) where.entryType = entryType;
  if (asOf) where.changedAt = { lte: new Date(asOf) };

  const logs = await prisma.changeLog.findMany({
    where,
    orderBy: { changedAt: "desc" },
    take: 500,
  });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.entryType) {
    return NextResponse.json({ error: "entryType is required" }, { status: 400 });
  }

  const log = await prisma.changeLog.create({
    data: {
      workStreamId: body.workStreamId ?? null,
      projectId: body.projectId ?? null,
      entryType: body.entryType,
      fieldName: body.fieldName ?? null,
      oldValue: body.oldValue ?? null,
      newValue: body.newValue ?? null,
      note: body.note ?? null,
      changedBy: body.changedBy ?? null,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
