"use client";

import { useEffect, useState } from "react";
import type { TemplateStage } from "@/lib/feature";

export function useFlowTemplate(): TemplateStage[] {
  const [stages, setStages] = useState<TemplateStage[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config-value?category=flow_template")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setStages(
          (data as { value: string; status: string | null; sortOrder: number }[])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({ name: c.value, status: c.status }))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return stages;
}
