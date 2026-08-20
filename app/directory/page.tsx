"use client";

import { useEffect, useState } from "react";
import ComboField, { inputStyle } from "@/components/ComboField";
import SortableTh from "@/components/SortableTh";
import SaveOrderBar from "@/components/SaveOrderBar";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import { useColumnSort, type SortAccessor, type SortState } from "@/lib/useColumnSort";
import type { SystemModuleEntry, UnitInvolved } from "@/lib/types";

interface DepartmentItem {
  id: number;
  name: string;
  details: string | null;
}

interface SortableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

const entryColumns: SortableColumn[] = [
  { key: "system", label: "System" },
  { key: "acronym", label: "Acronym" },
  { key: "module", label: "Module" },
  { key: "developerAssigned", label: "Developer Assigned" },
  { key: "systemOwnerName", label: "System Owner (Name)" },
  { key: "systemOwnerDept", label: "System Owner (Department)" },
  { key: "actions", label: "Actions", sortable: false },
];

const deptColumns: SortableColumn[] = [
  { key: "name", label: "Name" },
  { key: "details", label: "Details" },
  { key: "actions", label: "Actions", sortable: false },
];

const unitColumns: SortableColumn[] = [
  { key: "group", label: "Group" },
  { key: "name", label: "Name" },
  { key: "actions", label: "Actions", sortable: false },
];

const entryAccessors: Record<string, SortAccessor<SystemModuleEntry>> = {
  system: (e) => e.system,
  acronym: (e) => e.acronym,
  module: (e) => e.module,
  developerAssigned: (e) => e.developerAssigned,
  systemOwnerName: (e) => e.systemOwnerName,
  systemOwnerDept: (e) => e.systemOwnerDept,
};

const deptAccessors: Record<string, SortAccessor<DepartmentItem>> = {
  name: (d) => d.name,
  details: (d) => d.details,
};

const unitAccessors: Record<string, SortAccessor<UnitInvolved>> = {
  group: (u) => u.group,
  name: (u) => u.name,
};

const FALLBACK_BALL_GROUPS = ["Project Management Office", "Developers", "Business Unit"];

const DEVELOPER_SOURCE = { url: "/api/unit-involved?group=Developers", valueKey: "name" };
const OWNER_SOURCE = { url: `/api/unit-involved?group=${encodeURIComponent("Business Unit")}`, valueKey: "name" };

export default function DirectoryPage() {
  const [tab, setTab] = useState<"systems" | "departments" | "units">("systems");
  const [entries, setEntries] = useState<SystemModuleEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [units, setUnits] = useState<UnitInvolved[]>([]);
  const [unitGroups, setUnitGroups] = useState<string[]>(FALLBACK_BALL_GROUPS);
  const [loading, setLoading] = useState(true);
  const [entriesVersion, setEntriesVersion] = useState(0);

  const [newSystem, setNewSystem] = useState("");
  const [newAcronym, setNewAcronym] = useState("");
  const [newModule, setNewModule] = useState("");
  const [newDeveloper, setNewDeveloper] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerDept, setNewOwnerDept] = useState("");

  const [newName, setNewName] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSystem, setEditSystem] = useState("");
  const [editAcronym, setEditAcronym] = useState("");
  const [editModule, setEditModule] = useState("");
  const [editDeveloper, setEditDeveloper] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerDept, setEditOwnerDept] = useState("");
  const [editName, setEditName] = useState("");
  const [editDetails, setEditDetails] = useState("");

  const [newUnitGroup, setNewUnitGroup] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editUnitGroup, setEditUnitGroup] = useState("");
  const [editUnitName, setEditUnitName] = useState("");
  const [groupAcronymMap, setGroupAcronymMap] = useState<Map<string, string>>(new Map());

  const fetchAll = async () => {
    const [entryRes, deptRes, unitRes, configRes] = await Promise.all([
      fetch("/api/directory-entry"),
      fetch("/api/directory-department"),
      fetch("/api/unit-involved"),
      fetch("/api/config-value?category=ball_groups"),
    ]);
    if (entryRes.ok) {
      setEntries(await entryRes.json());
      setEntriesVersion((v) => v + 1);
    }
    if (deptRes.ok) setDepartments(await deptRes.json());
    if (unitRes.ok) setUnits(await unitRes.json());
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
      fetch("/api/directory-department").then((r) => r.json()),
      fetch("/api/unit-involved").then((r) => r.json()),
      fetch("/api/config-value?category=ball_groups")
        .then((r) => r.json())
        .catch(() => [] as { value: string; acronym?: string | null }[]),
    ])
      .then(([e, d, u, config]) => {
        if (!cancelled) {
          setEntries(e);
          setDepartments(d);
          setUnits(u);
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

  const entriesSort = useColumnSort(entries, entryAccessors, "directory-entry", () => {
    fetchAll();
    playPing();
    showToast("Order saved");
  });
  const deptsSort = useColumnSort(departments, deptAccessors, "directory-department", () => {
    fetchAll();
    playPing();
    showToast("Order saved");
  });
  const unitsSort = useColumnSort(units, unitAccessors, "unit-involved", () => {
    fetchAll();
    playPing();
    showToast("Order saved");
  });

  const addEntry = async () => {
    if (!newSystem.trim()) return;
    const res = await fetch("/api/directory-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: newSystem.trim(),
        acronym: newAcronym.trim() || null,
        module: newModule.trim() || null,
        developerAssigned: newDeveloper.trim() || null,
        systemOwnerName: newOwnerName.trim() || null,
        systemOwnerDept: newOwnerDept.trim() || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to add entry");
      return;
    }
    setNewSystem("");
    setNewAcronym("");
    setNewModule("");
    setNewDeveloper("");
    setNewOwnerName("");
    setNewOwnerDept("");
    fetchAll();
    playPing();
    showToast("Entry added");
  };

  const updateEntry = async (id: number) => {
    const res = await fetch(`/api/directory-entry/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: editSystem,
        acronym: editAcronym || null,
        module: editModule || null,
        developerAssigned: editDeveloper || null,
        systemOwnerName: editOwnerName || null,
        systemOwnerDept: editOwnerDept || null,
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

  const addDepartment = async () => {
    if (!newName.trim()) return;
    await fetch("/api/directory-department", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), details: newDetails.trim() || null }),
    });
    setNewName("");
    setNewDetails("");
    fetchAll();
    playPing();
    showToast("Entry added");
  };

  const updateDepartment = async (id: number) => {
    await fetch(`/api/directory-department/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, details: editDetails || null }),
    });
    setEditingId(null);
    fetchAll();
    playPing();
    showToast("Entry updated");
  };

  const deleteDepartment = async (id: number) => {
    await fetch(`/api/directory-department/${id}`, { method: "DELETE" });
    fetchAll();
    playPing();
    showToast("Entry deleted");
  };

  const addUnit = async () => {
    const group = (newUnitGroup || unitGroups[0] || "").trim();
    const name = newUnitName.trim();
    if (!group || !name) return;
    const res = await fetch("/api/unit-involved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to add entry");
      return;
    }
    setNewUnitName("");
    setNewUnitGroup("");
    fetchAll();
    playPing();
    showToast("Entry added");
  };

  const updateUnit = async (id: number) => {
    const res = await fetch(`/api/unit-involved/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: editUnitGroup, name: editUnitName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(body?.error ?? "Failed to update entry");
      return;
    }
    setEditingUnitId(null);
    fetchAll();
    playPing();
    showToast("Entry updated");
  };

  const deleteUnit = async (id: number) => {
    await fetch(`/api/unit-involved/${id}`, { method: "DELETE" });
    fetchAll();
    playPing();
    showToast("Entry deleted");
  };

  const renderTableHeader = (cols: SortableColumn[], sortState: SortState | null, onToggle: (key: string) => void) => (
    <tr>
      {cols.map((col) => (
        <SortableTh
          key={col.key}
          label={col.label}
          sort={sortState}
          sortKey={col.sortable === false ? undefined : col.key}
          onSort={col.sortable === false ? undefined : onToggle}
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
          { key: "systems", label: "Systems" },
          { key: "departments", label: "Departments" },
          { key: "units", label: "Units Involved" },
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

      {tab === "systems" ? (
        <>
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
            <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New</div>
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "flex-end" }}>
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
              <div style={{ flex: "1 1 110px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Acronym</span>
                <input type="text" value={newAcronym} onChange={(e) => setNewAcronym(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
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
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>System Owner (Dept)</span>
                <input type="text" value={newOwnerDept} onChange={(e) => setNewOwnerDept(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
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
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              {entriesSort.sort ? (
                <div style={{ padding: "var(--space-sm) var(--space-md)" }}>
                  <SaveOrderBar saving={entriesSort.saving} error={entriesSort.saveError} onSave={entriesSort.saveOrder} />
                </div>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  {renderTableHeader(entryColumns, entriesSort.sort, entriesSort.toggleSort)}
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
                        <td style={{ padding: "8px 10px" }}>
                          {editingId === entry.id ? (
                            <input type="text" value={editSystem} onChange={(e) => setEditSystem(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }} />
                          ) : (
                            entry.system
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                          {editingId === entry.id ? (
                            <input type="text" value={editAcronym} onChange={(e) => setEditAcronym(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%" }} />
                          ) : (
                            entry.acronym || "—"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {editingId === entry.id ? (
                            <input type="text" value={editModule} onChange={(e) => setEditModule(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }} />
                          ) : (
                            entry.module || "—"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                          {editingId === entry.id ? (
                            <div style={{ minWidth: "120px" }}>
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
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                          {editingId === entry.id ? (
                            <div style={{ minWidth: "140px" }}>
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
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                          {editingId === entry.id ? (
                            <input type="text" value={editOwnerDept} onChange={(e) => setEditOwnerDept(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%" }} />
                          ) : (
                            entry.systemOwnerDept || "—"
                          )}
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
                                onClick={() => { setEditingId(entry.id); setEditSystem(entry.system); setEditAcronym(entry.acronym ?? ""); setEditModule(entry.module ?? ""); setEditDeveloper(entry.developerAssigned ?? ""); setEditOwnerName(entry.systemOwnerName ?? ""); setEditOwnerDept(entry.systemOwnerDept ?? ""); }}
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
      ) : tab === "departments" ? (
        <>
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
            <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New</div>
            <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end" }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", fontFamily: "var(--font-sans)", outline: "none" }}
              />
              <input
                type="text"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="Details (optional)"
                style={{ flex: 2, padding: "6px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", fontFamily: "var(--font-sans)", outline: "none" }}
              />
              <button
                onClick={addDepartment}
                disabled={!newName.trim()}
                style={{
                  padding: "7px 12px",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent)",
                  color: "#FFFFFF",
                  cursor: newName.trim() ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  opacity: newName.trim() ? 1 : 0.5,
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
              {deptsSort.sort ? (
                <div style={{ padding: "var(--space-sm) var(--space-md)" }}>
                  <SaveOrderBar saving={deptsSort.saving} error={deptsSort.saveError} onSave={deptsSort.saveOrder} />
                </div>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  {renderTableHeader(deptColumns, deptsSort.sort, deptsSort.toggleSort)}
                </thead>
                <tbody>
                  {deptsSort.sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                        No items
                      </td>
                    </tr>
                  ) : (
                    deptsSort.sortedRows.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                        <td style={{ padding: "8px 10px" }}>
                          {editingId === item.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }}
                            />
                          ) : (
                            item.name
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                          {editingId === item.id ? (
                            <input
                              type="text"
                              value={editDetails ?? ""}
                              onChange={(e) => setEditDetails(e.target.value)}
                              style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%" }}
                            />
                          ) : (
                            item.details || "—"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {editingId === item.id ? (
                            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                              <button onClick={() => updateDepartment(item.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Save</button>
                              <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", color: "var(--ink-tertiary)", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                              <button
                                onClick={() => { setEditingId(item.id); setEditName(item.name); setEditDetails(item.details ?? ""); }}
                                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteDepartment(item.id)}
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
      ) : (
        <>
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
            <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New</div>
            <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Group</span>
                <select
                  value={newUnitGroup || unitGroups[0] || ""}
                  onChange={(e) => setNewUnitGroup(e.target.value)}
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
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addUnit(); }}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={addUnit}
                disabled={!newUnitName.trim()}
                style={{
                  padding: "7px 12px",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent)",
                  color: "#FFFFFF",
                  cursor: newUnitName.trim() ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  opacity: newUnitName.trim() ? 1 : 0.5,
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
              {unitsSort.sort ? (
                <div style={{ padding: "var(--space-sm) var(--space-md)" }}>
                  <SaveOrderBar saving={unitsSort.saving} error={unitsSort.saveError} onSave={unitsSort.saveOrder} />
                </div>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  {renderTableHeader(unitColumns, unitsSort.sort, unitsSort.toggleSort)}
                </thead>
                <tbody>
                  {unitsSort.sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                        No items
                      </td>
                    </tr>
                  ) : (
                    unitsSort.sortedRows.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                        <td style={{ padding: "8px 10px" }}>
                          {editingUnitId === item.id ? (
                            <select
                              value={editUnitGroup || unitGroups[0] || ""}
                              onChange={(e) => setEditUnitGroup(e.target.value)}
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
                          {editingUnitId === item.id ? (
                            <input
                              type="text"
                              value={editUnitName}
                              onChange={(e) => setEditUnitName(e.target.value)}
                              style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }}
                            />
                          ) : (
                            item.name
                          )}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {editingUnitId === item.id ? (
                            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                              <button onClick={() => updateUnit(item.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Save</button>
                              <button onClick={() => setEditingUnitId(null)} style={{ background: "none", border: "none", color: "var(--ink-tertiary)", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                              <button
                                onClick={() => { setEditingUnitId(item.id); setEditUnitGroup(item.group); setEditUnitName(item.name); }}
                                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteUnit(item.id)}
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