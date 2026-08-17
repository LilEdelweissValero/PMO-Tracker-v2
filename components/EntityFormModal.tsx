"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/config-value?category=${configCategory}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const seen = new Set<string>();
          const unique = (data as { value: string }[])
            .map((c) => ({ label: c.value, value: c.value }))
            .filter((o) => {
              if (seen.has(o.value)) return false;
              seen.add(o.value);
              return true;
            });
          setOptions(unique);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [configCategory]);

  const filtered = typing
    ? options.filter((o) => o.value.toLowerCase().includes(value.trim().toLowerCase()))
    : options;

  const commitValue = useCallback((v: string) => {
    const trimmed = v.trim();
    onChange(trimmed);
    if (trimmed && !options.some((o) => o.value === trimmed)) {
      fetch("/api/config-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: configCategory, value: trimmed }),
      }).catch(() => {});
    }
    setOpen(false);
  }, [onChange, configCategory, options]);

  const handleFocus = () => {
    setTyping(false);
    setOpen(true);
    setHighlightIndex(
      Math.max(0, options.findIndex((o) => o.value === value))
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setTyping(true);
    setOpen(true);
    setHighlightIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      handleFocus();
      return;
    }
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = e.key === "ArrowDown" ? prev + 1 : prev - 1;
        if (next < 0) return filtered.length - 1;
        if (next >= filtered.length) return 0;
        return next;
      });
      return;
    }
    if (open && e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        commitValue(filtered[highlightIndex].value);
      } else {
        commitValue(value);
      }
      return;
    }
    if (open && e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (open && e.key === "Tab" && highlightIndex >= 0 && filtered[highlightIndex]) {
      commitValue(filtered[highlightIndex].value);
    }
  };

  const handleBlur = () => {
    commitValue(value);
  };

  if (loading) {
    return <input type="text" value="" readOnly style={inputStyle} placeholder="Loading..." />;
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        required={required}
        aria-autocomplete="list"
        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
      />
      {open && filtered.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 50,
            padding: "4px",
          }}
        >
          {filtered.map((opt, i) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitValue(opt.value)}
              onMouseEnter={() => setHighlightIndex(i)}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                color: "var(--ink-primary)",
                backgroundColor: i === highlightIndex ? "var(--accent-bg)" : "transparent",
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
