"use client";

interface StatusMiniBarProps {
  segments: { label: string; pct: number; bg: string }[];
}

export default function StatusMiniBar({ segments }: StatusMiniBarProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "8px",
        gap: "1px",
        borderRadius: "1px",
        overflow: "hidden",
      }}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          title={`${seg.label}: ${Math.round(seg.pct * 100)}%`}
          style={{
            width: `${Math.max(3, seg.pct * 80)}px`,
            backgroundColor: seg.bg,
            opacity: 0.75,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}
