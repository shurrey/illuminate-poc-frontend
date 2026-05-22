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
