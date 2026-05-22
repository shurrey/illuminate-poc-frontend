"use client";

import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface OverlayPayload {
  owner: string;
  last_reviewed: string; // ISO date
  diff_description: string;
  measure_sql: string;
}

export interface MetricSummary {
  id: string;
  display_name: string;
  description: string;
  owner: string;
  entity: string;
  canonical_sql: string;
  synonyms: string[];
  overlay: OverlayPayload | null;
}

export interface MetricListResponse {
  tenant_id: string;
  metrics: MetricSummary[];
}

export interface OverlayResponse {
  tenant_id: string;
  metric_id: string;
  overlay: OverlayPayload | null;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await authService.getValidToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listMetrics(): Promise<MetricListResponse> {
  const resp = await fetch(`${API_URL}/api/v1/admin/metrics`, {
    headers: await authHeaders(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`listMetrics failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

export async function getOverlay(metric_id: string): Promise<OverlayResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/admin/overlay/${encodeURIComponent(metric_id)}`,
    { headers: await authHeaders() },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`getOverlay failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

export interface PutOverlayInput {
  measure_sql: string;
  diff_description?: string;
  owner?: string;
  last_reviewed?: string;
}

export async function putOverlay(
  metric_id: string,
  input: PutOverlayInput,
): Promise<OverlayResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/admin/overlay/${encodeURIComponent(metric_id)}`,
    {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    },
  );
  if (!resp.ok) {
    // Surface the validator's error detail to the UI
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // non-JSON body, keep statusText
    }
    throw new Error(detail);
  }
  return resp.json();
}

export async function deleteOverlay(metric_id: string): Promise<OverlayResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/admin/overlay/${encodeURIComponent(metric_id)}`,
    {
      method: "DELETE",
      headers: await authHeaders(),
    },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`deleteOverlay failed (${resp.status}): ${text}`);
  }
  return resp.json();
}
