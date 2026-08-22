"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DetailHero from "@/components/DetailHero";
import DatePicker from "@/components/DatePicker";
import LinkEditor from "@/components/LinkEditor";
import Modal from "@/components/Modal";
import EntityFormModal from "@/components/EntityFormModal";
import BumpModal from "@/components/BumpModal";
import SortableRow from "@/components/SortableRow";
import { computeProjectStatus, buildWorkStreamWithDerived, getStatusColorClass } from "@/lib/feature";
import type { TemplateStage } from "@/lib/feature";
import { useFlowTemplate } from "@/lib/useFlowTemplate";
import { playPing, playPrompt } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { ProjectWithWorkStreams, WorkStreamWithStages, ReferenceLink, ChangeLogEntry, FormValue } from "@/lib/types";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const [project, setProject] = useState<ProjectWithWorkStreams | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAddWorkStream, setShowAddWorkStream] = useState(false);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [systemsTableHovered, setSystemsTableHovered] = useState(false);
  const [ballGroupAcronymMap, setBallGroupAcronymMap] = useState<Map<string, string>>(new Map());
  const [bumpWsId, setBumpWsId] = useState<number | null>(null);
  const [bumpsWs, setBumpsWs] = useState<WorkStreamWithStages | null>(null);
  const [bumpsList, setBumpsList] = useState<ChangeLogEntry[] | null>(null);
  const [addStageWsId, setAddStageWsId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<{ value: string }[]>([]);
  const templateStages = useFlowTemplate();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config-value?category=ball_groups")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const configData = data as { value: string; acronym?: string | null }[];
          setBallGroupAcronymMap(new Map(configData.filter((c) => c.acronym).map((c) => [c.value, c.acronym!])));
        }
      })
      .catch(() => {});
    fetch("/api/config-value?category=project_status")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setProjectStatuses(data as { value: string }[]);
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
                  completionDate: s.completionDate ? new Date(s.completionDate as string) : null,
                })),
              } as Parameters<typeof buildWorkStreamWithDerived>[0], templateStages)
            ),
          };
          setProject(enriched);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, templateStages]);

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
                completionDate: s.completionDate ? new Date(s.completionDate as string) : null,
              })),
            } as Parameters<typeof buildWorkStreamWithDerived>[0], templateStages)
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

  const reorderStages = async (wsId: number, orderedIds: number[]) => {
    await Promise.all(
      orderedIds.map((id, idx) =>
        fetch(`/api/flow-stage/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIdx: idx }),
        })
      )
    );
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
    const { ballHolder, initialTask, ...rest } = data;
    const res = await fetch("/api/work-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...rest,
        projectId,
        responsiblePerson: ballHolder || null,
        task: initialTask || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to add work stream (${res.status})`);
    }
    refetch();
    playPing();
    showToast("Work stream added");
  };

  const removeSystem = async (systemEntryId: number) => {
    const newIds = systems.filter((s) => s.id !== systemEntryId).map((s) => s.id);
    await updateProject({ systemEntryIds: newIds });
    showToast("System removed");
  };

  const addSystemAndWorkStream = async (systemEntryId: number) => {
    const entry = await fetch(`/api/directory-entry`).then((r) => r.json()).then((data) =>
      (data as { id: number; system: string; module: string | null }[]).find((e) => e.id === systemEntryId)
    );
    if (!entry) return;
    const newIds = [...systems.map((s) => s.id), systemEntryId];
    await updateProject({ systemEntryIds: newIds });
    const wsName = entry.module ? `${entry.system} - ${entry.module}` : entry.system;
    await fetch("/api/work-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wsName, projectId }),
    });
    refetch();
    playPing();
    showToast("System and work stream added");
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
  const statusColors = getStatusColorClass(status, projectStatuses);
  const refs: ReferenceLink[] = Array.isArray(project.references) ? project.references : [];

  const metaFields = [
    { label: "PM Officer", value: project.pmOfficer },
    { label: "Request Type", value: project.requestType },
    { label: "Project Owner", value: project.projectOwner },
  ];

  const systems = Array.isArray(project.systems) ? project.systems : [];
  const acronyms = systems.map((s) => ({ label: s.acronym || s.system, color: s.color }));

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
          <FieldRow label="Project Owner" value={project.projectOwner} onEdit={() => { playPrompt(); setEditingField("projectOwner"); }} />
          <div style={{ marginTop: "var(--space-sm)" }}>
            <div className="label-caps" style={{ marginBottom: "4px", color: "var(--ink-tertiary)" }}>References</div>
            <LinkEditor
              value={refs}
              onChange={(links) => updateProject({ references: links })}
            />
          </div>
        </Section>

        <Section title="System Affected">
          <div
            onMouseEnter={() => setSystemsTableHovered(true)}
            onMouseLeave={() => setSystemsTableHovered(false)}
            style={{ border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", overflow: "hidden" }}
          >
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
                  <th style={{ width: "32px", backgroundColor: "var(--ground-metric)", borderBottom: "1px solid var(--rule-strong)" }} />
                </tr>
              </thead>
              <tbody>
                {systems.length === 0 && !systemsTableHovered ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                      No chosen system yet.
                    </td>
                  </tr>
                ) : (
                  <>
                    {systems.map((sys) => (
                      <SystemRow key={sys.id} sys={sys} onRemove={removeSystem} />
                    ))}
                    {systemsTableHovered && (
                      <tr
                        onClick={() => { playPrompt(); setShowAddSystem(true); }}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                      >
                        <td colSpan={6} style={{ padding: "8px 10px", color: "var(--accent)", fontWeight: 500, fontSize: "12px" }}>
                          + Add affected system
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
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
            ballGroupAcronymMap={ballGroupAcronymMap}
            templateStages={templateStages}
            projectStatuses={projectStatuses}
            onUpdateName={(name) => updateWorkStream(ws.id, { name })}

            onUpdateStage={(stageId, data) => updateStage(stageId, data)}
            onReorderStages={(orderedIds) => reorderStages(ws.id, orderedIds)}
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
      <div
        style={{ overflowX: "auto" }}
      >
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
          { key: "currentBall", label: "Initial Ball Group", type: "combo", configCategory: "ball_groups", required: true, strict: true },
          { key: "ballHolder", label: "Initial Ball Holder", type: "combo", source: { url: "/api/directory-personnel", valueKey: "name" }, filterBy: "currentBall", sourceFilterKey: "group", strict: true },
          { key: "initialTask", label: "Initial Task" },
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
        key={showAddSystem ? "add-sys-open" : "add-sys-closed"}
        open={showAddSystem}
        onClose={() => setShowAddSystem(false)}
        title="Add Affected System"
        fields={[
          { key: "systemEntryId", label: "Select System", type: "multisource", source: { url: "/api/directory-entry", valueKey: "id", labelKey: "system", moduleKey: "module" } },
        ]}
        initialData={{ systemEntryId: [] }}
        onSubmit={async (data) => {
          const ids = (data.systemEntryId as number[]) ?? [];
          if (ids.length > 0) {
            await addSystemAndWorkStream(ids[0]);
          }
          setShowAddSystem(false);
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
  priority: { type: "combo", configCategory: "priority", strict: true },
  scopeDescription: { type: "textarea" },
  initiatedBy: { type: "combo", configCategory: "initiated_by", strict: true },
  projectOwner: { type: "combo", source: { url: "/api/directory-personnel", valueKey: "name" } },
  requestType: { type: "combo", configCategory: "request_type", strict: true },
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
  projectOwner: "Project Owner",
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
  const [hovered, setHovered] = useState(false);

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
        <span style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>{label}</span>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
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
          <button
            onClick={onEdit}
            title="Edit"
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "13px",
              padding: "2px 4px",
              lineHeight: 1,
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.15s",
            }}
          >
            ✎
          </button>
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
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flex: 1, justifyContent: "flex-end", position: "relative" }}
      >
        <span style={{ fontSize: "13px", color: value ? "var(--ink-primary)" : "var(--ink-tertiary)", textAlign: "right" }}>
          {value || "—"}
        </span>
        <button
          onClick={onEdit}
          title="Edit"
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: "13px",
            padding: "2px 4px",
            flexShrink: 0,
            lineHeight: 1,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
          }}
        >
          ✎
        </button>
      </div>
    </div>
  );
}

function WorkStreamCard({
  ws,
  ballGroupAcronymMap,
  templateStages,
  projectStatuses,
  onUpdateName,

  onUpdateStage,
  onReorderStages,
  onDeleteStage,
  onAddStage,
  onBump,
  onOpenBumps,
}: {
  ws: WorkStreamWithStages;
  ballGroupAcronymMap: Map<string, string>;
  templateStages: TemplateStage[];
  projectStatuses: { value: string }[];
  onUpdateName: (name: string) => void;

  onUpdateStage: (stageId: number, data: Record<string, string | number | null>) => void;
  onReorderStages: (orderedIds: number[]) => void;
  onDeleteStage: (stageId: number) => void;
  onAddStage: () => void;
  onBump: () => void;
  onOpenBumps: () => void;
}) {
  const stageStatus = templateStages.find((t) => t.name === ws.currentStage?.name)?.status ?? "";
  const stageColors = getStatusColorClass(stageStatus, projectStatuses);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(ws.name ?? "");
  const [nameHovered, setNameHovered] = useState(false);
  const [renamingStage, setRenamingStage] = useState<number | null>(null);
  const [stageNameValue, setStageNameValue] = useState("");
  const [stagesTableHovered, setStagesTableHovered] = useState(false);

  const sortedStages = [...ws.flowStages].sort((a, b) => a.orderIdx - b.orderIdx);
  const latestBump = ws.latestBump ?? null;
  const lastBumped = latestBump ? (latestBump.bumpDate ? new Date(latestBump.bumpDate) : new Date(latestBump.changedAt)) : null;

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== ws.name) onUpdateName(trimmed);
    setEditingName(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleStageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedStages.findIndex((s) => String(s.id) === active.id);
    const newIndex = sortedStages.findIndex((s) => String(s.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortedStages, oldIndex, newIndex);
    onReorderStages(reordered.map((s) => s.id));
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
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 7px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: stageColors.bg,
              color: stageColors.ink,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: stageColors.ink,
                flexShrink: 0,
              }}
            />
            {stageStatus || "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center", flexWrap: "wrap" }}>
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


      <div
        style={{ overflowX: "auto" }}
        onMouseEnter={() => setStagesTableHovered(true)}
        onMouseLeave={() => setStagesTableHovered(false)}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={{ width: "20px", backgroundColor: "var(--ground-metric)", borderBottom: "1px solid var(--rule-strong)" }} />
              {["Stage", "Planned", "Completion", "Δ", "Responsible", "Current Task", "Last Bumped"].map((h) => (
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStageDragEnd}>
                <SortableContext items={sortedStages.map((s) => String(s.id))} strategy={verticalListSortingStrategy}>
                  {sortedStages.map((stage) => {
                    const isCurrentStageRow = ws.currentStage?.id === stage.id;
                    const showBump = isCurrentStageRow && lastBumped;
                    return (
                    <SortableRow key={stage.id} id={String(stage.id)}>
                      <td style={{ padding: "6px 8px", fontWeight: stage.completionDate ? 600 : 400 }}>
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
                      value={stage.completionDate ? new Date(stage.completionDate).toISOString().split("T")[0] : ""}
                      onChange={(d) => onUpdateStage(stage.id, { completionDate: d || null })}
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
                      {stage.responsibleGroup && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "12px",
                            fontFamily: "var(--font-sans)",
                            backgroundColor: "var(--ground-metric)",
                            color: "var(--ink-primary)",
                            maxWidth: "96px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={stage.responsibleGroup}
                        >
                          {ballGroupAcronymMap.get(stage.responsibleGroup) || stage.responsibleGroup}
                        </span>
                      )}
                      {stage.responsiblePerson && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "12px",
                            fontFamily: "var(--font-sans)",
                            backgroundColor: "var(--surface)",
                            color: "var(--ink-primary)",
                            border: "1px solid var(--rule)",
                            maxWidth: "116px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={stage.responsiblePerson}
                        >
                          {stage.responsiblePerson}
                        </span>
                      )}
                      {!stage.responsibleGroup && !stage.responsiblePerson && (
                        <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "6px 8px", color: "var(--ink-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ws.task || "—"}
                  </td>
                  <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                    {showBump && lastBumped ? (
                      <button
                        onClick={onOpenBumps}
                        title="View all bumps"
                        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", padding: "0", fontFamily: "var(--font-sans)" }}
                      >
                        {lastBumped.toLocaleDateString()} {lastBumped.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </button>
                    ) : "—"}
                  </td>
                    </SortableRow>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
            {stagesTableHovered && (
              <tr
                onClick={() => { playPrompt(); onAddStage(); }}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
              >
                <td colSpan={8} style={{ padding: "8px 10px", color: "var(--accent)", fontWeight: 500, fontSize: "12px" }}>
                  + Add Stage
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemRow({ sys, onRemove }: { sys: { id: number; system: string; module: string | null; systemOwnerName: string | null; systemOwnerDept: string | null; developerAssigned: string | null }; onRemove: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      style={{ borderBottom: "1px solid var(--rule)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: "8px 10px", fontWeight: 500 }}>{sys.system}</td>
      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.module || "—"}</td>
      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.systemOwnerName || "—"}</td>
      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.systemOwnerDept || "—"}</td>
      <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>{sys.developerAssigned || "—"}</td>
      <td style={{ padding: "8px 4px", textAlign: "center" }}>
        {hovered && (
          <button
            onClick={() => onRemove(sys.id)}
            title="Remove system"
            style={{
              background: "none",
              border: "none",
              color: "var(--health-atrisk-ink)",
              cursor: "pointer",
              fontSize: "14px",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </td>
    </tr>
  );
}