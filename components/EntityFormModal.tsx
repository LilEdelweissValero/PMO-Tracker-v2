"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import ComboField, { inputStyle } from "./ComboField";

interface Field {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number" | "combo";
  options?: { label: string; value: string }[];
  configCategory?: string;
  source?: { url: string; valueKey: string };
  required?: boolean;
  requiredIf?: (data: Record<string, string | number>) => boolean;
}

interface EntityFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  initialData?: Record<string, string | number>;
  onSubmit: (data: Record<string, string | number>) => Promise<void> | void;
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = formRef.current?.querySelector(
      "input, textarea, select"
    ) as HTMLElement | null;
    first?.focus();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide={wide}>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
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
              {(field.requiredIf ? field.requiredIf(formData) : field.required) && <span style={{ color: "var(--health-atrisk-ink)" }}> *</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={(formData[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.requiredIf ? field.requiredIf(formData) : field.required}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            ) : field.type === "combo" && (field.configCategory || field.source) ? (
              <ComboField
                configCategory={field.configCategory}
                source={field.source}
                value={(formData[field.key] as string) ?? ""}
                onChange={(v) => updateField(field.key, v)}
                required={field.requiredIf ? field.requiredIf(formData) : field.required}
              />
            ) : field.type === "select" ? (
              <select
                value={(formData[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.requiredIf ? field.requiredIf(formData) : field.required}
                style={inputStyle}
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
                required={field.requiredIf ? field.requiredIf(formData) : field.required}
                style={inputStyle}
              />
            )}
          </div>
        ))}
        {error && (
          <div style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--health-atrisk-bg)",
            color: "var(--health-atrisk-ink)",
            fontSize: "13px",
          }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
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
            disabled={submitting}
            style={{
              padding: "7px 12px",
              border: "none",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent)",
              color: "#FFFFFF",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
