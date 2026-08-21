"use client";

import { useState, useEffect, useRef } from "react";import Modal from "./Modal";
import ComboField, { inputStyle } from "./ComboField";
import SystemModulesField from "./SystemModulesField";
import type { FormValue, SystemSelection } from "@/lib/types";

interface Field {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number" | "combo" | "multisource" | "systemModules" | "divider";
  options?: { label: string; value: string }[];
  configCategory?: string;
  source?: { url: string; valueKey: string; labelKey?: string; moduleKey?: string };
  required?: boolean;
  requiredIf?: (data: Record<string, FormValue>) => boolean;
  hiddenIf?: (data: Record<string, FormValue>) => boolean;
  strict?: boolean;
  filterBy?: string;
  sourceFilterKey?: string;
  dividerLabel?: string;
}

interface EntityFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  initialData?: Record<string, FormValue>;
  onSubmit: (data: Record<string, FormValue>) => Promise<void> | void;
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
  const [formData, setFormData] = useState<Record<string, FormValue>>(
    initialData ?? {}
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = formRef.current?.querySelector(
      "input, textarea, select"
    ) as HTMLElement | null;
    first?.focus();
  }, [open]);

  const beforeClose = () => {
    if (dirty && !window.confirm("You have unsaved changes. Are you sure you want to close?")) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, FormValue> = {};
      for (const field of fields) {
        if (field.hiddenIf?.(formData)) continue;
        if (field.key in formData) payload[field.key] = formData[field.key];
      }
      await onSubmit(payload);
      setDirty(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key: string, value: FormValue) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} onBeforeClose={beforeClose} title={title} wide={wide}>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {fields.map((field) => {
          if (field.hiddenIf?.(formData)) return null;
          if (field.type === "divider") {
            return (
              <div key={field.key} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", margin: "var(--space-sm) 0" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--rule)" }} />
                {field.dividerLabel && (
                  <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-tertiary)", whiteSpace: "nowrap" }}>
                    {field.dividerLabel}
                  </span>
                )}
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--rule)" }} />
              </div>
            );
          }
          return (
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
                label={field.label}
                value={(formData[field.key] as string) ?? ""}
                onChange={(v) => updateField(field.key, v)}
                required={field.requiredIf ? field.requiredIf(formData) : field.required}
                strict={field.strict}
                relatedValue={field.filterBy ? (formData[field.filterBy] as string) ?? "" : undefined}
                sourceFilterKey={field.sourceFilterKey}
              />
            ) : field.type === "systemModules" ? (
              <SystemModulesField
                value={(formData[field.key] as SystemSelection[] | undefined) ?? []}
                onChange={(v) => updateField(field.key, v)}
              />
            ) : field.type === "multisource" && field.source ? (
              <MultiSourceField
                source={field.source}
                value={(formData[field.key] as number[] | undefined) ?? []}
                onChange={(ids) => updateField(field.key, ids)}
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
          );
        })}
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
            onClick={() => { if (beforeClose()) onClose(); }}
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

function MultiSourceField({
  source,
  value,
  onChange,
}: {
  source: { url: string; valueKey: string; labelKey?: string; moduleKey?: string };
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [items, setItems] = useState<
    { id: number; label: string; sublabel?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(source.url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = (data as Record<string, unknown>[]).map((item) => ({
          id: Number(item[source.valueKey]),
          label: String(item[source.labelKey ?? source.valueKey] ?? ""),
          sublabel: source.moduleKey
            ? String(item[source.moduleKey] ?? "").trim() || undefined
            : undefined,
        }));
        setItems(list.filter((i) => !Number.isNaN(i.id) && i.label !== ""));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source.url, source.valueKey, source.labelKey, source.moduleKey]);

  const toggle = (id: number) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  if (loading) {
    return <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: 220, overflowY: "auto" }}>
      {items.length === 0 ? (
        <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>No items available</div>
      ) : (
        items.map((item) => {
          const selected = value.includes(item.id);
          return (
            <label
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "6px 8px",
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                borderColor: selected ? "var(--accent)" : "var(--rule)",
                backgroundColor: selected ? "var(--accent-bg)" : "var(--surface)",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                color: "var(--ink-primary)",
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(item.id)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ flex: 1 }}>
                {item.label}
                {item.sublabel ? (
                  <span style={{ color: "var(--ink-tertiary)", marginLeft: "6px" }}>
                    {item.sublabel}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })
      )}
    </div>
  );
}
