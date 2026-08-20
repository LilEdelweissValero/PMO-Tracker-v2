import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildStagesWithDerived, computeCurrentStage } from "@/lib/feature";
import { formatDuration } from "@/lib/duration";

interface WorkStreamEnrich {
  name: string | null;
  currentBall: string | null;
  assignedDeveloper: string | null;
  archived: boolean;
  flowStages: {
    id: number;
    workStreamId: number;
    name: string;
    orderIdx: number;
    plannedDate: Date | null;
    actualDate: Date | null;
    responsibleGroup: string | null;
    responsiblePerson: string | null;
  }[];
  project: {
    id: number;
    name: string;
    projectId: string;
    pmOfficer: string | null;
    systemOwnerName: string | null;
    archived: boolean;
  };
}

function formatBallHolder(ballGroup: string | null, ws: WorkStreamEnrich, acronymMap: Map<string, string>): string {
  const group = ballGroup?.trim() || "Project Management Office";
  const normalized = group.toLowerCase();
  let person: string | null = null;
  if (normalized === "project management office") person = ws.project.pmOfficer;
  else if (normalized === "developers") person = ws.assignedDeveloper;
  else if (normalized === "business unit") person = ws.project.systemOwnerName;
  const label = acronymMap.get(normalized) || group;
  return person ? `${label} - ${person}` : label;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf");
  const parsedAsOf = asOf ? new Date(asOf) : null;
  const reference = parsedAsOf && !isNaN(parsedAsOf.getTime()) ? parsedAsOf : new Date();

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

  const ballGroups = await prisma.configValue.findMany({
    where: { category: "ball_groups", archived: false },
    orderBy: { sortOrder: "asc" },
  });
  const acronymMap = new Map<string, string>(
    ballGroups
      .filter((g) => g.acronym)
      .map((g) => [g.value.toLowerCase(), g.acronym!])
  );

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
      project: {
        select: {
          id: true,
          name: true,
          projectId: true,
          pmOfficer: true,
          systemOwnerName: true,
          archived: true,
        },
      },
      flowStages: { where: { archived: false } },
    },
  });

  const wsMap = new Map(workStreams.map((ws) => [ws.id, ws]));
  const activeWsIds = new Set(
    workStreams
      .filter((ws) => !ws.archived && !ws.project.archived)
      .map((ws) => ws.id)
  );

  const enrich = (logs: typeof progressLogs, kind: "progress" | "bump") =>
    logs
      .filter((log) => log.workStreamId && activeWsIds.has(log.workStreamId))
      .map((log) => {
        const ws = wsMap.get(log.workStreamId!) as WorkStreamEnrich | undefined;
        const stages = ws ? buildStagesWithDerived(ws.flowStages) : [];
        const currentStage = computeCurrentStage(stages);

        const ballGroup = kind === "bump" ? log.newValue || ws?.currentBall || null : ws?.currentBall ?? null;
        const anchor =
          kind === "bump"
            ? (log.bumpDate ?? log.changedAt).getTime()
            : currentStage?.actualDate?.getTime() ?? null;
        const durationMs = anchor === null ? null : Math.max(0, reference.getTime() - anchor);

        return {
          ...log,
          workStreamName: ws?.name ?? null,
          projectName: ws?.project.name ?? "Unknown",
          projectCode: ws?.project.projectId ?? null,
          currentStage: currentStage?.name ?? "Not Started",
          currentBall: ws?.currentBall ?? null,
          ballHolder: ws ? formatBallHolder(ballGroup, ws, acronymMap) : null,
          durationMs,
          duration: formatDuration(durationMs),
        };
      });

  return NextResponse.json({
    latestProgress: enrich(latestProgress, "progress"),
    latestBumps: enrich(latestBumps, "bump"),
  });
}
