"use client";

import { useState } from "react";
import type { ReferenceLink } from "@/lib/types";

const DEFAULT_LABELS = ["GDocs", "OneDrive", "ELS", "Jira"];

interface LinkEditorProps {
  value: ReferenceLink[];
  onChange: (links: ReferenceLink[]) => void;
}

export default function LinkEditor({ value, onChange }: LinkEditorProps) {
  const [editingDefault, setEditingDefault] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const findLink = (label: string) =>
    value.find((l) => l.label.toLowerCase() === label.toLowerCase());

  const handleDefaultClick = (label: string) => {
    const existing = findLink(label);
    if (existing) {
      setEditingDefault(label);
      setEditUrl(existing.url);
    } else {
      setEditingDefault(label);
      setEditUrl("");
    }
  };

  const saveDefaultEdit = () => {
    if (!editingDefault) return;
    const url = editUrl.trim();
    const existing = findLink(editingDefault);
    if (url) {
      if (existing) {
        onChange(value.map((l) => l.label.toLowerCase() === editingDefault.toLowerCase() ? { ...l, url } : l));
      } else {
        onChange([...value, { label: editingDefault, url }]);
      }
    } else if (existing) {
      onChange(value.filter((l) => l.label.toLowerCase() !== editingDefault.toLowerCase()));
    }
    setEditingDefault(null);
    setEditUrl("");
  };

  const cancelDefaultEdit = () => {
    setEditingDefault(null);
    setEditUrl("");
  };

  const removeDefaultLink = (label: string) => {
    onChange(value.filter((l) => l.label.toLowerCase() !== label.toLowerCase()));
    if (editingDefault === label) {
      setEditingDefault(null);
      setEditUrl("");
    }
  };

  const saveCustom = () => {
    const label = customLabel.trim();
    const url = customUrl.trim();
    if (!label || !url) return;
    if (DEFAULT_LABELS.some((d) => d.toLowerCase() === label.toLowerCase())) return;
    if (value.some((l) => l.label.toLowerCase() === label.toLowerCase())) return;
    onChange([...value, { label, url }]);
    setCustomLabel("");
    setCustomUrl("");
    setShowCustomForm(false);
  };

  const cancelCustom = () => {
    setCustomLabel("");
    setCustomUrl("");
    setShowCustomForm(false);
  };

  const removeCustom = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const customLinks = value.filter(
    (l) => !DEFAULT_LABELS.some((d) => d.toLowerCase() === l.label.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {DEFAULT_LABELS.map((label) => {
          const linked = !!findLink(label);
          return (
            <span
              key={label}
              onClick={() => handleDefaultClick(label)}
              style={{
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                cursor: "pointer",
                color: linked ? "var(--accent)" : "var(--ink-secondary)",
                textDecoration: linked ? "underline" : "none",
                padding: "2px 0",
                userSelect: "none",
              }}
            >
              {label}
            </span>
          );
        })}
        <button
          onClick={() => setShowCustomForm(true)}
          style={{
            marginLeft: "2px",
            background: "none",
            border: "none",
            color: "var(--ink-tertiary)",
            cursor: "pointer",
            fontSize: "14px",
            padding: "0 4px",
            lineHeight: 1,
          }}
          title="Add custom link"
        >
          +
        </button>
      </div>

      {editingDefault && (
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-secondary)", minWidth: 70 }}>
            {editingDefault}:
          </span>
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDefaultEdit();
              if (e.key === "Escape") cancelDefaultEdit();
            }}
            style={{
              flex: 1,
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            onClick={saveDefaultEdit}
            style={{
              padding: "3px 8px",
              border: "none",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent)",
              color: "#FFFFFF",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Save
          </button>
          <button
            onClick={cancelDefaultEdit}
            style={{
              padding: "3px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Cancel
          </button>
          {findLink(editingDefault) && (
            <button
              onClick={() => removeDefaultLink(editingDefault)}
              style={{
                padding: "3px 8px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface)",
                color: "var(--ink-tertiary)",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "var(--font-sans)",
              }}
            >
              Remove
            </button>
          )}
        </div>
      )}

      {showCustomForm && (
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Label"
            autoFocus
            style={{
              width: 100,
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === "Enter") saveCustom();
              if (e.key === "Escape") cancelCustom();
            }}
            style={{
              flex: 1,
              padding: "4px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            onClick={saveCustom}
            style={{
              padding: "3px 8px",
              border: "none",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent)",
              color: "#FFFFFF",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Save
          </button>
          <button
            onClick={cancelCustom}
            style={{
              padding: "3px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {customLinks.map((link) => (
        <div key={link.label} style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--accent)",
              minWidth: 70,
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={() => {
              setEditingDefault(link.label);
              setEditUrl(link.url);
            }}
          >
            {link.label}
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--ink-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {link.url}
          </span>
          <button
            onClick={() => removeCustom(value.indexOf(link))}
            style={{
              background: "none",
              border: "none",
              color: "var(--ink-tertiary)",
              cursor: "pointer",
              fontSize: "13px",
              padding: "2px 4px",
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
