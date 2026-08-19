"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SortableTh from "@/components/SortableTh";
import { useTableSort, type SortAccessor } from "@/lib/useTableSort";
import type { LatestEntry, DashboardData } from "@/lib/types";

const dashboardColumns = [
  { key: "project", label: "Project" },
  { key: "workStream", label: "Work Stream" },
  { key: "currentStage", label: "Current Stage" },
  { key: "date", label: "Date" },
  { key: "note", label: "Note" },
];

const dateValue = (entry: LatestEntry): number => {
  const t = new Date(entry.bumpDate ?? entry.changedAt).getTime();
  return Number.isFinite(t) ? t : 0;
};

const dashboardAccessors: Record<string, SortAccessor<LatestEntry>> = {
  project: (e) => e.projectName,
  workStream: (e) => e.workStreamName,
  currentStage: (e) => e.currentStage,
  date: (e) => dateValue(e),
  note: (e) => e.note,
};

function DashboardTable({ title, entries }: { title: string; entries: LatestEntry[] }) {
  const { sort, sortedRows, toggleSort } = useTableSort(entries, dashboardAccessors);

  return (
    <div style={{ flex: 1, minWidth: "400px" }}>
      <h2
        style={{
          fontSize: "14px",
          fontWeight: 750,
          marginBottom: "var(--space-sm)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {title}
      </h2>
      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {dashboardColumns.map((col) => (
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
                <td colSpan={5} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                  No entries
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
                    <Link
                      href={`/projects/${entry.projectId}`}
                      style={{ color: "var(--accent)", textDecoration: "none" }}
                    >
                      {entry.projectName}
                    </Link>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                    {entry.workStreamName || "—"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{entry.currentStage || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {(entry.bumpDate ? new Date(entry.bumpDate) : new Date(entry.changedAt)).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.note || "—"}
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load dashboard (${r.status})`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Dashboard
      </h1>
      <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
        <DashboardTable title="Latest Progress" entries={data?.latestProgress ?? []} />
        <DashboardTable title="Latest Bumps" entries={data?.latestBumps ?? []} />
      </div>
    </div>
  );
}
