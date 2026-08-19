import { useState } from "react";
import { useTableSort, type SortAccessor } from "./useTableSort";

export type { SortState, SortAccessor } from "./useTableSort";

export function useColumnSort<T extends { id: number }>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  entityType: string,
  refetch: () => void
) {
  const { sort, sortedRows, toggleSort, clearSort } = useTableSort(rows, accessors);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      clearSort();
      refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  return { sort, sortedRows, toggleSort, saveOrder, saving, saveError };
}