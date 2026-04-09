"use client";

import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  error?: string;
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  const token = authService.getToken();
  const resp = await fetch(`${API_URL}/api/v1/dashboard/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sql }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Query failed (${resp.status}): ${text}`);
  }

  return resp.json();
}
