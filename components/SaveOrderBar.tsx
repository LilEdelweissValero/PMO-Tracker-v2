"use client";

interface SaveOrderBarProps {
  saving: boolean;
  error: string | null;
  onSave: () => void;
}

export default function SaveOrderBar({ saving, error, onSave }: SaveOrderBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-sm)",
      }}
    >
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: "7px 12px",
          border: "none",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--accent)",
          color: "#FFFFFF",
          cursor: saving ? "not-allowed" : "pointer",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          fontFamily: "var(--font-sans)",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "SAVE ORDER"}
      </button>
      {error ? (
        <span style={{ fontSize: "12px", color: "var(--health-atrisk-ink)" }}>{error}</span>
      ) : null}
    </div>
  );
}