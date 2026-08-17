"use client";

interface Column {
  key: string;
  label: string;
  width?: string;
  zone: "identity" | "metric";
}

interface TableHeaderProps {
  columns: Column[];
}

export default function TableHeader({ columns }: TableHeaderProps) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            style={{
              padding: "8px 10px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              textAlign: "left",
              whiteSpace: "nowrap",
              backgroundColor:
                col.zone === "identity"
                  ? "var(--ink-primary)"
                  : "var(--ground-metric)",
              color:
                col.zone === "identity"
                  ? "var(--ink-on-dark)"
                  : "var(--ink-primary)",
              borderBottom: "1px solid var(--rule-strong)",
              borderRight:
                col.zone === "identity" ? "1px solid var(--ink-secondary)" : "none",
              width: col.width,
              fontFamily: "var(--font-sans)",
            }}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
