"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SortableTh from "@/components/SortableTh";
import { useTableSort, type SortAccessor } from "@/lib/useTableSort";
import type { LatestEntry, BallViewData } from "@/lib/types";

const FALLBACK_BALL_GROUPS = ["Project Management Office", "Developers", "Business Unit"];

const ballColumns = [
  { key: "project", label: "Project" },
  { key: "workStream", label: "Work Stream" },
  { key: "task", label: "Task" },
  { key: "duration", label: "Duration" },
];

const ballAccessors: Record<string, SortAccessor<LatestEntry>> = {
  project: (e) => e.projectCode,
  workStream: (e) => e.workStreamName,
  task: (e) => e.currentStage,
  duration: (e) => e.durationMs ?? 0,
};

function BallTable({ title, entries }: { title: string; entries: LatestEntry[] }) {
  const { sort, sortedRows, toggleSort } = useTableSort(entries, ballAccessors);

  return (
    <div style={{ flex: 1, minWidth: "350px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 750, marginBottom: "var(--space-sm)" }}>{title}</h2>
      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {ballColumns.map((col) => (
                <SortableTh
                  key={col.key}
                  label={col.label}
                  sort={sort}
                  sortKey={col.key}
                  onSort={toggleSort}
                  style={{
                    backgroundColor: "var(--ground-metric)",
                    borderBottom: "1px solid var(--rule-strong)",
                  }}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                  No work streams
                </td>
              </tr>
            ) : (
              sortedRows.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: "1px solid var(--rule)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                >
                  <td style={{ padding: "8px 10px" }}>
                    <Link href={`/projects/${entry.projectId}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                      {entry.projectCode || entry.projectName}
                    </Link>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{entry.workStreamName || "—"}</td>
                  <td style={{ padding: "8px 10px", width: "100%" }}>
                    <div style={{ fontWeight: 500 }}>{entry.currentStage || "—"}</div>
                    <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--ink-tertiary)" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--ink-tertiary)", flexShrink: 0 }} />
                      {entry.ballPerson || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {entry.duration || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BallViewPage() {
  const [data, setData] = useState<BallViewData | null>(null);
  const [groups, setGroups] = useState<string[]>(FALLBACK_BALL_GROUPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/config-value?category=ball_groups").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ])
      .then(([config, d]) => {
        if (cancelled) return;
        const configGroups = (config as { value: string }[])
          .map((c) => c.value)
          .filter((v) => v.trim());
        const groupList = configGroups.length ? configGroups : FALLBACK_BALL_GROUPS;
        setGroups(groupList);

        const all = [...d.latestProgress, ...d.latestBumps];
        const byBall: BallViewData = {};
        groupList.forEach((g) => { byBall[g] = []; });
        byBall["Other"] = [];
        const seen = new Map<number, LatestEntry>();

        for (const entry of all) {
          const key = entry.workStreamId ?? entry.id;
          if (!seen.has(key)) seen.set(key, entry);
        }

        for (const entry of seen.values()) {
          const ball = entry.currentBall?.toLowerCase() ?? "";
          const match = groupList.find((g) => g.toLowerCase() === ball);
          const target = match ?? "Other";
          byBall[target].push(entry);
        }

        setData(byBall);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading ball view...</div>
      </div>
    );
  }

  const visibleGroups = [...groups];
  if ((data?.["Other"] ?? []).length > 0) visibleGroups.push("Other");

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Ball View
      </h1>
      <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
        {visibleGroups.map((group) => (
          <BallTable key={group} title={group} entries={data?.[group] ?? []} />
        ))}
      </div>
    </div>
  );
}
