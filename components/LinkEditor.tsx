"use client";

import { useState } from "react";
import type { ReferenceLink } from "@/lib/types";

interface LinkEditorProps {
  value: ReferenceLink[];
  onChange: (links: ReferenceLink[]) => void;
}

export default function LinkEditor({ value, onChange }: LinkEditorProps) {
  const [links, setLinks] = useState<ReferenceLink[]>(value);

  const update = (next: ReferenceLink[]) => {
    setLinks(next);
    onChange(next);
  };

  const addLink = () => {
    update([...links, { label: "", url: "" }]);
  };

  const removeLink = (idx: number) => {
    update(links.filter((_, i) => i !== idx));
  };

  const updateLink = (idx: number, field: "label" | "url", val: string) => {
    const next = [...links];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      {links.map((link, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <input
            type="text"
            value={link.label}
            onChange={(e) => updateLink(i, "label", e.target.value)}
            placeholder="Label"
            style={{
              flex: "0 0 120px",
              padding: "5px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <input
            type="url"
            value={link.url}
            onChange={(e) => updateLink(i, "url", e.target.value)}
            placeholder="https://..."
            style={{
              flex: 1,
              padding: "5px 8px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            onClick={() => removeLink(i)}
            style={{
              background: "none",
              border: "none",
              color: "var(--ink-tertiary)",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 6px",
            }}
          >
            &times;
          </button>
        </div>
      ))}
      <button
        onClick={addLink}
        style={{
          alignSelf: "flex-start",
          padding: "4px 10px",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--surface)",
          color: "var(--accent)",
          cursor: "pointer",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
        }}
      >
        + Add Link
      </button>
    </div>
  );
}
