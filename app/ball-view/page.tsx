"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LatestEntry, BallViewData } from "@/lib/types";

export default function BallViewPage() {
  const [data, setData] = useState<BallViewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        const all = [...d.latestProgress, ...d.latestBumps];
        const byBall: BallViewData = { pmo: [], developers: [], systemOwner: [] };
        const seen = new Map<number, LatestEntry>();

        for (const entry of all) {
          const key = entry.workStreamId ?? entry.id;
          if (!seen.has(key)) seen.set(key, entry);
        }

        for (const entry of seen.values()) {
          const ball = entry.currentBall?.toLowerCase() ?? "";
          if (ball === "pmo") byBall.pmo.push(entry);
          else if (ball === "developers") byBall.developers.push(entry);
          else if (ball === "system owner") byBall.systemOwner.push(entry);
          else byBall.pmo.push(entry);
        }

        setData(byBall);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading ball view...</div>
      </div>
    );
  }

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
        {renderTable("PMO", data?.pmo ?? [])}
        {renderTable("Developers", data?.developers ?? [])}
        {renderTable("System Owner", data?.systemOwner ?? [])}
      </div>
    </div>
  );
}
