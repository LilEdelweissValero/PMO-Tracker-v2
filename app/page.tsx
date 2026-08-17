"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LatestEntry, DashboardData } from "@/lib/types";

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

  const renderTable = (title: string, entries: LatestEntry[]) => (
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
              {["Project", "Work Stream", "Current Stage", "Date", "Note"].map((h) => (
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
                <td colSpan={5} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                  No entries
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

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Dashboard
      </h1>
      <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
        {renderTable("Latest Progress", data?.latestProgress ?? [])}
        {renderTable("Latest Bumps", data?.latestBumps ?? [])}
      </div>
    </div>
  );
}
