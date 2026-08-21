"use client";

interface DetailHeroProps {
  kicker: string;
  title: string;
  meta: { label: string; value: string | null }[];
  accentColor?: string;
  acronyms?: string[];
  status?: { label: string; colors: { bg: string; ink: string } } | null;
}

export default function DetailHero({ kicker, title, meta, accentColor, acronyms = [], status }: DetailHeroProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--rule)",
        borderTop: `4px solid ${accentColor ?? "var(--accent)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
        boxShadow: "var(--shadow-detail-hero)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "var(--space-lg)",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 480px", minWidth: 0 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-tertiary)",
              marginBottom: "var(--space-sm)",
            }}
          >
            {kicker}
          </div>
          <h1
            style={{
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 750,
              lineHeight: 1.1,
              margin: "0 0 var(--space-md) 0",
              fontFamily: "var(--font-sans)",
              color: "var(--ink-primary)",
            }}
          >
            {title}
          </h1>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "var(--space-sm) var(--space-lg)",
            }}
          >
            {meta.map((item, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-tertiary)",
                    marginBottom: "2px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: item.value ? "var(--ink-primary)" : "var(--ink-tertiary)",
                  }}
                >
                  {item.value || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: "0 1 auto", minWidth: 200 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-tertiary)",
              marginBottom: "var(--space-sm)",
            }}
          >
            Systems Affected
          </div>
          {acronyms.length > 0 ? (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {acronyms.map((acr, i) => (
                <span
                  key={i}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--accent-bg)",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {acr}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
              No chosen system yet.
            </div>
          )}

          {status && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-tertiary)",
                  marginBottom: "6px",
                }}
              >
                Project Status
              </div>
              <span
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: status.colors.bg,
                  color: status.colors.ink,
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {status.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}