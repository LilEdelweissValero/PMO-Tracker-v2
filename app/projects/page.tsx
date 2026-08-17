"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EntityFormModal from "@/components/EntityFormModal";
import { computeAggregateStatus, getStatusColorClass } from "@/lib/feature";
import { playPing, playPrompt } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { ProjectWithWorkStreams } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithWorkStreams[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchProjects = () => {
    fetch("/api/project")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load projects (${r.status})`);
        return r.json();
      })
      .then((d) => { setProjects(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (data: Record<string, string | number>) => {
    const res = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to create project (${res.status})`);
    }
    fetchProjects();
    playPing();
    showToast("Project created");
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading projects...</div>
      </div>
    );
  }

  const columns = [
    { key: "id", label: "#", width: "50px", zone: "identity" as const },
    { key: "name", label: "Project Name", zone: "identity" as const },
    { key: "status", label: "Status", zone: "metric" as const },
    { key: "priority", label: "Priority", width: "80px", zone: "metric" as const },
    { key: "pmOfficer", label: "PM Officer", zone: "metric" as const },
    { key: "requestType", label: "Request Type", zone: "metric" as const },
    { key: "initiatedBy", label: "Initiated By", zone: "metric" as const },
    { key: "systemName", label: "System", zone: "metric" as const },
  ];

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1 }}>
          Projects
        </h1>
        <button
          onClick={() => { playPrompt(); setShowCreate(true); }}
          style={{
            padding: "7px 12px",
            border: "none",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent)",
            color: "#FFFFFF",
            cursor: "pointer",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
          }}
        >
          New Project
        </button>
      </div>

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    backgroundColor: col.zone === "identity" ? "var(--ink-primary)" : "var(--ground-metric)",
                    color: col.zone === "identity" ? "var(--ink-on-dark)" : "var(--ink-primary)",
                    borderBottom: "1px solid var(--rule-strong)",
                    borderRight: col.zone === "identity" ? "1px solid var(--ink-secondary)" : "none",
                    width: col.width,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const status = computeAggregateStatus(project.workStreams);
              const colors = getStatusColorClass(status);
              return (
                <tr
                  key={project.id}
                  style={{ borderBottom: "1px solid var(--rule)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                >
                  <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums", borderRight: "1px solid var(--rule)" }}>
                    {project.id}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <Link
                      href={`/projects/${project.id}`}
                      style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: colors.bg,
                        color: colors.ink,
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                      }}
                    >
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
            })}
          </tbody>
        </table>
      </div>

      <EntityFormModal
        key={showCreate ? "create-open" : "create-closed"}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Project"
        fields={[
          { key: "name", label: "Project Name", required: true },
          { key: "priority", label: "Priority", type: "combo", configCategory: "priority", required: true },
          { key: "scopeDescription", label: "Scope Description", type: "textarea", required: true },
          { key: "initiatedBy", label: "Initiated By", type: "combo", configCategory: "initiated_by", required: true },
          { key: "requestedByName", label: "Requested By Name", type: "combo", configCategory: "requested_by_name", required: true },
          { key: "requestedByDept", label: "Requested By Dept", type: "combo", configCategory: "requested_by_dept", required: true },
          { key: "requestType", label: "Request Type", type: "combo", configCategory: "request_type", required: true },
          { key: "pmOfficer", label: "PM Officer", type: "combo", configCategory: "pm_officer", required: true },
        ]}
        onSubmit={handleCreate}
      />
    </div>
  );
}
