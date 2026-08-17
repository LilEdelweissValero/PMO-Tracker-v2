"use client";

import { useEffect, useState } from "react";

export interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

let nextId = 0;
let listeners: ((items: ToastItem[]) => void)[] = [];
let items: ToastItem[] = [];

function emit() {
  for (const l of listeners) l([...items]);
}

export function showToast(message: string, type: "success" | "error" = "success") {
  const toast: ToastItem = { id: ++nextId, message, type };
  items = [...items, toast];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== toast.id);
    emit();
  }, 2500);
}

export default function ToastContainer() {
  const [current, setCurrent] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setCurrent);
    return () => {
      listeners = listeners.filter((l) => l !== setCurrent);
    };
  }, []);

  if (current.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "var(--space-lg)",
        right: "var(--space-lg)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
      }}
    >
      {current.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: t.type === "success" ? "var(--status-complete-bg)" : "var(--health-atrisk-bg)",
            color: t.type === "success" ? "var(--status-complete-ink)" : "var(--health-atrisk-ink)",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            boxShadow: "var(--shadow-dropdown)",
            animation: "toast-in 0.2s ease-out",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
