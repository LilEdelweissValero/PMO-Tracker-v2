"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EntityFormModal from "@/components/EntityFormModal";
import SortableTh from "@/components/SortableTh";
import { useColumnSort, type SortAccessor } from "@/lib/useColumnSort";
import { computeProjectStatus, getStatusColorClass } from "@/lib/feature";
import { useFlowTemplate } from "@/lib/useFlowTemplate";
import { playPing, playPrompt } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { ProjectWithWorkStreams, FormValue } from "@/lib/types";

const getSystemLabel = (project: ProjectWithWorkStreams): string => {
  const systems = project.systems ?? [];
  if (systems.length > 0) {
    return systems.map((s) => s.acronym || s.system).join(", ");
  }
  return project.systemName || "—";
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithWorkStreams[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<{ value: string }[]>([]);
  const templateStages = useFlowTemplate();

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

  useEffect(() => {
    fetch("/api/config-value?category=project_status")
      .then((r) => r.json())
      .then((data) => setProjectStatuses(data as { value: string }[]))
      .catch(() => {});
  }, []);

  const projectAccessors: Record<string, SortAccessor<ProjectWithWorkStreams>> = {
    id: (p) => p.projectId,
    name: (p) => p.name,
    systemName: (p) => getSystemLabel(p),
    status: (p) => computeProjectStatus(p.workStreams, templateStages),
    priority: (p) => p.priority,
    requestedByName: (p) => p.requestedByName,
    pmOfficer: (p) => p.pmOfficer,
    requestType: (p) => p.requestType,
    initiatedBy: (p) => p.initiatedBy,
  };

  const {
    sort,
    sortedRows,
    toggleSort,
    saveOrder,
    saving,
  } = useColumnSort(projects, projectAccessors, "project", () => {
    fetchProjects();
    playPing();
    showToast("Order saved");
  });

  const handleCreate = async (data: Record<string, FormValue>) => {
    const res = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to create project (${res.status})`);
    }
    const created = await res.json();
    playPing();
    showToast("Project created");
    router.push(`/projects/${created.id}?openBump=1`);
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading projects...</div>
      </div>
    );
  }

  const columns = [
    { key: "id", label: "ID", width: "70px", zone: "identity" as const },
    { key: "name", label: "Project Name", zone: "identity" as const },
    { key: "systemName", label: "System", width: "220px", zone: "metric" as const },
    { key: "status", label: "Status", width: "150px", zone: "metric" as const },
    { key: "priority", label: "Priority", width: "80px", zone: "metric" as const },
    { key: "requestedByName", label: "Project Owner", zone: "metric" as const },
    { key: "pmOfficer", label: "PM Officer", zone: "metric" as const },
    { key: "requestType", label: "Request Type", zone: "metric" as const },
    { key: "initiatedBy", label: "Initiated By", zone: "metric" as const },
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
                <SortableTh
                  key={col.key}
                  label={col.label}
                  sort={sort}
                  sortKey={col.key}
                  onSort={toggleSort}
                  action={sort?.key === col.key ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); saveOrder(); }}
                      disabled={saving}
                      style={{
                        padding: "1px 6px",
                        border: "1px solid currentColor",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "transparent",
                        color: "inherit",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        fontFamily: "var(--font-sans)",
                        opacity: saving ? 0.5 : 1,
                        lineHeight: "14px",
                        marginLeft: "4px",
                      }}
                    >
                      {saving ? "…" : "SAVE"}
                    </button>
                  ) : undefined}
                  style={{
                    backgroundColor: col.zone === "identity" ? "var(--ink-primary)" : "var(--ground-metric)",
                    color: col.zone === "identity" ? "var(--ink-on-dark)" : "var(--ink-primary)",
                    borderBottom: "1px solid var(--rule-strong)",
                    borderRight: col.zone === "identity" ? "1px solid var(--ink-secondary)" : "none",
                    width: col.width,
                  }}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((project) => {
              const status = computeProjectStatus(project.workStreams, templateStages);
              const colors = getStatusColorClass(status, projectStatuses);
              return (
                <tr
                  key={project.id}
                  style={{ borderBottom: "1px solid var(--rule)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                >
                  <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums", borderRight: "1px solid var(--rule)" }}>
                    {project.projectId || "—"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <Link
                      href={`/projects/${project.id}`}
                      style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                    {getSystemLabel(project)}
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.priority || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.requestedByName || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.pmOfficer || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.requestType || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{project.initiatedBy || "—"}</td>
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
          { key: "projectId", label: "ID", required: true },
          { key: "name", label: "Project Name", required: true },
          { key: "priority", label: "Priority", type: "combo", configCategory: "priority", required: true, strict: true },
          { key: "scopeDescription", label: "Scope Description", type: "textarea", required: true },
          { key: "initiatedBy", label: "Initiated By", type: "combo", configCategory: "initiated_by", required: true, strict: true },
          { key: "requestedByName", label: "Requested By Name", type: "combo", configCategory: "requested_by_name", required: true },
          { key: "requestedByDept", label: "Requested By Dept", type: "combo", configCategory: "requested_by_dept", required: true },
          { key: "requestType", label: "Request Type", type: "combo", configCategory: "request_type", required: true, strict: true },
          { key: "systems", label: "Systems Affected", type: "systemModules", hiddenIf: (d) => String(d.requestType ?? "").trim() === "New System" },
          { key: "pmOfficer", label: "PM Officer", type: "combo", configCategory: "pm_officer", required: true, strict: true },
          { key: "_divider1", label: "", type: "divider", dividerLabel: "Ball Setup" },
          { key: "currentBall", label: "Initial Ball Group", type: "combo", configCategory: "ball_groups", required: true, strict: true },
        ]}
        onSubmit={handleCreate}
      />
    </div>
  );
}
