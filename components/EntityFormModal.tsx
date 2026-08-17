"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Field {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number";
  options?: { label: string; value: string }[];
  required?: boolean;
}

interface EntityFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  initialData?: Record<string, string | number>;
  onSubmit: (data: Record<string, string | number>) => void;
  wide?: boolean;
}

export default function EntityFormModal({
  open,
  onClose,
  title,
  fields,
  initialData,
  onSubmit,
  wide,
}: EntityFormModalProps) {
  const [formData, setFormData] = useState<Record<string, string | number>>(
    initialData ?? {}
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const updateField = (key: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide={wide}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {fields.map((field) => (
          <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-tertiary)",
              }}
            >
              {field.label}
              {field.required && <span style={{ color: "var(--health-atrisk-ink)" }}> *</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={(formData[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
                rows={3}
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface)",
                  color: "var(--ink-primary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            ) : field.type === "select" ? (
              <select
                value={(formData[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface)",
                  color: "var(--ink-primary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                }}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? "text"}
                value={(formData[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                required={field.required}
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface)",
                  color: "var(--ink-primary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                }}
              />
            )}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 12px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              color: "var(--ink-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: "7px 12px",
              border: "none",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent)",
              color: "#FFFFFF",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
