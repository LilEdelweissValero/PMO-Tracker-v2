"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DetailHero from "@/components/DetailHero";
import HealthBadge from "@/components/HealthBadge";
import DatePicker from "@/components/DatePicker";
import LinkEditor from "@/components/LinkEditor";
import Modal from "@/components/Modal";
import EntityFormModal from "@/components/EntityFormModal";
import BumpModal from "@/components/BumpModal";
import { computeProjectStatus, computeHealth, buildWorkStreamWithDerived, getStatusColorClass } from "@/lib/feature";
import { useFlowTemplate } from "@/lib/useFlowTemplate";
import { playPing, playPrompt } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { ProjectWithWorkStreams, WorkStreamWithStages, ReferenceLink, ChangeLogEntry, UnitInvolved, FormValue } from "@/lib/types";

const FALLBACK_BALL_GROUPS = ["PMO", "Developers", "System Owner"];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const [project, setProject] = useState<ProjectWithWorkStreams | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAddWorkStream, setShowAddWorkStream] = useState(false);
  const [showManageSystems, setShowManageSystems] = useState(false);
  const [ballGroups, setBallGroups] = useState<string[]>(FALLBACK_BALL_GROUPS);
  const [units, setUnits] = useState<UnitInvolved[]>([]);
  const [bumpWsId, setBumpWsId] = useState<number | null>(null);
  const [bumpsWs, setBumpsWs] = useState<WorkStreamWithStages | null>(null);
  const [bumpsList, setBumpsList] = useState<ChangeLogEntry[] | null>(null);
  const [addStageWsId, setAddStageWsId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const autoBumpOpened = useRef(false);
  const templateStages = useFlowTemplate();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config-value?category=ball_groups")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const groups = (data as { value: string }[])
            .map((c) => c.value)
            .filter((v) => v.trim());
          if (groups.length) setBallGroups(groups);
        }
      })
      .catch(() => {});
    fetch("/api/unit-involved")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUnits(data as UnitInvolved[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/project/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const enriched = {
            ...data,
            workStreams: data.workStreams.map((ws: Record<string, unknown> & { flowStages: unknown[] }) =>
              buildWorkStreamWithDerived({
                ...ws,
                flowStages: (ws.flowStages as Record<string, unknown>[]).map((s) => ({
                  ...s,
                  plannedDate: s.plannedDate ? new Date(s.plannedDate as string) : null,
                  actualDate: s.actualDate ? new Date(s.actualDate as string) : null,
                })),
              } as Parameters<typeof buildWorkStreamWithDerived>[0])
            ),
          };
          const searchParams =
            typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const openBump = searchParams !== null && searchParams.get("openBump") === "1";
          const wsParam = Number(searchParams?.get("ws"));
          const targetWs =
            enriched.workStreams.find((w: { id: number }) => w.id === wsParam) ?? enriched.workStreams[0];
          if (openBump && !autoBumpOpened.current && targetWs) {
            autoBumpOpened.current = true;
            setBumpWsId(targetWs.id);
            window.history.replaceState(null, "", `/projects/${projectId}`);
          }
          setProject(enriched);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const refetch = () => {
    fetch(`/api/project/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const enriched = {
          ...data,
          workStreams: data.workStreams.map((ws: Record<string, unknown> & { flowStages: unknown[] }) =>
            buildWorkStreamWithDerived({
              ...ws,
              flowStages: (ws.flowStages as Record<string, unknown>[]).map((s) => ({
                ...s,
                plannedDate: s.plannedDate ? new Date(s.plannedDate as string) : null,
                actualDate: s.actualDate ? new Date(s.actualDate as string) : null,
              })),
            } as Parameters<typeof buildWorkStreamWithDerived>[0])
          ),
        };
        setProject(enriched);
      });
  };

  const updateProject = async (data: Record<string, string | number | ReferenceLink[] | number[]>) => {
    const res = await fetch(`/api/project/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to update project (${res.status})`);
    }
    refetch();
    playPing();
    showToast("Project updated");
  };

  const updateWorkStream = async (wsId: number, data: Record<string, string | number | null>) => {
    await fetch(`/api/work-stream/${wsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refetch();
    playPing();
    showToast("Work stream updated");
  };

  const updateStage = async (stageId: number, data: Record<string, string | number | null>) => {
    await fetch(`/api/flow-stage/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refetch();
    playPing();
  };

  const addStage = async (data: Record<string, FormValue>) => {
    if (addStageWsId === null) return;
    const res = await fetch("/api/flow-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workStreamId: addStageWsId, name: data.name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to add stage (${res.status})`);
    }
    setAddStageWsId(null);
    refetch();
    playPing();
    showToast("Stage added");
  };

  const deleteStage = async (stageId: number) => {
    await fetch(`/api/flow-stage/${stageId}`, { method: "DELETE" });
    refetch();
    playPing();
    showToast("Stage deleted");
  };

  const reorderStage = async (wsId: number, stageId: number, direction: "up" | "down") => {
    const ws = project?.workStreams.find((w) => w.id === wsId);
    if (!ws) return;
    const sorted = [...ws.flowStages].sort((a, b) => a.orderIdx - b.orderIdx);
    const idx = sorted.findIndex((s) => s.id === stageId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      fetch(`/api/flow-stage/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIdx: b.orderIdx }),
      }),
      fetch(`/api/flow-stage/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIdx: a.orderIdx }),
      }),
    ]);
    refetch();
  };

  const openBumpsModal = (ws: WorkStreamWithStages) => {
    setBumpsWs(ws);
    setBumpsList(null);
    fetch(`/api/change-log?workStreamId=${ws.id}&entryType=bump`)
      .then((r) => r.json())
      .then((data) => setBumpsList(data as ChangeLogEntry[]))
      .catch(() => setBumpsList([]));
  };

  const addWorkStream = async (data: Record<string, FormValue>) => {
    const res = await fetch("/api/work-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, projectId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to add work stream (${res.status})`);
    }
    refetch();
    playPing();
    showToast("Work stream added");
  };

  const deleteProject = async () => {
    const res = await fetch(`/api/project/${projectId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to delete project (${res.status})`);
    }
    playPing();
    showToast("Project deleted");
    router.replace("/projects");
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Project not found</div>
      </div>
    );
  }

  const status = computeProjectStatus(project.workStreams, templateStages);
  const statusColors = getStatusColorClass(status);
  const refs: ReferenceLink[] = Array.isArray(project.references) ? project.references : [];

  const metaFields = [
    { label: "PM Officer", value: project.pmOfficer },
    { label: "Request Type", value: project.requestType },
    { label: "Project Owner", value: project.requestedByName },
  ];

  const systems = Array.isArray(project.systems) ? project.systems : [];
  const acronyms = systems.map((s) => s.acronym || s.system);

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <DetailHero
        kicker="Project"
        title={project.name}
        meta={metaFields}
        accentColor={statusColors.bg}
        acronyms={acronyms}
        status={{ label: status, colors: statusColors }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)", marginTop: "var(--space-lg)" }}>
        <Section title="Project Info">
          <FieldRow label="Name" value={project.name} onEdit={() => { playPrompt(); setEditingField("name"); }} />
          <FieldRow label="Priority" value={project.priority} onEdit={() => { playPrompt(); setEditingField("priority"); }} />
          <FieldRow label="Scope" value={project.scopeDescription} onEdit={() => { playPrompt(); setEditingField("scopeDescription"); }} multiline large />
          <FieldRow label="Initiated By" value={project.initiatedBy} onEdit={() => { playPrompt(); setEditingField("initiatedBy"); }} />
          <FieldRow label="Project Owner" value={project.requestedByName} onEdit={() => { playPrompt(); setEditingField("requestedByName"); }} />
          <FieldRow label="Business Unit" value={project.requestedByDept} onEdit={() => { playPrompt(); setEditingField("requestedByDept"); }} />
          <div style={{ marginTop: "var(--space-sm)" }}>
            <div className="label-caps" style={{ marginBottom: "4px", color: "var(--ink-tertiary)" }}>References</div>
            <LinkEditor
              value={refs}
              onChange={(links) => updateProject({ references: links })}
            />
          </div>
        </Section>

        <Section title="System Affected">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-sm)" }}>
            <button
              onClick={() => { playPrompt(); setShowManageSystems(true); }}
              style={{
                padding: "7px 12px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface)",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
              }}
            >
              Manage Systems
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["System", "Module", "Owner", "Owner Dept", "Developer Assigned"].map((h) => (
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
              {systems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    No chosen system yet.
                  </td>
                </tr>
              ) : (
                systems.map((sys) => (
                  <tr key={sys.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{sys.system}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.module || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.systemOwnerName || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.systemOwnerDept || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.developerAssigned || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>
      </div>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Work Streams</h2>
          <button
            onClick={() => { playPrompt(); setShowAddWorkStream(true); }}
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
            + Add Work Stream
          </button>
        </div>

        {project.workStreams.map((ws) => (
          <WorkStreamCard
            key={ws.id}
            ws={ws}
            ballGroups={ballGroups}
            units={units}
            onUpdateName={(name) => updateWorkStream(ws.id, { name })}
            onUpdateDeveloper={(dev) => updateWorkStream(ws.id, { assignedDeveloper: dev })}
            onUpdateBall={(ball) => updateWorkStream(ws.id, { currentBall: ball })}
            onUpdateStage={(stageId, data) => updateStage(stageId, data)}
            onReorderStage={(stageId, direction) => reorderStage(ws.id, stageId, direction)}
            onDeleteStage={deleteStage}
            onAddStage={() => { playPrompt(); setAddStageWsId(ws.id); }}
            onBump={() => { playPrompt(); setBumpWsId(ws.id); }}
            onOpenBumps={() => openBumpsModal(ws)}
          />
        ))}
      </div>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <Section title="Remarks">
          <textarea
            value={project.remarks || ""}
            onChange={(e) => updateProject({ remarks: e.target.value })}
            rows={3}
            placeholder="Add remarks..."
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </Section>
      </div>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <Section title="Danger Zone">
          <button
            onClick={() => { playPrompt(); setShowDeleteConfirm(true); }}
            style={{
              padding: "7px 12px",
              border: "1px solid var(--health-atrisk-ink)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              color: "var(--health-atrisk-ink)",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
            }}
          >
            Delete Project
          </button>
        </Section>
      </div>

      <Modal open={!!editingField} onClose={() => setEditingField(null)} title={`Edit ${editingField ?? ""}`}>
        {editingField && (
          <EntityFormModal
            key={editingField ?? "edit"}
            open={true}
            onClose={() => setEditingField(null)}
            title={`Edit ${FIELD_LABEL_MAP[editingField] ?? editingField}`}
            fields={[{
              key: editingField,
              label: FIELD_LABEL_MAP[editingField] ?? editingField,
              type: (FIELD_TYPE_MAP[editingField]?.type as "text" | "textarea" | "combo") ?? "text",
              configCategory: FIELD_TYPE_MAP[editingField]?.configCategory,
              source: FIELD_TYPE_MAP[editingField]?.source,
              strict: FIELD_TYPE_MAP[editingField]?.strict,
              filterBy: FIELD_TYPE_MAP[editingField]?.filterBy,
              required: true,
            }]}
            initialData={{
              [editingField]: String((project as unknown as Record<string, unknown>)[editingField] ?? ""),
              ...(FIELD_TYPE_MAP[editingField]?.filterBy ? {
                [FIELD_TYPE_MAP[editingField].filterBy]: String((project as unknown as Record<string, unknown>)[FIELD_TYPE_MAP[editingField].filterBy] ?? ""),
              } : {}),
            }}
            onSubmit={(data) => { updateProject(data as Record<string, string | number | ReferenceLink[] | number[]>); setEditingField(null); }}
          />
        )}
      </Modal>

      <BumpModal
        open={bumpWsId !== null}
        projectId={projectId}
        workStreamIds={bumpWsId !== null ? [bumpWsId] : []}
        onClose={() => setBumpWsId(null)}
        onSaved={refetch}
      />

      <Modal open={bumpsWs !== null} onClose={() => setBumpsWs(null)} title={`Bumps — ${bumpsWs?.name ?? ""}`} wide>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Date", "Bump Msg", "Ball Holder", "Stage", "Changed By"].map((h) => (
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
              {!bumpsList ? (
                <tr>
                  <td colSpan={5} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    Loading...
                  </td>
                </tr>
              ) : bumpsList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    No bumps logged
                  </td>
                </tr>
              ) : (
                bumpsList.map((bump) => (
                  <tr key={bump.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>
                      {(bump.bumpDate ? new Date(bump.bumpDate) : new Date(bump.changedAt)).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{bump.note || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{bump.newValue || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{bump.fieldName || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{bump.changedBy || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      <EntityFormModal
        key={showAddWorkStream ? "ws-open" : "ws-closed"}
        open={showAddWorkStream}
        onClose={() => setShowAddWorkStream(false)}
        title="Add Work Stream"
        fields={[
          { key: "name", label: "Work Stream Name" },
          { key: "assignedDeveloper", label: "Assigned Developer", type: "combo", source: { url: "/api/unit-involved?group=Developers", valueKey: "name" }, strict: true },
        ]}
        onSubmit={addWorkStream}
      />

      <EntityFormModal
        key={addStageWsId !== null ? "stage-open" : "stage-closed"}
        open={addStageWsId !== null}
        onClose={() => setAddStageWsId(null)}
        title="Add Stage"
        fields={[
          { key: "name", label: "Stage Name", required: true },
        ]}
        onSubmit={addStage}
      />

      <EntityFormModal
        key={showManageSystems ? "systems-open" : "systems-closed"}
        open={showManageSystems}
        onClose={() => setShowManageSystems(false)}
        title="Manage Systems Affected"
        fields={[
          { key: "systemEntryIds", label: "Systems Affected", type: "multisource", source: { url: "/api/directory-entry", valueKey: "id", labelKey: "system", moduleKey: "module" } },
        ]}
        initialData={{
          systemEntryIds: systems.map((s) => s.id),
        }}
        onSubmit={async (data) => {
          await updateProject({ systemEntryIds: (data.systemEntryIds as number[]) ?? [] });
          setShowManageSystems(false);
        }}
      />

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Project">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <p style={{ fontSize: "13px", color: "var(--ink-secondary)", margin: 0, lineHeight: 1.5 }}>
            This will remove <strong style={{ color: "var(--ink-primary)" }}>{project.name}</strong> from the tracker. This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: "7px 12px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface)",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={deleteProject}
              style={{
                padding: "7px 12px",
                border: "none",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--health-atrisk-ink)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const FIELD_TYPE_MAP: Record<string, { type: string; configCategory?: string; source?: { url: string; valueKey: string }; strict?: boolean; filterBy?: string }> = {
  projectId: { type: "text" },
  name: { type: "text" },
  priority: { type: "combo", configCategory: "priority" },
  scopeDescription: { type: "textarea" },
  initiatedBy: { type: "combo", configCategory: "initiated_by", strict: true },
  requestedByName: { type: "combo", configCategory: "requested_by_name" },
  requestedByDept: { type: "combo", configCategory: "requested_by_dept" },
  requestType: { type: "combo", configCategory: "request_type" },
  pmOfficer: { type: "combo", configCategory: "pm_officer", strict: true },
  systemName: { type: "combo", source: { url: "/api/directory-entry", valueKey: "system" }, strict: true },
  specificModule: { type: "combo", source: { url: "/api/directory-entry", valueKey: "module" }, strict: true, filterBy: "systemName" },
  systemOwnerName: { type: "text" },
  systemOwnerDept: { type: "text" },
};

const FIELD_LABEL_MAP: Record<string, string> = {
  projectId: "ID",
  name: "Project Name",
  priority: "Priority",
  scopeDescription: "Scope Description",
  initiatedBy: "Initiated By",
  requestedByName: "Project Owner",
  requestedByDept: "Business Unit",
  requestType: "Request Type",
  pmOfficer: "PM Officer",
  systemName: "System Name",
  specificModule: "Specific Module",
  systemOwnerName: "System Owner Name",
  systemOwnerDept: "System Owner Dept",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
      }}
    >
      <h3 className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldRow({ label, value, onEdit, multiline, large }: { label: string; value: string | null; onEdit: () => void; multiline?: boolean; large?: boolean }) {
  if (large) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "8px 0",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--ink-secondary)", flexShrink: 0 }}>{label}</span>
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "11px",
              padding: "2px 4px",
              flexShrink: 0,
            }}
          >
            Edit
          </button>
        </div>
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.55,
            color: value ? "var(--ink-primary)" : "var(--ink-tertiary)",
            backgroundColor: "var(--ground)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {value || "—"}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: multiline ? "flex-start" : "center",
        padding: "4px 0",
        borderBottom: "1px solid var(--rule)",
        gap: "var(--space-sm)",
      }}
    >
      <span style={{ fontSize: "13px", color: "var(--ink-secondary)", flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flex: 1, justifyContent: "flex-end" }}>
        <span style={{ fontSize: "13px", color: value ? "var(--ink-primary)" : "var(--ink-tertiary)", textAlign: "right" }}>
          {value || "—"}
        </span>
        <button
          onClick={onEdit}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: "11px",
            padding: "2px 4px",
            flexShrink: 0,
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function WorkStreamCard({
  ws,
  ballGroups,
  units,
  onUpdateName,
  onUpdateDeveloper,
  onUpdateBall,
  onUpdateStage,
  onReorderStage,
  onDeleteStage,
  onAddStage,
  onBump,
  onOpenBumps,
}: {
  ws: WorkStreamWithStages;
  ballGroups: string[];
  units: UnitInvolved[];
  onUpdateName: (name: string) => void;
  onUpdateDeveloper: (developer: string | null) => void;
  onUpdateBall: (ball: string) => void;
  onUpdateStage: (stageId: number, data: Record<string, string | number | null>) => void;
  onReorderStage: (stageId: number, direction: "up" | "down") => void;
  onDeleteStage: (stageId: number) => void;
  onAddStage: () => void;
  onBump: () => void;
  onOpenBumps: () => void;
}) {
  const health = computeHealth(ws.currentStage);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(ws.name ?? "");
  const [nameHovered, setNameHovered] = useState(false);
  const [renamingStage, setRenamingStage] = useState<number | null>(null);
  const [stageNameValue, setStageNameValue] = useState("");

  const sortedStages = [...ws.flowStages].sort((a, b) => a.orderIdx - b.orderIdx);
  const latestBump = ws.latestBump ?? null;
  const bumpMsg = latestBump?.note || null;
  const lastBumped = latestBump ? (latestBump.bumpDate ? new Date(latestBump.bumpDate) : new Date(latestBump.changedAt)) : null;

  const developers = units
    .filter((u) => u.group.toLowerCase() === "developers")
    .map((u) => u.name);

  const namesForGroup = (group: string) =>
    units
      .filter((u) => u.group.toLowerCase() === group.toLowerCase())
      .map((u) => u.name);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== ws.name) onUpdateName(trimmed);
    setEditingName(false);
  };

  const commitStageName = (stageId: number) => {
    const trimmed = stageNameValue.trim();
    if (trimmed) onUpdateStage(stageId, { name: trimmed });
    setRenamingStage(null);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        marginBottom: "var(--space-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
              style={{
                padding: "4px 8px",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-md)",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                outline: "none",
              }}
            />
          ) : (
            <span
              onMouseEnter={() => setNameHovered(true)}
              onMouseLeave={() => setNameHovered(false)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", cursor: "default" }}
            >
              <span style={{ fontWeight: 600, fontSize: "14px" }}>{ws.name || "Work Stream"}</span>
              <button
                onClick={() => { setEditingName(true); setNameValue(ws.name ?? ""); }}
                title="Edit work stream name"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "0",
                  lineHeight: 1,
                  opacity: nameHovered ? 1 : 0,
                  transition: "opacity 0.15s",
                }}
              >
                ✎
              </button>
            </span>
          )}
          <HealthBadge health={health} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={ws.currentBall}
            onChange={(e) => onUpdateBall(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
              outline: "none",
              backgroundColor: "var(--surface)",
            }}
          >
            {ballGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button
            onClick={onAddStage}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
            }}
          >
            + Stage
          </button>
          <button
            onClick={onBump}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
            }}
          >
            + Bump
          </button>
        </div>
      </div>

      <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginBottom: "var(--space-sm)", display: "flex", alignItems: "center", gap: "6px" }}>
        Developer:
        <select
          value={ws.assignedDeveloper ?? ""}
          onChange={(e) => onUpdateDeveloper(e.target.value || null)}
          style={{
            padding: "2px 6px",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontFamily: "var(--font-sans)",
            outline: "none",
            backgroundColor: "var(--surface)",
            color: ws.assignedDeveloper ? "var(--ink-primary)" : "var(--ink-tertiary)",
          }}
        >
          <option value="">Unassigned</option>
          {developers.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              {["⇅", "Stage", "Planned", "Actual", "Δ", "Responsible", "Bump Msg", "Last Bumped"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 8px",
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
            {sortedStages.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                  No stages yet
                </td>
              </tr>
            ) : (
              sortedStages.map((stage, idx) => (
                <tr key={stage.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td style={{ padding: "4px 6px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    <button
                      onClick={() => onReorderStage(stage.id, "up")}
                      disabled={idx === 0}
                      title="Move up"
                      style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "var(--ink-tertiary)" : "var(--accent)", fontSize: "11px", padding: "0 2px", opacity: idx === 0 ? 0.4 : 1 }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onReorderStage(stage.id, "down")}
                      disabled={idx === sortedStages.length - 1}
                      title="Move down"
                      style={{ background: "none", border: "none", cursor: idx === sortedStages.length - 1 ? "default" : "pointer", color: idx === sortedStages.length - 1 ? "var(--ink-tertiary)" : "var(--accent)", fontSize: "11px", padding: "0 2px", opacity: idx === sortedStages.length - 1 ? 0.4 : 1 }}
                    >
                      ▼
                    </button>
                  </td>
                  <td style={{ padding: "6px 8px", fontWeight: stage.actualDate ? 600 : 400 }}>
                    {renamingStage === stage.id ? (
                      <input
                        autoFocus
                        value={stageNameValue}
                        onChange={(e) => setStageNameValue(e.target.value)}
                        onBlur={() => commitStageName(stage.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitStageName(stage.id); if (e.key === "Escape") setRenamingStage(null); }}
                        style={{
                          padding: "2px 6px",
                          border: "1px solid var(--accent)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontFamily: "var(--font-sans)",
                          outline: "none",
                          width: "160px",
                        }}
                      />
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {stage.name}
                        <button
                          onClick={() => { setRenamingStage(stage.id); setStageNameValue(stage.name); }}
                          title="Rename"
                          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "10px", padding: "0" }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => onDeleteStage(stage.id)}
                          title="Delete stage"
                          style={{ background: "none", border: "none", color: "var(--health-atrisk-ink)", cursor: "pointer", fontSize: "11px", padding: "0" }}
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                    <DatePicker
                      value={stage.plannedDate ? new Date(stage.plannedDate).toISOString().split("T")[0] : ""}
                      onChange={(d) => onUpdateStage(stage.id, { plannedDate: d || null })}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                    <DatePicker
                      value={stage.actualDate ? new Date(stage.actualDate).toISOString().split("T")[0] : ""}
                      onChange={(d) => onUpdateStage(stage.id, { actualDate: d || null })}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                    {stage.delayAdvanceDays === null || stage.delayAdvanceDays === 0 ? (
                      <span style={{ color: "var(--ink-tertiary)" }}>—</span>
                    ) : stage.delayAdvanceDays > 0 ? (
                      <span style={{ color: "var(--health-atrisk-ink)", fontWeight: 700 }} title={`Delayed by ${stage.delayAdvanceDays}d`}>
                        +{stage.delayAdvanceDays}
                      </span>
                    ) : (
                      <span style={{ color: "var(--health-ontime-ink)", fontWeight: 700 }} title={`Advanced by ${Math.abs(stage.delayAdvanceDays)}d`}>
                        −{Math.abs(stage.delayAdvanceDays)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <select
                        value={stage.responsibleGroup ?? ""}
                        onChange={(e) => onUpdateStage(stage.id, { responsibleGroup: e.target.value || null, responsiblePerson: null })}
                        title="Responsible group"
                        style={{
                          padding: "2px 4px",
                          border: "1px solid var(--rule)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontFamily: "var(--font-sans)",
                          outline: "none",
                          backgroundColor: "var(--surface)",
                          maxWidth: "96px",
                        }}
                      >
                        <option value="">—</option>
                        {ballGroups.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <select
                        value={stage.responsiblePerson ?? ""}
                        onChange={(e) => onUpdateStage(stage.id, { responsiblePerson: e.target.value || null })}
                        disabled={!stage.responsibleGroup}
                        title="Responsible person"
                        style={{
                          padding: "2px 4px",
                          border: "1px solid var(--rule)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontFamily: "var(--font-sans)",
                          outline: "none",
                          backgroundColor: "var(--surface)",
                          opacity: stage.responsibleGroup ? 1 : 0.5,
                          maxWidth: "116px",
                        }}
                      >
                        <option value="">—</option>
                        {namesForGroup(stage.responsibleGroup ?? "").map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td style={{ padding: "6px 8px", color: "var(--ink-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bumpMsg || "—"}
                  </td>
                  <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                    {lastBumped ? (
                      <button
                        onClick={onOpenBumps}
                        title="View all bumps"
                        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", padding: "0", fontFamily: "var(--font-sans)" }}
                      >
                        {lastBumped.toLocaleDateString()}
                      </button>
                    ) : "—"}
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