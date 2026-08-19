"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import DatePicker from "@/components/DatePicker";
import { buildWorkStreamWithDerived } from "@/lib/feature";
import { formatDuration } from "@/lib/duration";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { UnitInvolved, WorkStreamWithStages } from "@/lib/types";

const FALLBACK_BALL_GROUPS = ["PMO", "Developers", "System Owner"];

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalDateTimeInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface BumpModalProps {
  open: boolean;
  projectId: number;
  workStreamIds: number[];
  onClose: () => void;
  onSaved: () => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ink-tertiary)",
      }}
    >
      {children}
    </label>
  );
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px",
    border: "none",
    borderRadius: 0,
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    backgroundColor: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#FFFFFF" : "var(--ink-secondary)",
    outline: "none",
  });

  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <button style={buttonStyle(value === true)} onClick={() => onChange(true)}>
        YES
      </button>
      <button style={buttonStyle(value === false)} onClick={() => onChange(false)}>
        NO
      </button>
    </div>
  );
}

export default function BumpModal({ open, projectId, workStreamIds, onClose, onSaved }: BumpModalProps) {
  const [ballGroups, setBallGroups] = useState<string[]>(FALLBACK_BALL_GROUPS);
  const [units, setUnits] = useState<UnitInvolved[]>([]);
  const [workStreams, setWorkStreams] = useState<WorkStreamWithStages[]>([]);

  const [selectedWsIds, setSelectedWsIds] = useState<number[]>([]);
  const [bumpDate, setBumpDate] = useState<string>(() => toLocalDateTimeInput(new Date()));
  const [bumpMsg, setBumpMsg] = useState("");
  const [taskDone, setTaskDone] = useState(false);
  const [ballGroup, setBallGroup] = useState<string>("");
  const [ballPerson, setBallPerson] = useState("");
  const [hasProgress, setHasProgress] = useState(false);
  const [progressStageId, setProgressStageId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const workStreamIdsRef = useRef(workStreamIds);
  useEffect(() => {
    workStreamIdsRef.current = workStreamIds;
  }, [workStreamIds]);

  useEffect(() => {
    if (!open || projectId <= 0) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/project/${projectId}`).then((r) => r.json()),
      fetch("/api/config-value?category=ball_groups")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/unit-involved")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([data, ballData, unitData]) => {
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
        const streams = enriched.workStreams as WorkStreamWithStages[];
        setWorkStreams(streams);

        const groups = (ballData as { value: string }[])
          .map((c) => c.value)
          .filter((v) => v.trim());
        const resolvedGroups = groups.length ? groups : FALLBACK_BALL_GROUPS;
        setBallGroups(resolvedGroups);
        setUnits(unitData as UnitInvolved[]);

        const initial = (workStreamIdsRef.current as number[]).filter((id) =>
          streams.some((w) => w.id === id)
        );
        const selected = initial.length ? initial : streams[0] ? [streams[0].id] : [];
        setSelectedWsIds(selected);
        const active = streams.find((w) => w.id === selected[0]) ?? null;
        setBallGroup(active?.currentBall || resolvedGroups[0] || "PMO");
        setBallPerson("");
        setTaskDone(false);
        setHasProgress(false);
        setProgressStageId(null);
        setBumpDate(toLocalDateTimeInput(new Date()));
        setBumpMsg("");
        setSaving(false);
        setNowMs(Date.now());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const activeWs = workStreams.find((w) => w.id === selectedWsIds[0]) ?? null;
  const activeStageName = activeWs?.currentStage?.name ?? "Not Started";

  const pendingStages = activeWs
    ? [...activeWs.flowStages]
        .filter((s) => !s.actualDate)
        .sort((a, b) => a.orderIdx - b.orderIdx)
    : [];

  const stageNamesForGroup = (group: string) =>
    units
      .filter((u) => u.group.toLowerCase() === group.toLowerCase())
      .map((u) => u.name);

  const anchorDate = activeWs
    ? activeWs.latestBump
      ? new Date(
          (activeWs.latestBump.bumpDate as unknown as string) ||
            (activeWs.latestBump.changedAt as unknown as string)
        )
      : new Date(activeWs.createdAt as unknown as string)
    : null;
  const durationMs = anchorDate ? Math.max(0, nowMs - anchorDate.getTime()) : null;
  const durationLabel = formatDuration(durationMs);
  const anchorLabel = anchorDate ? anchorDate.toLocaleString() : "—";

  const toggleSelect = (wsId: number) => {
    setSelectedWsIds((prev) => {
      const included = prev.includes(wsId);
      const next = included ? prev.filter((id) => id !== wsId) : [...prev, wsId];
      if (next.length === 0) {
        setProgressStageId(null);
      } else {
        const newActive = workStreams.find((w) => w.id === next[0]);
        if (newActive && newActive.id !== activeWs?.id) {
          setProgressStageId(null);
          setBallGroup(newActive.currentBall || ballGroup || "PMO");
        }
      }
      return next;
    });
  };

  const canSelect = (ws: WorkStreamWithStages) =>
    !activeWs || (ws.currentStage?.name ?? "Not Started") === activeStageName;

  const logBump = async () => {
    if (!activeWs || !bumpMsg.trim() || saving) return;
    setSaving(true);
    const isoDate = new Date(bumpDate).toISOString();
    const holder = ballPerson ? `${ballGroup} - ${ballPerson}` : ballGroup;
    const chosenStageName =
      hasProgress && progressStageId
        ? (pendingStages.find((s) => s.id === progressStageId)?.name ?? null)
        : null;

    try {
      for (const ws of workStreams.filter((w) => selectedWsIds.includes(w.id))) {
        await fetch("/api/change-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workStreamId: ws.id,
            projectId,
            entryType: "bump",
            fieldName: ws.currentStage?.name ?? "Not Started",
            newValue: holder,
            note: bumpMsg,
            bumpDate: isoDate,
          }),
        });

        if (taskDone && ballGroup) {
          if (ballGroup !== ws.currentBall) {
            await fetch(`/api/work-stream/${ws.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentBall: ballGroup }),
            });
          }
          const curStage = ws.currentStage;
          if (curStage) {
            await fetch(`/api/flow-stage/${curStage.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                responsibleGroup: ballGroup,
                responsiblePerson: ballPerson || null,
              }),
            });
          }
        }

        if (chosenStageName) {
          const sorted = [...ws.flowStages].sort((a, b) => a.orderIdx - b.orderIdx);
          const completed = sorted.filter((s) => s.actualDate);
          const pending = sorted.filter((s) => !s.actualDate);
          const target = pending.find((s) => s.name === chosenStageName);
          if (target) {
            await fetch(`/api/flow-stage/${target.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ actualDate: isoDate, note: bumpMsg }),
            });
            const newPending = [target, ...pending.filter((s) => s.id !== target.id)];
            const newOrder = [...completed, ...newPending];
            const idxMap = new Map(newOrder.map((s, i) => [s.id, i]));
            await Promise.all(
              newOrder
                .filter((s) => s.orderIdx !== idxMap.get(s.id))
                .map((s) =>
                  fetch(`/api/flow-stage/${s.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderIdx: idxMap.get(s.id) }),
                  })
                )
            );
          }
        }
      }

      onSaved();
      onClose();
      playPing();
      showToast("Bump logged");
    } catch {
      showToast("Failed to save bump");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Bump">
      {workStreams.length === 0 ? (
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Label>Work Stream</Label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {workStreams.map((ws) => {
                const enabled = canSelect(ws);
                const checked = selectedWsIds.includes(ws.id);
                const stageName = ws.currentStage?.name ?? "Not Started";
                return (
                  <label
                    key={ws.id}
                    onClick={(e) => {
                      if (enabled) e.stopPropagation();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      padding: "6px 10px",
                      cursor: enabled ? "pointer" : "not-allowed",
                      opacity: enabled ? 1 : 0.45,
                      backgroundColor: checked ? "var(--accent-bg)" : "var(--surface)",
                      borderBottom: "1px solid var(--rule)",
                      fontSize: "13px",
                      fontFamily: "var(--font-sans)",
                    }}
                    title={enabled ? "" : "Work stream is on a different stage"}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!enabled}
                      onChange={() => toggleSelect(ws.id)}
                      style={{ cursor: enabled ? "pointer" : "not-allowed", accentColor: "var(--accent)" }}
                    />
                    <span style={{ fontWeight: 600, color: "var(--ink-primary)" }}>
                      {ws.name || `Work Stream ${ws.id}`}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--ink-tertiary)" }}>
                      {stageName}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
              CURRENT STAGE: <strong style={{ color: "var(--ink-primary)" }}>{activeStageName}</strong>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: "var(--rule)" }} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              backgroundColor: "var(--ground-metric)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-sm) var(--space-md)",
              fontSize: "13px",
            }}
          >
            <div>
              <span style={{ color: "var(--ink-tertiary)", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.08em" }}>
                Current Holder:{" "}
              </span>
              <span style={{ fontWeight: 600 }}>{activeWs?.currentBall || "—"}</span>
            </div>
            <div>
              <span style={{ color: "var(--ink-tertiary)", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.08em" }}>
                Current Task:{" "}
              </span>
              <span style={{ fontWeight: 600 }}>{activeStageName}</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
              This task has been ongoing for <strong>{durationLabel ?? "—"}</strong> since{" "}
              <strong>{anchorLabel}</strong>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: "var(--rule)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <Label>Current Task Done?</Label>
              <YesNoToggle value={taskDone} onChange={setTaskDone} />
            </div>
            {taskDone && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-sm)",
                }}
              >
                <Label>Pass The Ball To</Label>
                <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-tertiary)" }}>
                      Ball Group
                    </label>
                    <select
                      value={ballGroup}
                      onChange={(e) => {
                        setBallGroup(e.target.value);
                        setBallPerson("");
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
                      {ballGroups.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-tertiary)" }}>
                      Specific Person
                    </label>
                    <select
                      value={ballPerson}
                      onChange={(e) => setBallPerson(e.target.value)}
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
                      <option value="">—</option>
                      {stageNamesForGroup(ballGroup).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <Label>Has Project Progress?</Label>
              <YesNoToggle
                value={hasProgress}
                onChange={(v) => {
                  setHasProgress(v);
                  if (!v) setProgressStageId(null);
                }}
              />
            </div>
            {hasProgress && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-sm)",
                }}
              >
                <select
                  value={progressStageId ?? ""}
                  onChange={(e) => setProgressStageId(Number(e.target.value) || null)}
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
                  <option value="">Select succeeding stage...</option>
                  {pendingStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {pendingStages.length === 0 && (
                  <div style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                    No pending stages remain in this work stream.
                  </div>
                )}
                <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                  Work stream order will update so the chosen stage becomes next.
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, backgroundColor: "var(--rule)" }} />

          <DatePicker
            label="Bump Date & Time"
            value={bumpDate}
            onChange={setBumpDate}
            withTime
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Label>Bump Msg</Label>
            <textarea
              value={bumpMsg}
              onChange={(e) => setBumpMsg(e.target.value)}
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
              disabled={!bumpMsg.trim() || saving}
              style={{
                padding: "7px 12px",
                border: "none",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                cursor: bumpMsg.trim() && !saving ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                opacity: bumpMsg.trim() && !saving ? 1 : 0.5,
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