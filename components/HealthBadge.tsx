"use client";

import { getHealthColorClass, getHealthLabel } from "@/lib/feature";

interface HealthBadgeProps {
  health: string;
}

export default function HealthBadge({ health }: HealthBadgeProps) {
  const colors = getHealthColorClass(health);
  const label = getHealthLabel(health);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 7px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: colors.bg,
        color: colors.ink,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: colors.ink,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
