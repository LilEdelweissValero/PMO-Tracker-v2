"use client";

import { useState, useRef, useEffect } from "react";

interface Action {
  label: string;
  onClick: () => void;
  accent?: boolean;
}

interface ActionsMenuProps {
  actions: Action[];
}

export default function ActionsMenu({ actions }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "4px 8px",
          border: "1px solid var(--rule-strong)",
          borderRadius: "var(--radius-md)",
          backgroundColor: open ? "var(--ink-primary)" : "var(--surface)",
          color: open ? "var(--ink-on-dark)" : "var(--ink-primary)",
          cursor: "pointer",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
        }}
      >
        Actions
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "4px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--rule-strong)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-dropdown)",
            minWidth: "140px",
            zIndex: 100,
            padding: "4px 0",
          }}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 12px",
                border: "none",
                backgroundColor: "transparent",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "var(--font-sans)",
                color: action.accent ? "var(--accent)" : "var(--ink-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--ground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
