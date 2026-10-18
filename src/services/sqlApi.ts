"use client";

import { authService } from "./authService";
import { fail } from "./semanticApi";
import type { SqlRunRequest, GovernedParts } from "@/lib/savedQuery";
import type { Provenance } from "@/types/semantic";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

/** A /sql/run result. A saved governed query's run has the same shape without truncated and the spliced fields. */
export interface SqlResult {
  columns: string[];
  rows: Record<string, unknown>[];
  sql: string;
  provenance: Provenance;
  truncated?: boolean;
  executed_sql?: string;
  governed_parts?: GovernedParts;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const resp = await authService.authedFetch(`${API_URL}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return resp.ok ? resp.json() : fail(resp);
}

/** Runs SQL through the guard as the caller; a refusal rejects with the guard's message. */
export const runSql = (request: SqlRunRequest) => post<SqlResult>("/sql/run", request);

/** Runs a saved query of either kind as the caller. */
export const runSavedQuery = (queryId: string) => post<SqlResult>(`/me/queries/${encodeURIComponent(queryId)}/run`);
