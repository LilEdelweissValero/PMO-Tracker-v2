"use client";

import { useEffect, useState } from "react";
import ComboField, { inputStyle } from "@/components/ComboField";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import type { SystemModuleEntry } from "@/lib/types";

interface DepartmentItem {
  id: number;
  name: string;
  details: string | null;
}

const columns = ["System", "Acronym", "Module", "Developer Assigned", "System Owner (Name)", "System Owner (Department)", "Actions"];

export default function DirectoryPage() {
  const [tab, setTab] = useState<"systems" | "departments">("systems");
  const [entries, setEntries] = useState<SystemModuleEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
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

  const fetchAll = async () => {
    const [entryRes, deptRes] = await Promise.all([
      fetch("/api/directory-entry"),
      fetch("/api/directory-department"),
    ]);
    if (entryRes.ok) {
      setEntries(await entryRes.json());
      setEntriesVersion((v) => v + 1);
    }
    if (deptRes.ok) setDepartments(await deptRes.json());
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/directory-entry").then((r) => r.json()),
      fetch("/api/directory-department").then((r) => r.json()),
    ])
      .then(([e, d]) => {
        if (!cancelled) {
          setEntries(e);
          setDepartments(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Directory
      </h1>

      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
        {(["systems", "departments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "6px 14px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: tab === t ? "var(--ink-primary)" : "var(--surface)",
              color: tab === t ? "var(--ink-on-dark)" : "var(--ink-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              textTransform: "capitalize",
            }}
          >
            {t}
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
                  value={newModule}
                  onChange={setNewModule}
                />
              </div>
              <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>Developer Assigned</span>
                <input type="text" value={newDeveloper} onChange={(e) => setNewDeveloper(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="label-caps" style={{ color: "var(--ink-tertiary)" }}>System Owner (Name)</span>
                <input type="text" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
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
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    {columns.map((h) => (
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
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                        No entries
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
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
                            <input type="text" value={editDeveloper} onChange={(e) => setEditDeveloper(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%" }} />
                          ) : (
                            entry.developerAssigned || "—"
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                          {editingId === entry.id ? (
                            <input type="text" value={editOwnerName} onChange={(e) => setEditOwnerName(e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "100%" }} />
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
      ) : (
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
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    {["Name", "Details", "Actions"].map((h) => (
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
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                        No items
                      </td>
                    </tr>
                  ) : (
                    departments.map((item) => (
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
      )}
    </div>
  );
}