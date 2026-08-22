"use client";

import { useEffect, useMemo, useState } from "react";
import ComboField, { inputStyle } from "@/components/ComboField";
import SortableTh from "@/components/SortableTh";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import { useColumnSort, type SortAccessor, type SortState } from "@/lib/useColumnSort";
import type { SystemModuleEntry, DirectoryPersonnel } from "@/lib/types";

interface SortableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

const personnelColumns: SortableColumn[] = [
  { key: "group", label: "Group" },
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "projectsInvolved", label: "Projects Involved", sortable: false },
  { key: "actions", label: "Actions", sortable: false },
];

const entryColumns: SortableColumn[] = [
  { key: "acronym", label: "Acronym" },
  { key: "system", label: "System" },
  { key: "module", label: "Module" },
  { key: "developerAssigned", label: "Developer Assigned" },
  { key: "systemOwnerName", label: "System Owner (Name)" },
  { key: "systemOwnerDept", label: "System Owner (Dept)", sortable: false },
  { key: "actions", label: "Actions", sortable: false },
];

const personnelAccessors: Record<string, SortAccessor<DirectoryPersonnel>> = {
  group: (p) => p.group,
  name: (p) => p.name,
  department: (p) => p.department,
};

const entryAccessors: Record<string, SortAccessor<SystemModuleEntry>> = {
  system: (e) => e.system,
  acronym: (e) => e.acronym,
  module: (e) => e.module,
  developerAssigned: (e) => e.developerAssigned,
  systemOwnerName: (e) => e.systemOwnerName,
};

const FALLBACK_BALL_GROUPS = ["Project Management Office", "Developers", "Business Unit"];

const DEVELOPER_SOURCE = { url: "/api/directory-personnel?group=Developers", valueKey: "name" };
const OWNER_SOURCE = { url: `/api/directory-personnel?group=${encodeURIComponent("Business Unit")}`, valueKey: "name" };

function isLightHex(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

interface ProjectInvolvement {
  open: number;
  closed: number;
}

export default function DirectoryPage() {
  const [tab, setTab] = useState<"personnel" | "systems">("personnel");
  const [entries, setEntries] = useState<SystemModuleEntry[]>([]);
  const [personnel, setPersonnel] = useState<DirectoryPersonnel[]>([]);
  const [unitGroups, setUnitGroups] = useState<string[]>(FALLBACK_BALL_GROUPS);
  const [loading, setLoading] = useState(true);
  const [entriesVersion, setEntriesVersion] = useState(0);

  const [newSystem, setNewSystem] = useState("");
  const [newAcronym, setNewAcronym] = useState("");
  const [newColor, setNewColor] = useState("#000000");
  const [newModule, setNewModule] = useState("");
  const [newDeveloper, setNewDeveloper] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [, setNewOwnerDept] = useState("");
  const [newLink, setNewLink] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSystem, setEditSystem] = useState("");
  const [editAcronym, setEditAcronym] = useState("");
  const [editColor, setEditColor] = useState("#000000");
  const [editModule, setEditModule] = useState("");
  const [editDeveloper, setEditDeveloper] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [, setEditOwnerDept] = useState("");
  const [editLink, setEditLink] = useState("");

  const [newPersonGroup, setNewPersonGroup] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonDept, setNewPersonDept] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [editPersonGroup, setEditPersonGroup] = useState("");
  const [editPersonName, setEditPersonName] = useState("");
  const [editPersonDept, setEditPersonDept] = useState("");
  const [groupAcronymMap, setGroupAcronymMap] = useState<Map<string, string>>(new Map());

  const fetchAll = async () => {
    const [entryRes, personRes, configRes] = await Promise.all([
      fetch("/api/directory-entry"),
      fetch("/api/directory-personnel"),
      fetch("/api/config-value?category=ball_groups"),
    ]);
    if (entryRes.ok) {
      setEntries(await entryRes.json());
      setEntriesVersion((v) => v + 1);
    }
    if (personRes.ok) setPersonnel(await personRes.json());
    if (configRes.ok) {
      const configData = await configRes.json() as { value: string; acronym?: string | null }[];
      const groups = configData.map((c) => c.value).filter((v) => v.trim());
      if (groups.length) setUnitGroups(groups);
      setGroupAcronymMap(new Map(configData.filter((c) => c.acronym).map((c) => [c.value, c.acronym!])));
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/directory-entry").then((r) => r.json()),
      fetch("/api/directory-personnel").then((r) => r.json()),
      fetch("/api/config-value?category=ball_groups")
        .then((r) => r.json())
        .catch(() => [] as { value: string; acronym?: string | null }[]),
    ])
      .then(([e, p, config]) => {
        if (!cancelled) {
          setEntries(e);
          setPersonnel(p);
          const groups = (config as { value: string; acronym?: string | null }[])
            .map((c) => c.value)
            .filter((v) => v.trim());
          if (groups.length) setUnitGroups(groups);
          setGroupAcronymMap(new Map((config as { value: string; acronym?: string | null }[]).filter((c) => c.acronym).map((c) => [c.value, c.acronym!])));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const [allProjects, setAllProjects] = useState<{ signoffStatus: string; systemOwnerName: string | null; projectOwner: string | null; workStreams: { assignedDeveloper: string | null }[] }[]>([]);

  useEffect(() => {
    if (tab !== "personnel") return;
    let cancelled = false;
    fetch("/api/project")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAllProjects(data as typeof allProjects);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tab]);

  const projectInvolvement = useMemo(() => {
    const map = new Map<string, ProjectInvolvement>();
    for (const proj of allProjects) {
      const names = new Set<string>();
      if (proj.systemOwnerName) names.add(proj.systemOwnerName);
      if (proj.projectOwner) names.add(proj.projectOwner);
      for (const ws of proj.workStreams) {
        if (ws.assignedDeveloper) names.add(ws.assignedDeveloper);
      }
      const isOpen = proj.signoffStatus !== "signed_off";
      for (const name of names) {
        const existing = map.get(name) ?? { open: 0, closed: 0 };
        if (isOpen) existing.open++;
        else existing.closed++;
        map.set(name, existing);
      }
    }
    return map;
  }, [allProjects]);

  const personnelSort = useColumnSort(personnel, personnelAccessors, "directory-personnel", () => {
    fetchAll();
    playPing();
    showToast("Order saved");
  });
  const entriesSort = useColumnSort(entries, entryAccessors, "directory-entry", () => {
    fetchAll();
    playPing();
    showToast("Order saved");
  });

  const addEntry = async () => {
    if (!newSystem.trim()) return;
    const derivedDept = newOwnerName
      ? (personnel.find((p) => p.name === newOwnerName && p.group === "Business Unit")?.department ?? "")
      : "";
    const res = await fetch("/api/directory-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: newSystem.trim(),
        acronym: newAcronym.trim() || null,
        color: newColor.trim() || "#000000",
        link: newLink.trim() || null,
        module: newModule.trim() || null,
        developerAssigned: newDeveloper.trim() || null,
        systemOwnerName: newOwnerName.trim() || null,
        systemOwnerDept: derivedDept || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to add entry");
      return;
    }
    setNewSystem("");
    setNewAcronym("");
    setNewColor("#000000");
    setNewModule("");
    setNewDeveloper("");
    setNewOwnerName("");
    setNewOwnerDept("");
    setNewLink("");
    fetchAll();
    playPing();
    showToast("Entry added");
  };

  const updateEntry = async (id: number) => {
    const derivedDept = editOwnerName
      ? (personnel.find((p) => p.name === editOwnerName && p.group === "Business Unit")?.department ?? "")
      : "";
    const res = await fetch(`/api/directory-entry/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: editSystem,
        acronym: editAcronym || null,
        color: editColor || "#000000",
        link: editLink || null,
        module: editModule || null,
        developerAssigned: editDeveloper || null,
        systemOwnerName: editOwnerName || null,
        systemOwnerDept: derivedDept || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to update entry");
      return;
    }
    setEditingId(null);
    fetchAll();
    playPing();
    showToast("Entry updated");
  };

  const deleteEntry = async (id: number) => {
    await fetch(`/api/directory-entry/${id}`, { method: "DELETE" });
    fetchAll();
    playPing();
    showToast("Entry deleted");
  };

  const addPerson = async () => {
    const group = (newPersonGroup || unitGroups[0] || "").trim();
    const name = newPersonName.trim();
    const department = newPersonDept.trim();
    if (!group || !name || !department) return;
    const res = await fetch("/api/directory-personnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, name, department }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to add entry");
      return;
    }
    setNewPersonName("");
    setNewPersonGroup("");
    setNewPersonDept("");
    fetchAll();
    playPing();
    showToast("Entry added");
  };

  const updatePerson = async (id: number) => {
    const department = editPersonDept.trim();
    if (!department) {
      showToast("Department is required");
      return;
    }
    const res = await fetch(`/api/directory-personnel/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: editPersonGroup, name: editPersonName, department }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to update entry");
      return;
    }
    setEditingPersonId(null);
    fetchAll();
    playPing();
    showToast("Entry updated");
  };

  const deletePerson = async (id: number) => {
    await fetch(`/api/directory-personnel/${id}`, { method: "DELETE" });
    fetchAll();
    playPing();
    showToast("Entry deleted");
  };

  const renderTableHeader = (cols: SortableColumn[], sortState: SortState | null, onToggle: (key: string) => void, saving?: boolean, onSave?: () => void) => (
    <tr>
      {cols.map((col) => (
        <SortableTh
          key={col.key}
          label={col.label}
          sort={sortState}
          sortKey={col.sortable === false ? undefined : col.key}
          onSort={col.sortable === false ? undefined : onToggle}
          action={sortState?.key === col.key && onSave ? (
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
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
              {saving ? "..." : "SAVE"}
            </button>
          ) : undefined}
          style={{
            backgroundColor: "var(--ground-metric)",
            borderBottom: "1px solid var(--rule-strong)",
          }}
        />
      ))}
    </tr>
  );

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Directory
      </h1>

      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
        {([
          { key: "personnel", label: "Personnel" },
          { key: "systems", label: "Systems" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 14px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: tab === t.key ? "var(--ink-primary)" : "var(--surface)",
              color: tab === t.key ? "var(--ink-on-dark)" : "var(--ink-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              textTransform: "capitalize",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "personnel" ? (
        <>
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
            <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New</div>
            <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Group</span>
                <select
                  value={newPersonGroup || unitGroups[0] || ""}
                  onChange={(e) => setNewPersonGroup(e.target.value)}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                >
                  {unitGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Name *</span>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPerson(); }}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Department *</span>
                <input
                  type="text"
                  value={newPersonDept}
                  onChange={(e) => setNewPersonDept(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPerson(); }}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={addPerson}
                disabled={!newPersonName.trim() || !newPersonDept.trim()}
                style={{
                  padding: "7px 12px",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent)",
                  color: "#FFFFFF",
                  cursor: newPersonName.trim() && newPersonDept.trim() ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  opacity: newPersonName.trim() && newPersonDept.trim() ? 1 : 0.5,
                }}
              >
                Add
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading...</div>
          ) : (
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  {renderTableHeader(personnelColumns, personnelSort.sort, personnelSort.toggleSort, personnelSort.saving, personnelSort.saveOrder)}
                </thead>
                <tbody>
                  {personnelSort.sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={personnelColumns.length} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                        No items
                      </td>
                    </tr>
                  ) : (
                    personnelSort.sortedRows.map((item) => {
                      const involvement = projectInvolvement.get(item.name);
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                          <td style={{ padding: "8px 10px" }}>
                            {editingPersonId === item.id ? (
                              <select
                                value={editPersonGroup || unitGroups[0] || ""}
                                onChange={(e) => setEditPersonGroup(e.target.value)}
                                style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }}
                              >
                                {unitGroups.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            ) : (
                              <span title={item.group}>{groupAcronymMap.get(item.group) || item.group}</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {editingPersonId === item.id ? (
                              <input
                                type="text"
                                value={editPersonName}
                                onChange={(e) => setEditPersonName(e.target.value)}
                                style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }}
                              />
                            ) : (
                              item.name
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                            {editingPersonId === item.id ? (
                              <input
                                type="text"
                                value={editPersonDept ?? ""}
                                onChange={(e) => setEditPersonDept(e.target.value)}
                                style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%" }}
                              />
                            ) : item.department ? (
                              item.department
                            ) : (
                              <span style={{ color: "var(--health-atrisk-ink)", fontSize: "11px", fontWeight: 600 }}>REQUIRED</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", fontSize: "12px" }}>
                            {involvement ? (
                              <span>
                                OPEN: {involvement.open}, CLOSED: {involvement.closed}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {editingPersonId === item.id ? (
                              <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                                <button onClick={() => updatePerson(item.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Save</button>
                                <button onClick={() => setEditingPersonId(null)} style={{ background: "none", border: "none", color: "var(--ink-tertiary)", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                                <button
                                  onClick={() => { setEditingPersonId(item.id); setEditPersonGroup(item.group); setEditPersonName(item.name); setEditPersonDept(item.department ?? ""); }}
                                  style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deletePerson(item.id)}
                                  style={{ background: "none", border: "none", color: "var(--health-atrisk-ink)", cursor: "pointer", fontSize: "12px" }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
            <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New</div>
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 110px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Acronym</span>
                <input type="text" value={newAcronym} onChange={(e) => setNewAcronym(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "0 0 60px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Color</span>
                <input type="color" value={newColor || "#000000"} onChange={(e) => setNewColor(e.target.value)} style={{ width: "100%", height: "32px", padding: "2px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", cursor: "pointer", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "1 1 170px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>System *</span>
                <ComboField
                  key={`sys-${entriesVersion}`}
                  source={{ url: "/api/directory-entry", valueKey: "system" }}
                  label="System"
                  value={newSystem}
                  onChange={setNewSystem}
                />
              </div>
              <div style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Module</span>
                <ComboField
                  key={`mod-${entriesVersion}`}
                  source={{ url: "/api/directory-entry", valueKey: "module" }}
                  label="Module"
                  value={newModule}
                  onChange={setNewModule}
                />
              </div>
              <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Developer Assigned</span>
                <ComboField
                  key={`dev-new-${entriesVersion}`}
                  source={DEVELOPER_SOURCE}
                  label="Developer"
                  value={newDeveloper}
                  onChange={setNewDeveloper}
                  strict
                />
              </div>
              <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>System Owner (Name)</span>
                <ComboField
                  key={`own-new-${entriesVersion}`}
                  source={OWNER_SOURCE}
                  label="Owner Name"
                  value={newOwnerName}
                  onChange={setNewOwnerName}
                  strict
                />
              </div>
              <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Link</span>
                <input type="text" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="https://..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
              <button
                onClick={addEntry}
                disabled={!newSystem.trim()}
                style={{
                  padding: "7px 12px",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent)",
                  color: "#FFFFFF",
                  cursor: newSystem.trim() ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  opacity: newSystem.trim() ? 1 : 0.5,
                }}
              >
                Add
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading...</div>
          ) : (
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: editingId ? "visible" : "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "100px" }} />
                </colgroup>
                <thead>
                  {renderTableHeader(entryColumns, entriesSort.sort, entriesSort.toggleSort, entriesSort.saving, entriesSort.saveOrder)}
                </thead>
                <tbody>
                  {entriesSort.sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={entryColumns.length} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                        No entries
                      </td>
                    </tr>
                  ) : (
                    entriesSort.sortedRows.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                        <td style={{ padding: "8px 10px", overflow: "hidden" }}>
                          {editingId === entry.id ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input type="text" value={editAcronym} onChange={(e) => setEditAcronym(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "60px", boxSizing: "border-box" }} />
                              <input type="color" value={editColor || "#000000"} onChange={(e) => setEditColor(e.target.value)} style={{ width: "28px", height: "28px", padding: "1px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", cursor: "pointer", flexShrink: 0 }} />
                            </div>
                          ) : entry.acronym ? (
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: entry.color || "#000000",
                              color: isLightHex(entry.color || "#000000") ? "#000000" : "#FFFFFF",
                              fontSize: "12px",
                              fontWeight: 600,
                              fontFamily: "var(--font-sans)",
                              lineHeight: "18px",
                            }}>
                              {entry.acronym}
                            </span>
                          ) : (
                            <span style={{ color: "var(--ink-tertiary)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", overflow: "hidden" }}>
                          {editingId === entry.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <input type="text" value={editSystem} onChange={(e) => setEditSystem(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" }} />
                              <input type="text" value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://..." style={{ padding: "3px 6px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "11px", outline: "none", width: "100%", boxSizing: "border-box", color: "var(--ink-tertiary)" }} />
                            </div>
                          ) : entry.link ? (
                            <a
                              href={entry.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                            >
                              {entry.system} <span style={{ fontSize: "10px", opacity: 0.7 }}>↗</span>
                            </a>
                          ) : (
                            entry.system
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", overflow: "hidden" }}>
                          {editingId === entry.id ? (
                            <input type="text" value={editModule} onChange={(e) => setEditModule(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" }} />
                          ) : (
                            entry.module || "General"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", overflow: editingId === entry.id ? "visible" : "hidden" }}>
                          {editingId === entry.id ? (
                            <div style={{ width: "100%", boxSizing: "border-box", position: "relative" }}>
                              <ComboField
                                key={`dev-edit-${entry.id}`}
                                source={DEVELOPER_SOURCE}
                                label="Developer"
                                value={editDeveloper}
                                onChange={setEditDeveloper}
                                strict
                              />
                            </div>
                          ) : (
                            entry.developerAssigned || "—"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", overflow: editingId === entry.id ? "visible" : "hidden" }}>
                          {editingId === entry.id ? (
                            <div style={{ width: "100%", boxSizing: "border-box", position: "relative" }}>
                              <ComboField
                                key={`own-edit-${entry.id}`}
                                source={OWNER_SOURCE}
                                label="Owner Name"
                                value={editOwnerName}
                                onChange={setEditOwnerName}
                                strict
                              />
                            </div>
                          ) : (
                            entry.systemOwnerName || "—"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)", overflow: "hidden" }}>
                          {(() => {
                            const ownerDept = personnel.find((p) => p.name === entry.systemOwnerName && p.group === "Business Unit")?.department ?? entry.systemOwnerDept;
                            return ownerDept || "—";
                          })()}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {editingId === entry.id ? (
                            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                              <button onClick={() => updateEntry(entry.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Save</button>
                              <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", color: "var(--ink-tertiary)", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                              <button
                                onClick={() => { setEditingId(entry.id); setEditSystem(entry.system); setEditAcronym(entry.acronym ?? ""); setEditColor(entry.color ?? "#000000"); setEditModule(entry.module ?? ""); setEditDeveloper(entry.developerAssigned ?? ""); setEditOwnerName(entry.systemOwnerName ?? ""); setEditOwnerDept(entry.systemOwnerDept ?? ""); setEditLink(entry.link ?? ""); }}
                                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                style={{ background: "none", border: "none", color: "var(--health-atrisk-ink)", cursor: "pointer", fontSize: "12px" }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
