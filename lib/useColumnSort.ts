import { useMemo, useState } from "react";

export interface SortState {
  key: string;
  direction: "asc" | "desc";
}

export type SortAccessor<T> = (row: T) => string | number | null;

export function useColumnSort<T extends { id: number }>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  entityType: string,
  refetch: () => void
) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const accessor = accessors[sort.key];
    if (!accessor) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
          sensitivity: "base",
        });
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, accessors]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) {
        const sample = rows[0] ? accessors[key]?.(rows[0]) : null;
        const numeric = typeof sample === "number";
        return { key, direction: numeric ? "desc" : "asc" };
      }
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const saveOrder = async () => {
    if (!sort) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          orderedIds: sortedRows.map((r) => r.id),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Failed to save order (${res.status})`);
      }
      setSort(null);
      refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  return { sort, sortedRows, toggleSort, saveOrder, saving, saveError };
}