"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function SortableRow({ id, children, onClick }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "default",
    borderBottom: "1px solid var(--rule)",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = "var(--accent-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "";
      }}
    >
      <td
        style={{
          padding: "2px 4px",
          cursor: "grab",
          width: "20px",
          textAlign: "center",
          color: "var(--ink-tertiary)",
          verticalAlign: "middle",
        }}
        {...attributes}
        {...listeners}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2" r="1.2" />
          <circle cx="7" cy="2" r="1.2" />
          <circle cx="3" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="3" cy="12" r="1.2" />
          <circle cx="7" cy="12" r="1.2" />
        </svg>
      </td>
      {children}
    </tr>
  );
}
