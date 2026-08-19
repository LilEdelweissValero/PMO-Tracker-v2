"use client";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  withTime?: boolean;
}

export default function DatePicker({ value, onChange, label, withTime }: DatePickerProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-tertiary)",
          }}
        >
          {label}
        </label>
      )}
      <input
        type={withTime ? "datetime-local" : "date"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--rule)";
        }}
      />
    </div>
  );
}
