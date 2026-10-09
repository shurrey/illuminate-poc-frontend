"use client";

import { authService } from "./authService";
import { SemanticApiError } from "./semanticApi";
import type { FilterValues, ReportDef, ReportSummary, RunResponse } from "@/types/reports";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await authService.authedFetch(`${API_URL}/api/v1/reports${path}`, {
    ...init, headers: { "Content-Type": "application/json" },
  });
  if (resp.ok) return resp.json();
  let message = `Request failed (${resp.status})`;
  let sql: string | undefined;
  try {
    const { detail } = await resp.json();
    if (typeof detail === "string") message = detail;
    else if (detail?.error) ({ error: message, sql } = detail);
  } catch {
    /* non-JSON body */
  }
  throw new SemanticApiError(message, resp.status, sql);
}

export const listReports = () => call<{ reports: ReportSummary[] }>("").then((r) => r.reports);

export const getReport = (id: string) =>
  call<{ report: ReportDef; defaults: FilterValues }>(`/${encodeURIComponent(id)}`);

export const runReportQuery = (id: string, visual: string, query: string, values: FilterValues) =>
  call<RunResponse>(`/${encodeURIComponent(id)}/run`, { method: "POST", body: JSON.stringify({ visual, query, values }) });
