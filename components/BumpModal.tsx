"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import DatePicker from "@/components/DatePicker";
import { buildWorkStreamWithDerived } from "@/lib/feature";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { WorkStreamWithStages } from "@/lib/types";

const FALLBACK_BALL_GROUPS = ["PMO", "Developers", "System Owner"];

interface BumpForm {
  ws: WorkStreamWithStages;
  bumpDate: string;
  bumpMsg: string;
  ballHolder: string;
  progressChecked: boolean;
  actualDate: string;
}

interface BumpModalProps {
  open: boolean;
  projectId: number;
  workStreamId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function BumpModal({ open, projectId, workStreamId, onClose, onSaved }: BumpModalProps) {
  const [ballGroups, setBallGroups] = useState<string[]>(FALLBACK_BALL_GROUPS);
  const [workStreams, setWorkStreams] = useState<WorkStreamWithStages[]>([]);
  const [form, setForm] = useState<BumpForm | null>(null);

  useEffect(() => {
    fetch("/api/config-value?category=ball_groups")
      .then((r) => r.json())
      .then((data) => {
        const groups = (data as { value: string }[])
          .map((c) => c.value)
          .filter((v) => v.trim());
        if (groups.length) setBallGroups(groups);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open || projectId <= 0) return;
    let cancelled = false;
    fetch(`/api/project/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
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
        setWorkStreams(enriched.workStreams as WorkStreamWithStages[]);
        const targetWs =
          enriched.workStreams.find((w: { id: number }) => w.id === workStreamId) ??
          enriched.workStreams[0];
        if (targetWs) {
          const today = new Date().toISOString().split("T")[0];
          setForm({
            ws: targetWs,
            bumpDate: today,
            bumpMsg: "",
            ballHolder: targetWs.currentBall,
            progressChecked: false,
            actualDate: today,
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, projectId, workStreamId]);

  const logBump = async () => {
    if (!form) return;
    const { ws, bumpDate, bumpMsg, ballHolder, progressChecked, actualDate } = form;
    const sorted = [...ws.flowStages].sort((a, b) => a.orderIdx - b.orderIdx);
    const nextStage = sorted.find((s) => !s.actualDate) ?? null;
    const progressedStage = progressChecked && nextStage ? nextStage : null;
    const stageName = progressedStage?.name ?? ws.currentStage?.name ?? "Not Started";

    await fetch("/api/change-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workStreamId: ws.id,
        projectId,
        entryType: "bump",
        fieldName: stageName,
        newValue: ballHolder,
        note: bumpMsg,
        bumpDate,
      }),
    });

    if (progressedStage && actualDate) {
      await fetch(`/api/flow-stage/${progressedStage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualDate, note: bumpMsg }),
      });
    }

    if (ballHolder !== ws.currentBall) {
      await fetch(`/api/work-stream/${ws.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentBall: ballHolder }),
      });
    }

    setForm(null);
    onSaved();
    playPing();
    showToast("Bump logged");
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Bump">
      {!form ? (
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-tertiary)",
              }}
            >
              Work Stream
            </label>
            <select
              value={form.ws.id}
              onChange={(e) => {
                const ws = workStreams.find((w) => w.id === Number(e.target.value));
                if (ws) setForm({ ...form, ws, ballHolder: ws.currentBall });
              }}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                outline: "none",
                backgroundColor: "var(--surface)",
                color: "var(--ink-primary)",
              }}
            >
              {workStreams.map((w) => (
                <option key={w.id} value={w.id}>{w.name || `Work Stream ${w.id}`}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "var(--space-md)" }}>
            <DatePicker
              label="Bump Date"
              value={form.bumpDate}
              onChange={(d) => setForm({ ...form, bumpDate: d })}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-tertiary)",
              }}
            >
              Bump Msg
            </label>
            <textarea
              value={form.bumpMsg}
              onChange={(e) => setForm({ ...form, bumpMsg: e.target.value })}
              rows={3}
              placeholder="Enter bump message..."
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
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-tertiary)",
              }}
            >
              Ball Holder
            </label>
            <select
              value={form.ballHolder}
              onChange={(e) => setForm({ ...form, ballHolder: e.target.value })}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                outline: "none",
                backgroundColor: "var(--surface)",
                color: "var(--ink-primary)",
              }}
            >
              {ballGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "13px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.progressChecked}
              onChange={(e) => setForm({ ...form, progressChecked: e.target.checked })}
              style={{ cursor: "pointer" }}
            />
            Progress to next stage
          </label>
          {form.progressChecked && (
            <DatePicker
              label="Actual Date"
              value={form.actualDate}
              onChange={(d) => setForm({ ...form, actualDate: d })}
            />
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
            <button
              onClick={onClose}
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
              onClick={logBump}
              disabled={!form.bumpMsg.trim()}
              style={{
                padding: "7px 12px",
                border: "none",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                cursor: form.bumpMsg.trim() ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                opacity: form.bumpMsg.trim() ? 1 : 0.5,
              }}
            >
              Save Bump
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}