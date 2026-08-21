import { useMemo, useState } from "react";

export interface SortState {
  key: string;
  direction: "asc" | "desc";
}

export type SortAccessor<T> = (row: T) => string | number | null;

export function useTableSort<T extends { id: number }>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  initialSort: SortState | null = null,
  initialDirections?: Record<string, "asc" | "desc">
) {
  const [sort, setSort] = useState<SortState | null>(initialSort);

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
        const initialDir = initialDirections?.[key];
        if (initialDir) return { key, direction: initialDir };
        return { key, direction: numeric ? "desc" : "asc" };
      }
      const initialDir = initialDirections?.[key];
      if (initialDir && prev.direction === initialDir) {
        return { key, direction: initialDir === "asc" ? "desc" : "asc" };
      }
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const clearSort = () => setSort(null);

  return { sort, sortedRows, toggleSort, clearSort };
}