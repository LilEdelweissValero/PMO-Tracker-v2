"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid var(--rule)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--surface)",
  color: "var(--ink-primary)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
  outline: "none",
};

interface ComboFieldProps {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  configCategory?: string;
  source?: { url: string; valueKey: string };
}

export default function ComboField({
  value,
  onChange,
  required,
  configCategory,
  source,
}: ComboFieldProps) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sourceUrl = source
    ? source.url
    : configCategory
      ? `/api/config-value?category=${configCategory}`
      : null;
  const sourceValueKey = source?.valueKey ?? null;
  const [loading, setLoading] = useState(!sourceUrl);

  useEffect(() => {
    if (!sourceUrl) {
      return;
    }
    let cancelled = false;
    fetch(sourceUrl)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const raw = sourceValueKey
            ? (data as Record<string, unknown>[])
                .map((item) => String(item[sourceValueKey] ?? "").trim())
                .filter((v) => v !== "")
                .map((v) => ({ value: v }))
            : (data as { value: string }[]).map((c) => ({ value: c.value }));
          const seen = new Set<string>();
          const unique = raw
            .filter((o) => {
              if (seen.has(o.value)) return false;
              seen.add(o.value);
              return true;
            })
            .map((o) => ({ label: o.value, value: o.value }));
          setOptions(unique);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sourceUrl, sourceValueKey]);

  const filtered = typing
    ? options.filter((o) => o.value.toLowerCase().includes(value.trim().toLowerCase()))
    : options;

  const commitValue = useCallback((v: string) => {
    const trimmed = v.trim();
    onChange(trimmed);
    if (configCategory && trimmed && !options.some((o) => o.value === trimmed)) {
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
