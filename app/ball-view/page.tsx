"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LatestEntry, BallViewData } from "@/lib/types";

const FALLBACK_BALL_GROUPS = ["PMO", "Developers", "System Owner"];

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

  const renderTable = (title: string, entries: LatestEntry[]) => (
    <div style={{ flex: 1, minWidth: "350px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 750, marginBottom: "var(--space-sm)" }}>{title}</h2>
      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {["Project", "Initiated By", "Latest Progress", "Latest Bump"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    backgroundColor: "var(--ground-metric)",
                    borderBottom: "1px solid var(--rule-strong)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                  No work streams
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: "1px solid var(--rule)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                >
                  <td style={{ padding: "8px 10px" }}>
                    <Link href={`/projects/${entry.projectId}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                      {entry.projectName}
                    </Link>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{entry.currentStage || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{entry.note || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{entry.changedBy || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Ball View
      </h1>
      <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
        {visibleGroups.map((group) => renderTable(group, data?.[group] ?? []))}
      </div>
    </div>
  );
}
