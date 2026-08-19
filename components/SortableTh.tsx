"use client";

import type { SortState } from "@/lib/useColumnSort";

interface SortableThProps {
  label: string;
  sort?: SortState | null;
  onSort?: (key: string) => void;
  sortKey?: string;
  style?: React.CSSProperties;
}

export default function SortableTh({ label, sort, onSort, sortKey, style }: SortableThProps) {
  const sortable = Boolean(onSort && sortKey);
  const active = sortable && sort?.key === sortKey;

  return (
    <th
      onClick={sortable ? () => onSort?.(sortKey!) : undefined}
      title={sortable ? "Sort" : undefined}
      style={{
        padding: "8px 10px",
        textAlign: "left",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-sans)",
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
        ...style,
      }}
    >
      {label}
      {active ? (
        <span style={{ marginLeft: 3, fontSize: "9px" }}>
          {sort!.direction === "asc" ? "▲" : "▼"}
        </span>
      ) : null}
    </th>
  );
}