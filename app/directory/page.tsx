"use client";

import { useEffect, useState, useRef } from "react";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";

interface DirectoryItem {
  id: number;
  name: string;
  details: string | null;
}

export default function DirectoryPage() {
  const [tab, setTab] = useState<"systems" | "departments">("systems");
  const [systems, setSystems] = useState<DirectoryItem[]>([]);
  const [departments, setDepartments] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const fetched = useRef(false);

  const fetchAll = async () => {
    const [sysRes, deptRes] = await Promise.all([
      fetch("/api/directory-system"),
      fetch("/api/directory-department"),
    ]);
    if (sysRes.ok) setSystems(await sysRes.json());
    if (deptRes.ok) setDepartments(await deptRes.json());
    setLoading(false);
  };

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    let cancelled = false;
    Promise.all([
      fetch("/api/directory-system").then((r) => r.json()),
      fetch("/api/directory-department").then((r) => r.json()),
    ])
      .then(([sys, dept]) => {
        if (!cancelled) {
          setSystems(sys);
          setDepartments(dept);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const addItem = async () => {
    if (!newName.trim()) return;
    const url = tab === "systems" ? "/api/directory-system" : "/api/directory-department";
    await fetch(url, {
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

  const updateItem = async (id: number) => {
    const url = tab === "systems" ? `/api/directory-system/${id}` : `/api/directory-department/${id}`;
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, details: editDetails || null }),
    });
    setEditingId(null);
    fetchAll();
    playPing();
    showToast("Entry updated");
  };

  const deleteItem = async (id: number) => {
    const url = tab === "systems" ? `/api/directory-system/${id}` : `/api/directory-department/${id}`;
    await fetch(url, { method: "DELETE" });
    fetchAll();
    playPing();
    showToast("Entry deleted");
  };

  const items = tab === "systems" ? systems : departments;

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

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New</div>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end" }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <input
            type="text"
            value={newDetails}
            onChange={(e) => setNewDetails(e.target.value)}
            placeholder="Details (optional)"
            style={{
              flex: 2,
              padding: "6px 10px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            onClick={addItem}
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    No items
                  </td>
                </tr>
              ) : (
                items.map((item) => (
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
                          <button onClick={() => updateItem(item.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Save</button>
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
                            onClick={() => deleteItem(item.id)}
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
    </div>
  );
}
