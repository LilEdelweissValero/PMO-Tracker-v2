"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SystemSelection } from "@/lib/types";

interface SystemModuleRow {
  id: number;
  system: string;
  module: string | null;
}

interface SystemModulesFieldProps {
  value: SystemSelection[];
  onChange: (v: SystemSelection[]) => void;
}

export default function SystemModulesField({ value, onChange }: SystemModulesFieldProps) {
  const [entries, setEntries] = useState<SystemModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/directory-entry")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEntries((data as SystemModuleRow[]).filter((e) => e.system?.trim()));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const systems = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const e of entries) {
      if (!seen.has(e.system)) { seen.add(e.system); list.push(e.system); }
    }
    return list;
  }, [entries]);

  const modulesFor = (system: string) =>
    entries
      .filter((e) => e.system === system && e.module !== null && e.module!.trim() !== "")
      .map((e) => ({ id: e.id, label: e.module! }));

  const selectedSet = new Set(value.map((v) => v.system));

  const toggleSystem = (system: string) => {
    if (selectedSet.has(system)) {
      onChange(value.filter((v) => v.system !== system));
    } else {
      onChange([...value, { system, moduleEntryIds: [] }]);
    }
  };

  const toggleModule = (system: string, moduleId: number) => {
    const selection = value.find((v) => v.system === system);
    if (!selection) return;
    const has = selection.moduleEntryIds.includes(moduleId);
    onChange(
      value.map((v) =>
        v.system === system
          ? { ...v, moduleEntryIds: has ? v.moduleEntryIds.filter((id) => id !== moduleId) : [...v.moduleEntryIds, moduleId] }
          : v
      )
    );
  };

  const summary = value.length === 0
    ? "Select systems..."
    : value.map((v) => v.system).join(", ");

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 10px",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--surface)",
            color: value.length ? "var(--ink-primary)" : "var(--ink-tertiary)",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
            outline: "none",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {loading ? "Loading..." : summary}
          </span>
          <span style={{ color: "var(--ink-tertiary)", fontSize: "11px", flexShrink: 0 }}>▾</span>
        </button>
        {open && !loading && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: "var(--surface)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              maxHeight: 220,
              overflowY: "auto",
              zIndex: 50,
              padding: "4px",
            }}
          >
            {systems.length === 0 ? (
              <div style={{ padding: "6px 10px", fontSize: "13px", color: "var(--ink-tertiary)" }}>
                No systems in directory
              </div>
            ) : (
              systems.map((system) => {
                const selected = selectedSet.has(system);
                return (
                  <label
                    key={system}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "var(--font-sans)",
                      color: "var(--ink-primary)",
                      backgroundColor: selected ? "var(--accent-bg)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSystem(system)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ flex: 1 }}>{system}</span>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>

      {value.map((selection) => {
        const modules = modulesFor(selection.system);
        return (
          <div key={selection.system} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>
              Modules for {selection.system} — optional
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: 180, overflowY: "auto" }}>
              {modules.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>No modules — 1 work stream for the system.</div>
              ) : (
                modules.map((m) => {
                  const checked = selection.moduleEntryIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-sm)",
                        padding: "6px 8px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid",
                        borderColor: checked ? "var(--accent)" : "var(--rule)",
                        backgroundColor: checked ? "var(--accent-bg)" : "var(--surface)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontFamily: "var(--font-sans)",
                        color: "var(--ink-primary)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(selection.system, m.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <span>{m.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
