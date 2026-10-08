"use client";

import { authService } from "./authService";
import type { CompiledQuery, QueryContract, SemanticCatalog, SemanticResult } from "@/types/semantic";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export class SemanticApiError extends Error {
  constructor(message: string, readonly status: number, readonly sql?: string) {
    super(message);
  }
}

async function headers(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await authService.getValidToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

/** FastAPI errors arrive as {detail: string}, {detail: {error, sql}} or {detail: [validation errors]}. */
async function fail(resp: Response): Promise<never> {
  let message = `Request failed (${resp.status})`;
  let sql: string | undefined;
  try {
    const { detail } = await resp.json();
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg ?? JSON.stringify(d)).join("; ");
    else if (detail?.error) ({ error: message, sql } = detail);
  } catch {
    /* non-JSON body: keep the status message */
  }
  throw new SemanticApiError(message, resp.status, sql);
}

let catalogCache: { etag: string | null; catalog: SemanticCatalog } | null = null;

/** The public catalog, revalidated with If-None-Match so unchanged catalogs cost a 304. */
export async function getCatalog(): Promise<SemanticCatalog> {
  const extra: Record<string, string> = catalogCache?.etag ? { "If-None-Match": catalogCache.etag } : {};
  const resp = await fetch(`${API_URL}/api/v1/semantic/catalog`, { headers: await headers(extra) });
  if (resp.status === 304 && catalogCache) return catalogCache.catalog;
  if (!resp.ok) return fail(resp);
  catalogCache = { etag: resp.headers.get("ETag"), catalog: await resp.json() };
  return catalogCache.catalog;
}

export async function querySemantic(contract: QueryContract): Promise<SemanticResult> {
  const resp = await fetch(`${API_URL}/api/v1/semantic/query`, {
    method: "POST", headers: await headers(), body: JSON.stringify(contract),
  });
  return resp.ok ? resp.json() : fail(resp);
}

export async function compileSemantic(contract: QueryContract): Promise<CompiledQuery> {
  const resp = await fetch(`${API_URL}/api/v1/semantic/compile`, {
    method: "POST", headers: await headers(), body: JSON.stringify(contract),
  });
  return resp.ok ? resp.json() : fail(resp);
}
