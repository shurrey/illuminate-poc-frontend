"use client";

import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  error?: string;
}

/** Strip SQL comments so the backend's SELECT/WITH validation passes. */
function stripLeadingComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, "")      // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .trim();
}

export async function executeQuery(sql: string, params?: Record<string, unknown>): Promise<QueryResult> {
  const cleaned = stripLeadingComments(sql);
  const token = await authService.getValidToken();
  const body: Record<string, unknown> = { sql: cleaned };
  if (params && Object.keys(params).length > 0) body.params = params;

  const resp = await fetch(`${API_URL}/api/v1/dashboard/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Query failed (${resp.status}): ${text}`);
  }

  return resp.json();
}

/**
 * Execute a canonical metric by id. The backend resolves the canonical
 * definition (plus any tenant overlay), compiles SQL, and runs it against
 * Snowflake — returns the same {columns, rows} shape as `executeQuery`.
 */
export async function executeMetric(metric_id: string): Promise<QueryResult> {
  const token = await authService.getValidToken();
  const resp = await fetch(`${API_URL}/api/v1/dashboard/metric`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ metric_id }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Metric query failed (${resp.status}): ${text}`);
  }

  return resp.json();
}
