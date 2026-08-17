import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildStagesWithDerived, computeCurrentStage } from "@/lib/feature";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf");

  const whereClause: Record<string, unknown> = {};
  if (asOf) {
    whereClause.changedAt = { lte: new Date(asOf) };
  }

  const progressLogs = await prisma.changeLog.findMany({
    where: { ...whereClause, entryType: "progress" },
    orderBy: { changedAt: "desc" },
  });

  const bumpLogs = await prisma.changeLog.findMany({
    where: { ...whereClause, entryType: "bump" },
    orderBy: { changedAt: "desc" },
  });

  const getLatestPerWorkStream = (logs: typeof progressLogs) => {
    const seen = new Set<number>();
    return logs.filter((log) => {
      if (!log.workStreamId || seen.has(log.workStreamId)) return false;
      seen.add(log.workStreamId);
      return true;
    });
  };

  const latestProgress = getLatestPerWorkStream(progressLogs);
  const latestBumps = getLatestPerWorkStream(bumpLogs);

  const allWsIds = [
    ...latestProgress.map((l) => l.workStreamId!),
    ...latestBumps.map((l) => l.workStreamId!),
  ];
  const uniqueWsIds = [...new Set(allWsIds)];

  const workStreams = await prisma.workStream.findMany({
    where: { id: { in: uniqueWsIds } },
    include: {
      project: { select: { id: true, name: true } },
      flowStages: { where: { archived: false } },
    },
  });

  const wsMap = new Map(workStreams.map((ws) => [ws.id, ws]));

  const enrich = (logs: typeof progressLogs) =>
    logs.map((log) => {
      const ws = wsMap.get(log.workStreamId!);
      const stages = ws ? buildStagesWithDerived(ws.flowStages) : [];
      const currentStage = computeCurrentStage(stages);
      return {
        ...log,
        workStreamName: ws?.name ?? null,
        projectName: ws?.project.name ?? "Unknown",
        currentStage: currentStage?.name ?? null,
        currentBall: ws?.currentBall ?? null,
      };
    });

  return NextResponse.json({
    latestProgress: enrich(latestProgress),
    latestBumps: enrich(latestBumps),
  });
}
