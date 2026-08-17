"use client";

import { useEffect, useState, useRef } from "react";
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";

interface ConfigItem {
  id: number;
  category: string;
  value: string;
  sortOrder: number;
}

export default function AdminPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("flow_template");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const fetched = useRef(false);

  const categories = [
    { key: "flow_template", label: "Default Flow Template" },
    { key: "priority", label: "Priority" },
    { key: "request_type", label: "Request Type" },
    { key: "initiated_by", label: "Initiated By" },
    { key: "ball_groups", label: "Ball Groups" },
  ];

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    let cancelled = false;
    fetch("/api/config-value")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setConfigs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = configs
    .filter((c) => c.category === activeCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const refetch = () => {
    fetch("/api/config-value")
      .then((r) => r.json())
      .then((data) => setConfigs(data));
  };

  const addItem = async () => {
    if (!newValue.trim()) return;
    await fetch("/api/config-value", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: activeCategory,
        value: newValue.trim(),
        sortOrder: filtered.length,
      }),
    });
    setNewValue("");
    refetch();
    playPing();
    showToast("Value added");
  };

  const updateItem = async (id: number) => {
    await fetch(`/api/config-value/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValue }),
    });
    setEditingId(null);
    refetch();
    playPing();
    showToast("Value updated");
  };

  const deleteItem = async (id: number) => {
    await fetch(`/api/config-value/${id}`, { method: "DELETE" });
    refetch();
    playPing();
    showToast("Value deleted");
  };

  const moveItem = async (id: number, direction: "up" | "down") => {
    const idx = filtered.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;

    const item = filtered[idx];
    const swap = filtered[swapIdx];

    await Promise.all([
      fetch(`/api/config-value/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swap.sortOrder }),
      }),
      fetch(`/api/config-value/${swap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }),
    ]);
    refetch();
  };

  return (
    <div style={{ padding: "var(--space-lg)", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 750, lineHeight: 1.1, marginBottom: "var(--space-md)" }}>
        Administration
      </h1>

      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-md)", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              padding: "6px 14px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: activeCategory === cat.key ? "var(--ink-primary)" : "var(--surface)",
              color: activeCategory === cat.key ? "var(--ink-on-dark)" : "var(--ink-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>Add New Value</div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            placeholder="Enter value..."
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
          <button
            onClick={addItem}
            disabled={!newValue.trim()}
            style={{
              padding: "7px 12px",
              border: "none",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent)",
              color: "#FFFFFF",
              cursor: newValue.trim() ? "pointer" : "not-allowed",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              opacity: newValue.trim() ? 1 : 0.5,
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
                {["#", "Value", "Actions"].map((h) => (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    No values configured
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: "var(--ink-tertiary)" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") updateItem(item.id); }}
                          style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none" }}
                          autoFocus
                        />
                      ) : (
                        item.value
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
                          <button onClick={() => moveItem(item.id, "up")} disabled={idx === 0} style={{ background: "none", border: "none", color: idx === 0 ? "var(--ink-tertiary)" : "var(--accent)", cursor: idx === 0 ? "default" : "pointer", fontSize: "12px", opacity: idx === 0 ? 0.5 : 1 }}>Up</button>
                          <button onClick={() => moveItem(item.id, "down")} disabled={idx === filtered.length - 1} style={{ background: "none", border: "none", color: idx === filtered.length - 1 ? "var(--ink-tertiary)" : "var(--accent)", cursor: idx === filtered.length - 1 ? "default" : "pointer", fontSize: "12px", opacity: idx === filtered.length - 1 ? 0.5 : 1 }}>Down</button>
                          <button onClick={() => { setEditingId(item.id); setEditValue(item.value); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                          <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "var(--health-atrisk-ink)", cursor: "pointer", fontSize: "12px" }}>Delete</button>
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
