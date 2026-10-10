"use client";

import { useEffect, useState } from "react";
import { listReports } from "@/services/reportsApi";
import type { ReportSummary } from "@/types/reports";

let loaded: Promise<ReportSummary[]> | null = null;

/** The standard reports, loaded once per page load; null while loading. */
export function useReportList(): { reports: ReportSummary[] | null; error: string | null } {
  const [state, setState] = useState<{ reports: ReportSummary[] | null; error: string | null }>({ reports: null, error: null });
  useEffect(() => {
    let live = true;
    loaded ??= listReports();
    loaded.then((reports) => live && setState({ reports, error: null }))
      .catch((e) => { loaded = null; if (live) setState({ reports: [], error: e instanceof Error ? e.message : "Could not load reports" }); });
    return () => { live = false; };
  }, []);
  return state;
}

export const reportHref = (id: string) => `/reporting/report?id=${encodeURIComponent(id)}`;
