"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DetailHero from "@/components/DetailHero";
import HealthBadge from "@/components/HealthBadge";
import DatePicker from "@/components/DatePicker";
import LinkEditor from "@/components/LinkEditor";
import Modal from "@/components/Modal";
import EntityFormModal from "@/components/EntityFormModal";
import { computeAggregateStatus, computeHealth, buildWorkStreamWithDerived, getStatusColorClass } from "@/lib/feature";
import { playPing, playPrompt } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { ProjectWithWorkStreams, WorkStreamWithStages, ReferenceLink } from "@/lib/types";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const [project, setProject] = useState<ProjectWithWorkStreams | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showBumpModal, setShowBumpModal] = useState<number | null>(null);
  const [bumpNote, setBumpNote] = useState("");
  const [showAddWorkStream, setShowAddWorkStream] = useState(false);

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

  const updateProject = async (data: Record<string, string | number | ReferenceLink[]>) => {
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

  const updateWorkStream = async (wsId: number, data: Record<string, string | number>) => {
    await fetch(`/api/work-stream/${wsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refetch();
    playPing();
    showToast("Work stream updated");
  };

  const logStage = async (stageId: number, actualDate: string) => {
    await fetch(`/api/flow-stage/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualDate: actualDate || null }),
    });
    refetch();
    playPing();
    showToast("Stage logged");
  };

  const logBump = async (wsId: number) => {
    await fetch("/api/change-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workStreamId: wsId,
        projectId,
        entryType: "bump",
        note: bumpNote,
      }),
    });
    setBumpNote("");
    setShowBumpModal(null);
    refetch();
    playPing();
    showToast("Bump logged");
  };

  const addWorkStream = async (data: Record<string, string | number>) => {
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

  const status = computeAggregateStatus(project.workStreams);
  const statusColors = getStatusColorClass(status);
  const refs: ReferenceLink[] = Array.isArray(project.references) ? project.references : [];

  const metaFields = [
    { label: "Priority", value: project.priority },
    { label: "PM Officer", value: project.pmOfficer },
    { label: "Request Type", value: project.requestType },
    { label: "Initiated By", value: project.initiatedBy },
    { label: "System", value: project.systemName },
    { label: "Signoff", value: project.signoffStatus === "signed_off" ? "Signed Off" : "Not Signed Off" },
  ];

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <DetailHero
        kicker="Project"
        title={project.name}
        meta={metaFields}
        accentColor={statusColors.bg}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)", marginTop: "var(--space-lg)" }}>
        <Section title="Project Info">
          <FieldRow label="Name" value={project.name} onEdit={() => { playPrompt(); setEditingField("name"); }} />
          <FieldRow label="Priority" value={project.priority} onEdit={() => { playPrompt(); setEditingField("priority"); }} />
          <FieldRow label="Scope" value={project.scopeDescription} onEdit={() => { playPrompt(); setEditingField("scopeDescription"); }} multiline />
          <div style={{ marginTop: "var(--space-sm)" }}>
            <div className="label-caps" style={{ marginBottom: "4px", color: "var(--ink-tertiary)" }}>References</div>
            <LinkEditor
              value={refs}
              onChange={(links) => updateProject({ references: links })}
            />
          </div>
        </Section>

        <Section title="Initiated By">
          <FieldRow label="Initiated By" value={project.initiatedBy} onEdit={() => { playPrompt(); setEditingField("initiatedBy"); }} />
          <FieldRow label="Requested By" value={project.requestedByName} onEdit={() => { playPrompt(); setEditingField("requestedByName"); }} />
          <FieldRow label="Department" value={project.requestedByDept} onEdit={() => { playPrompt(); setEditingField("requestedByDept"); }} />
        </Section>

        <Section title="System Info">
          <FieldRow label="System" value={project.systemName} onEdit={() => { playPrompt(); setEditingField("systemName"); }} />
          <FieldRow label="Module" value={project.specificModule} onEdit={() => { playPrompt(); setEditingField("specificModule"); }} />
          <FieldRow label="Owner" value={project.systemOwnerName} onEdit={() => { playPrompt(); setEditingField("systemOwnerName"); }} />
          <FieldRow label="Owner Dept" value={project.systemOwnerDept} onEdit={() => { playPrompt(); setEditingField("systemOwnerDept"); }} />
          <FieldRow label="Request Type" value={project.requestType} onEdit={() => { playPrompt(); setEditingField("requestType"); }} />
        </Section>

        <Section title="Assignment">
          <FieldRow label="PM Officer" value={project.pmOfficer} onEdit={() => { playPrompt(); setEditingField("pmOfficer"); }} />
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
            onUpdate={(data) => updateWorkStream(ws.id, data)}
            onLogStage={logStage}
            onLogBump={() => { playPrompt(); setShowBumpModal(ws.id); }}
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
            onSubmit={(data) => { updateProject(data); setEditingField(null); }}
          />
        )}
      </Modal>

      <Modal open={showBumpModal !== null} onClose={() => setShowBumpModal(null)} title="Add Bump Note">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <textarea
            value={bumpNote}
            onChange={(e) => setBumpNote(e.target.value)}
            rows={3}
            placeholder="Enter a note..."
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
            <button
              onClick={() => setShowBumpModal(null)}
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
              onClick={() => showBumpModal && logBump(showBumpModal)}
              disabled={!bumpNote.trim()}
              style={{
                padding: "7px 12px",
                border: "none",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                opacity: bumpNote.trim() ? 1 : 0.5,
              }}
            >
              Save Bump
            </button>
          </div>
        </div>
      </Modal>

      <EntityFormModal
        key={showAddWorkStream ? "ws-open" : "ws-closed"}
        open={showAddWorkStream}
        onClose={() => setShowAddWorkStream(false)}
        title="Add Work Stream"
        fields={[
          { key: "name", label: "Work Stream Name" },
          { key: "assignedDeveloper", label: "Assigned Developer" },
        ]}
        onSubmit={addWorkStream}
      />
    </div>
  );
}

const FIELD_TYPE_MAP: Record<string, { type: string; configCategory?: string; source?: { url: string; valueKey: string }; strict?: boolean; filterBy?: string }> = {
  projectId: { type: "text" },
  name: { type: "text" },
  priority: { type: "combo", configCategory: "priority" },
  scopeDescription: { type: "textarea" },
  initiatedBy: { type: "combo", configCategory: "initiated_by" },
  requestedByName: { type: "combo", configCategory: "requested_by_name" },
  requestedByDept: { type: "combo", configCategory: "requested_by_dept" },
  requestType: { type: "combo", configCategory: "request_type" },
  pmOfficer: { type: "combo", configCategory: "pm_officer" },
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
  requestedByName: "Requested By Name",
  requestedByDept: "Requested By Dept",
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

function FieldRow({ label, value, onEdit, multiline }: { label: string; value: string | null; onEdit: () => void; multiline?: boolean }) {
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
  onUpdate,
  onLogStage,
  onLogBump,
}: {
  ws: WorkStreamWithStages;
  onUpdate: (data: Record<string, string | number>) => void;
  onLogStage: (stageId: number, date: string) => void;
  onLogBump: () => void;
}) {
  const health = computeHealth(ws.currentStage);

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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>{ws.name || "Work Stream"}</span>
          <HealthBadge health={health} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <select
            value={ws.currentBall}
            onChange={(e) => onUpdate({ currentBall: e.target.value })}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          >
            <option value="PMO">PMO</option>
            <option value="Developers">Developers</option>
            <option value="System Owner">System Owner</option>
          </select>
          <button
            onClick={onLogBump}
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

      <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginBottom: "var(--space-sm)" }}>
        Developer: {ws.assignedDeveloper || "Unassigned"}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              {["Stage", "Planned", "Actual", "Delay/Advance", "Responsible"].map((h) => (
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
            {ws.flowStages.map((stage) => (
              <tr key={stage.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                <td style={{ padding: "6px 8px", fontWeight: stage.actualDate ? 600 : 400 }}>
                  {stage.name}
                </td>
                <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                  <DatePicker
                    value={stage.plannedDate ? new Date(stage.plannedDate).toISOString().split("T")[0] : ""}
                    onChange={() => onLogStage(stage.id, stage.actualDate ? new Date(stage.actualDate).toISOString().split("T")[0] : "")}
                  />
                </td>
                <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                  <DatePicker
                    value={stage.actualDate ? new Date(stage.actualDate).toISOString().split("T")[0] : ""}
                    onChange={(d) => onLogStage(stage.id, d)}
                  />
                </td>
                <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>
                  {stage.delayAdvanceDays !== null ? (
                    <span style={{ color: stage.delayAdvanceDays > 0 ? "var(--health-atrisk-ink)" : "var(--health-ontime-ink)" }}>
                      {stage.delayAdvanceDays > 0 ? `+${stage.delayAdvanceDays}d` : `${stage.delayAdvanceDays}d`}
                    </span>
                  ) : "—"}
                </td>
                <td style={{ padding: "6px 8px", color: "var(--ink-secondary)" }}>
                  {stage.responsiblePerson || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
