"use client";

import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import SortableTh from "@/components/SortableTh";
import BumpModal from "@/components/BumpModal";
import { useTableSort, type SortAccessor } from "@/lib/useTableSort";
import { playPrompt } from "@/lib/sound";
import type { LatestEntry, DashboardData } from "@/lib/types";

interface DashboardColumn {
  key: string;
  label: string;
}

const progressColumns: DashboardColumn[] = [
  { key: "project", label: "Project ID" },
  { key: "workStream", label: "Work Stream" },
  { key: "currentStage", label: "Current Stage" },
  { key: "ballHolder", label: "Ball Holder" },
  { key: "duration", label: "Duration" },
];

const bumpColumns: DashboardColumn[] = [
  { key: "project", label: "Project ID" },
  { key: "workStream", label: "Work Stream" },
  { key: "currentStage", label: "Task" },
  { key: "ballHolder", label: "Ball Holder" },
  { key: "duration", label: "Duration" },
];

const dashboardAccessors: Record<string, SortAccessor<LatestEntry>> = {
  project: (e) => e.projectCode,
  workStream: (e) => e.workStreamName,
  currentStage: (e) => e.currentStage,
  ballHolder: (e) => e.ballHolder,
  note: (e) => e.note,
  duration: (e) => e.durationMs ?? 0,
};

interface RenderContext {
  entry: LatestEntry;
}

type CellRenderer = (ctx: RenderContext) => ReactNode;

function ProjectCell({ entry }: RenderContext) {
  return (
    <Link
      href={`/projects/${entry.projectId}`}
      style={{ color: "var(--accent)", textDecoration: "none" }}
    >
      {entry.projectCode || entry.projectName}
    </Link>
  );
}

const cellRenderers: Record<string, CellRenderer> = {
  project: ({ entry }) => <ProjectCell entry={entry} />,
  workStream: ({ entry }) => entry.workStreamName || "—",
  currentStage: ({ entry }) => entry.currentStage || "—",
  ballHolder: ({ entry }) => entry.ballHolder || "—",
  note: ({ entry }) => entry.note || "—",
  duration: ({ entry }) => entry.duration || "—",
};

const cellStyles: Record<string, CSSProperties> = {
  workStream: { color: "var(--ink-secondary)" },
  ballHolder: { color: "var(--ink-secondary)" },
  note: { color: "var(--ink-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  duration: { color: "var(--ink-secondary)", fontVariantNumeric: "tabular-nums" },
};

function DashboardTable({
  title,
  entries,
  columns,
  action,
}: {
  title: string;
  entries: LatestEntry[];
  columns: DashboardColumn[];
  action?: { label: string; onClick: (entry: LatestEntry) => void };
}) {
  const { sort, sortedRows, toggleSort } = useTableSort(entries, dashboardAccessors, {
    key: "duration",
    direction: "desc",
  });
  const [hoveredId, setHoveredId] = useState<number | null>(null);

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
              {columns.map((col) => (
                <SortableTh
                  key={col.key}
                  label={col.label}
                  sort={sort}
                  sortKey={col.key}
                  onSort={toggleSort}
                  hideArrow={col.key === "duration"}
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
                <td colSpan={columns.length} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                  No entries
                </td>
              </tr>
            ) : (
              sortedRows.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: "1px solid var(--rule)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; setHoveredId(entry.id); }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; setHoveredId(null); }}
                >
                  {columns.map((col, i) => {
                    const isLast = i === columns.length - 1;
                    const showAction = isLast && action && hoveredId === entry.id && entry.projectId && entry.workStreamId;
                    return (
                      <td key={col.key} style={{ padding: "8px 10px", ...cellStyles[col.key] }}>
                        {isLast && showAction ? (
                          <span style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playPrompt();
                                action!.onClick(entry);
                              }}
                              style={{
                                padding: "3px 10px",
                                border: "1px solid var(--rule-strong)",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "transparent",
                                color: "var(--ink-secondary)",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: 600,
                                letterSpacing: "0.06em",
                                fontFamily: "var(--font-sans)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {action!.label}
                            </button>
                          </span>
                        ) : (
                          cellRenderers[col.key]?.({ entry })
                        )}
                      </td>
                    );
                  })}
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
  const [bumpTarget, setBumpTarget] = useState<{ projectId: number; workStreamId: number } | null>(null);

  const loadDashboard = () => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load dashboard (${r.status})`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

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
        <DashboardTable title="Latest Progress" entries={data?.latestProgress ?? []} columns={progressColumns} />
        <DashboardTable
          title="Latest Bumps"
          entries={data?.latestBumps ?? []}
          columns={bumpColumns}
          action={{
            label: "BUMP",
            onClick: (entry) => {
              if (entry.projectId && entry.workStreamId) {
                setBumpTarget({ projectId: entry.projectId, workStreamId: entry.workStreamId });
              }
            },
          }}
        />
      </div>

      <BumpModal
        open={bumpTarget !== null}
        projectId={bumpTarget?.projectId ?? 0}
        workStreamIds={bumpTarget ? [bumpTarget.workStreamId] : []}
        onClose={() => setBumpTarget(null)}
        onSaved={loadDashboard}
      />
    </div>
  );
}
