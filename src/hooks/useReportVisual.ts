"use client";

import { useCallback, useEffect, useState } from "react";
import { runReportQuery } from "@/services/reportsApi";
import { createPool } from "@/reports/pool";
import { reportResults } from "@/reports/resultCache";
import { authService } from "@/services/authService";
import type { FilterValues, RunResponse, VisualDef } from "@/types/reports";

// One pool for the whole page so a report with many visuals doesn't flood the warehouse.
const pool = createPool(6);

export interface VisualState {
  results: Record<string, RunResponse> | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
}

/** Runs every query of a visual with the report's filter values; results are cached by report, visual and values. */
export function useReportVisual(reportId: string, visual: VisualDef, values: FilterValues): VisualState {
  const [state, setState] = useState<{ key: string; results: Record<string, RunResponse> | null; error: string | null }>({ key: "", results: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([reportId, visual.id, values]);

  useEffect(() => {
    if (visual.type === "text") return;
    let live = true;
    const names = Object.keys(visual.queries);
    const user = authService.getUser()?.id ?? "";
    Promise.all(names.map((q) => {
      const k = `${key}|${q}`;
      let p = reportResults.get<RunResponse>(user, k);
      if (!p) {
        p = pool(() => runReportQuery(reportId, visual.id, q, values));
        reportResults.set(user, k, p);
      }
      return p;
    }))
      .then((rs) => { if (live) setState({ key, results: Object.fromEntries(names.map((n, i) => [n, rs[i]])), error: null }); })
      .catch((e) => { if (live) setState({ key, results: null, error: e instanceof Error ? e.message : "The query failed" }); });
    return () => { live = false; };
  }, [key, attempt, reportId, visual, values]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const current = state.key === key;
  return { results: current ? state.results : null, error: current ? state.error : null, loading: visual.type !== "text" && !current, retry };
}
