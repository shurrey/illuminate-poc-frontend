"use client";

import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

/** Targets: `measure:<dataset>:<name>`, `filter:<dataset>:<name>`, `metric:<metric id>`. */
export interface Overlay {
  target: string;
  expr?: string | null;
  sql?: string | null;
  default_filters?: string[] | null;
  description: string;
  version: number;
  updated_by: string;
  updated_at: string;
  /** From the overlay list: "skipped" when the overlay no longer validates and is not applied. */
  status?: "active" | "skipped";
  problems?: string[];
}

export type OverlayValue = { expr: string } | { sql: string } | { default_filters: string[] };

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number, readonly errors: string[] = []) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await authService.getValidToken();
  const resp = await fetch(`${API_URL}/api/v1/admin${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (resp.ok) return resp.json();
  let detail: unknown = null;
  try {
    detail = (await resp.json()).detail;
  } catch {
    /* non-JSON body */
  }
  if (detail && typeof detail === "object" && "errors" in detail) {
    const errors = (detail as { errors: string[] }).errors;
    throw new AdminApiError(errors.join("; "), resp.status, errors);
  }
  throw new AdminApiError(typeof detail === "string" ? detail : `Request failed (${resp.status})`, resp.status);
}

const path = (target: string) => `/overlay/${encodeURIComponent(target)}`;

export const listOverlays = () => call<{ tenant_id: string; overlays: Overlay[] }>("/overlays");

export const getOverlay = (target: string) =>
  call<{ overlay: Overlay | null; canonical: Partial<Record<"expr" | "sql" | "default_filters", unknown>> | null }>(path(target));

export const putOverlay = (target: string, value: OverlayValue, description: string, expectedVersion: number) =>
  call<{ overlay: Overlay }>(path(target), {
    method: "PUT", body: JSON.stringify({ ...value, description, expected_version: expectedVersion }),
  });

export const deleteOverlay = (target: string, expectedVersion: number) =>
  call<{ overlay: null }>(`${path(target)}?expected_version=${expectedVersion}`, { method: "DELETE" });

export const overlayHistory = (target: string) => call<{ history: Overlay[] }>(`${path(target)}/history`);

export const revertOverlay = (target: string, version: number, expectedVersion: number) =>
  call<{ overlay: Overlay }>(`${path(target)}/revert`, {
    method: "POST", body: JSON.stringify({ version, expected_version: expectedVersion }),
  });
