"use client";

import { useEffect, useState, useRef } from "react";
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
import { playPing } from "@/lib/sound";
import { showToast } from "@/components/Toast";
import SortableRow from "@/components/SortableRow";
import SortableTh from "@/components/SortableTh";
import SaveOrderBar from "@/components/SaveOrderBar";
import { useColumnSort, type SortAccessor } from "@/lib/useColumnSort";

interface ConfigItem {
  id: number;
  category: string;
  value: string;
  acronym: string | null;
  color: string | null;
  status: string | null;
  sortOrder: number;
}

const adminColumns = [
  { key: "grip", label: "", sortable: false },
  { key: "index", label: "#", sortable: false },
  { key: "value", label: "Value" },
  { key: "actions", label: "Actions", sortable: false },
];

const adminAccessors: Record<string, SortAccessor<ConfigItem>> = {
  value: (c) => c.value,
  acronym: (c) => c.acronym ?? "",
};

export default function AdminPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("flow_template");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editAcronym, setEditAcronym] = useState("");
  const [newAcronym, setNewAcronym] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newColor, setNewColor] = useState("");
  const fetched = useRef(false);

  const categories = [
    { key: "flow_template", label: "Default Stage Template" },
    { key: "project_status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "request_type", label: "Request Type" },
    { key: "initiated_by", label: "Initiated By" },
    { key: "ball_groups", label: "Ball Groups" },
    { key: "requested_by_name", label: "Requested By Name" },
    { key: "requested_by_dept", label: "Requested By Dept" },
    { key: "pm_officer", label: "PM Officer" },
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

  const isStageTemplate = activeCategory === "flow_template";
  const isBallGroups = activeCategory === "ball_groups";
  const valueLabel = isStageTemplate ? "Stage" : "Value";
  const addLabel = isStageTemplate
    ? "Add New Stage"
    : activeCategory === "project_status"
      ? "Add New Status"
      : "Add New Value";
  const tableColumns: { key: string; label: string; sortable?: boolean }[] = [
    ...adminColumns.slice(0, 2),
    { key: "value", label: valueLabel },
    ...(isBallGroups ? [{ key: "acronym", label: "Acronym" }, { key: "color", label: "Color", sortable: false }] : []),
    ...(isStageTemplate ? [{ key: "status", label: "Project Status", sortable: false }] : []),
    { key: "actions", label: "Actions", sortable: false },
  ];
  const statusOptions = configs
    .filter((c) => c.category === "project_status")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const refetch = () => {
    fetch("/api/config-value")
      .then((r) => r.json())
      .then((data) => setConfigs(data));
  };

  const { sort, sortedRows, toggleSort, saveOrder, saving, saveError } = useColumnSort(
    filtered,
    adminAccessors,
    "config-value",
    () => {
      refetch();
      playPing();
      showToast("Order saved");
    }
  );

  const addItem = async () => {
    if (!newValue.trim()) return;
    await fetch("/api/config-value", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: activeCategory,
        value: newValue.trim(),
        acronym: isBallGroups ? newAcronym.trim() || null : null,
        color: isBallGroups ? newColor.trim() || null : null,
        sortOrder: filtered.length,
      }),
    });
    setNewValue("");
    setNewAcronym("");
    refetch();
    playPing();
    showToast("Value added");
  };

  const updateItem = async (id: number) => {
    await fetch(`/api/config-value/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValue, acronym: isBallGroups ? editAcronym.trim() || null : undefined, color: isBallGroups ? editColor.trim() || null : undefined }),
    });
    setEditingId(null);
    refetch();
    playPing();
    showToast("Value updated");
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/config-value/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status || null }),
    });
    refetch();
    playPing();
    showToast("Status updated");
  };

  const deleteItem = async (id: number) => {
    await fetch(`/api/config-value/${id}`, { method: "DELETE" });
    refetch();
    playPing();
    showToast("Value deleted");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((c) => String(c.id) === active.id);
    const newIndex = filtered.findIndex((c) => String(c.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filtered, oldIndex, newIndex);

    setConfigs((prev) =>
      prev.map((c) => {
        const idx = reordered.findIndex((n) => n.id === c.id);
        return idx === -1 ? c : { ...c, sortOrder: idx };
      })
    );

    await Promise.all(
      reordered.map((item, idx) =>
        fetch(`/api/config-value/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: idx }),
        })
      )
    );
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

      {(() => {
        const connections: Record<string, { from: string; to: string; desc: string }[]> = {
          flow_template: [
            { from: "Status", to: "Default Stage Template", desc: "Renaming a status automatically updates all stage templates referencing it." },
          ],
          project_status: [
            { from: "Status", to: "Default Stage Template", desc: "Renaming a status automatically updates all stage templates referencing it." },
            { from: "Status", to: "Project Cards", desc: "Project status is automatically determined by the slowest work stream across all stages. Renaming a status changes the label shown on project cards and dashboards." },
          ],
          priority: [
            { from: "Priority", to: "Project Forms", desc: "Values appear as dropdown options when creating or editing projects." },
          ],
          request_type: [
            { from: "Request Type", to: "Project Forms", desc: "Values appear as dropdown options when creating or editing projects." },
          ],
          initiated_by: [
            { from: "Initiated By", to: "Project Forms", desc: "Values appear as dropdown options when creating or editing projects." },
          ],
          ball_groups: [
            { from: "Ball Groups", to: "Bump Modal, Ball View", desc: "Group names appear in bump dialogs and ball view grouping. Acronyms are used for concise display in dashboard tables and stage views." },
          ],
          requested_by_name: [
            { from: "Requested By Name", to: "Project Forms", desc: "Autocomplete options. New values are added on-the-fly when typed in project forms." },
          ],
          requested_by_dept: [
            { from: "Requested By Dept", to: "Project Forms", desc: "Autocomplete options. New values are added on-the-fly when typed in project forms." },
          ],
          pm_officer: [
            { from: "PM Officer", to: "Project Forms", desc: "Autocomplete options. New values are added on-the-fly when typed in project forms." },
          ],
        };
        const items = connections[activeCategory] ?? [];
        if (items.length === 0) return null;
        return (
          <div
            style={{
              backgroundColor: "var(--ground-metric)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-md)",
              marginBottom: "var(--space-md)",
              fontSize: "12px",
              lineHeight: 1.6,
              color: "var(--ink-secondary)",
            }}
          >
            <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>
              Connected Fields
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-sm) var(--space-lg)" }}>
              {items.map((item, i) => (
                <div key={i}>
                  <strong style={{ color: "var(--ink-primary)" }}>{item.from}</strong> &rarr; <strong style={{ color: "var(--ink-primary)" }}>{item.to}</strong>
                  <div>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        <div className="label-caps" style={{ marginBottom: "var(--space-sm)", color: "var(--ink-tertiary)" }}>{addLabel}</div>
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
          {isBallGroups && (
            <input
              type="text"
              value={newAcronym}
              onChange={(e) => setNewAcronym(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
              placeholder="Acronym..."
              style={{
                width: "100px",
                padding: "6px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                outline: "none",
              }}
            />
          )}
          {isBallGroups && (
            <input
              type="color"
              value={newColor || "#000000"}
              onChange={(e) => setNewColor(e.target.value)}
              style={{
                width: "36px",
                height: "32px",
                padding: "2px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
              }}
            />
          )}
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
          {sort ? (
            <div style={{ padding: "var(--space-sm) var(--space-md)" }}>
              <SaveOrderBar saving={saving} error={saveError} onSave={saveOrder} />
            </div>
          ) : null}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {tableColumns.map((col) => col.key === "grip" ? (
                  <th
                    key={col.key}
                    style={{
                      padding: "2px 4px",
                      width: "20px",
                      textAlign: "center",
                      backgroundColor: "var(--ground-metric)",
                      borderBottom: "1px solid var(--rule-strong)",
                    }}
                  />
                ) : (
                  <SortableTh
                    key={col.key}
                    label={col.label}
                    sort={sort}
                    sortKey={col.sortable === false ? undefined : col.key}
                    onSort={col.sortable === false ? undefined : toggleSort}
                    style={{
                      backgroundColor: "var(--ground-metric)",
                      borderBottom: "1px solid var(--rule-strong)",
                    }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} style={{ padding: "var(--space-md)", color: "var(--ink-tertiary)", textAlign: "center" }}>
                    No values configured
                  </td>
                </tr>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedRows.map((c) => String(c.id))} strategy={verticalListSortingStrategy}>
                    {sortedRows.map((item, idx) => (
                      <SortableRow key={item.id} id={String(item.id)} disabled={sort !== null}>
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
                        {isBallGroups && (
                          <td style={{ padding: "8px 10px", color: "var(--ink-secondary)" }}>
                            {editingId === item.id ? (
                              <input
                                type="text"
                                value={editAcronym}
                                onChange={(e) => setEditAcronym(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") updateItem(item.id); }}
                                style={{ padding: "4px 8px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", fontSize: "13px", outline: "none", width: "60px" }}
                              />
                            ) : (
                              item.acronym || "—"
                            )}
                          </td>
                        )}
                        {isBallGroups && (
                          <td style={{ padding: "8px 10px" }}>
                            {editingId === item.id ? (
                              <input
                                type="color"
                                value={editColor || "#000000"}
                                onChange={(e) => setEditColor(e.target.value)}
                                style={{ width: "32px", height: "28px", padding: "2px", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", cursor: "pointer" }}
                              />
                            ) : (
                              item.color ? (
                                <span style={{ display: "inline-block", width: "16px", height: "16px", borderRadius: "3px", backgroundColor: item.color, border: "1px solid var(--rule)" }} />
                              ) : "—"
                            )}
                          </td>
                        )}
                        <td style={{ padding: "8px 10px" }}>
                          {isStageTemplate && (
                            <select
                              value={item.status ?? ""}
                              onChange={(e) => updateStatus(item.id, e.target.value)}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid var(--rule)",
                                borderRadius: "var(--radius-md)",
                                fontSize: "13px",
                                fontFamily: "var(--font-sans)",
                                outline: "none",
                                backgroundColor: "var(--surface)",
                              }}
                            >
                              <option value="">—</option>
                              {statusOptions.map((s) => (
                                <option key={s.id} value={s.value}>{s.value}</option>
                              ))}
                            </select>
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
                              <button onClick={() => { setEditingId(item.id); setEditValue(item.value); setEditAcronym(item.acronym ?? ""); setEditColor(item.color ?? ""); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                              <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "var(--health-atrisk-ink)", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                            </div>
                          )}
                        </td>
                      </SortableRow>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
