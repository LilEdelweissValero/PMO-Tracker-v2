"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Modal from "./Modal";

interface Field {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number" | "combo";
  options?: { label: string; value: string }[];
  configCategory?: string;
  required?: boolean;
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

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid var(--rule)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--surface)",
  color: "var(--ink-primary)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
  outline: "none",
};

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
                style={{ ...inputStyle, resize: "vertical" }}
              />
            ) : field.type === "combo" && field.configCategory ? (
              <ComboField
                configCategory={field.configCategory}
                value={(formData[field.key] as string) ?? ""}
                onChange={(v) => updateField(field.key, v)}
                required={field.required}
              />
            ) : field.type === "select" ? (
              <select
                value={(formData[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
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
                required={field.required}
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

function ComboField({
  configCategory,
  value,
  onChange,
  required,
}: {
  configCategory: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const listId = useId();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/config-value?category=${configCategory}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setOptions(data.map((c: { value: string }) => ({ label: c.value, value: c.value })));
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [configCategory]);

  const persistIfNew = useCallback((typed: string) => {
    const trimmed = typed.trim();
    if (!trimmed || options.some((o) => o.value === trimmed)) return;
    fetch("/api/config-value", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: configCategory, value: trimmed }),
    }).catch(() => {});
  }, [configCategory, options]);

  if (loading) {
    return <input type="text" value="" readOnly style={inputStyle} placeholder="Loading..." />;
  }

  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => persistIfNew(e.target.value)}
        required={required}
        style={inputStyle}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.label} />
        ))}
      </datalist>
    </>
  );
}
