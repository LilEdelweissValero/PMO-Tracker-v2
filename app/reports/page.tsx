"use client";

import { useState } from "react";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";
import { computeAggregateStatus, getStatusColorClass } from "@/lib/feature";
import type { ProjectWithWorkStreams } from "@/lib/types";

export default function ReportsPage() {
  const [date, setDate] = useState("");
  const [projects, setProjects] = useState<ProjectWithWorkStreams[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchReport = async () => {
    if (!date) return;
    setLoading(true);
    const res = await fetch(`/api/reports?asOf=${date}`);
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects);
    }
    setLoading(false);
    setFetched(true);
  };

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Reports
      </h1>

      <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-end", marginBottom: "var(--space-lg)" }}>
        <DatePicker value={date} onChange={setDate} label="As of date" />
        <button
          onClick={fetchReport}
          disabled={!date || loading}
          style={{
            padding: "7px 12px",
            border: "none",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent)",
            color: "#FFFFFF",
            cursor: date ? "pointer" : "not-allowed",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
            opacity: date ? 1 : 0.5,
          }}
        >
          {loading ? "Loading..." : "Generate Report"}
        </button>
      </div>

      {fetched && (
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["ID", "Project Name", "Status", "Priority", "PM Officer", "Request Type", "Initiated By", "System"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      backgroundColor: i < 2 ? "var(--ink-primary)" : "var(--ground-metric)",
                      color: i < 2 ? "var(--ink-on-dark)" : "var(--ink-primary)",
                      borderBottom: "1px solid var(--rule-strong)",
                      borderRight: i === 1 ? "1px solid var(--ink-secondary)" : "none",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "var(--space-lg)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    No projects found for this date
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const status = computeAggregateStatus(project.workStreams);
                  const colors = getStatusColorClass(status);
                  return (
                    <tr key={project.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                      <td style={{ padding: "8px 10px", borderRight: "1px solid var(--rule)" }}>{project.projectId}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <Link href={`/projects/${project.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                          {project.name}
                        </Link>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ padding: "2px 7px", borderRadius: "var(--radius-sm)", backgroundColor: colors.bg, color: colors.ink, fontSize: "11px", fontWeight: 600 }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.priority || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.pmOfficer || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.requestType || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.initiatedBy || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.systemName || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
