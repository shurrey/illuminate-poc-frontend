"use client";

import { authService } from "./authService";
import type { License } from "@/lib/license";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface Tenant {
  name: string;
  license: License;
}

/** Returns null when the tenant is not set up (403) or the call fails. */
export async function fetchTenant(): Promise<Tenant | null> {
  try {
    const resp = await authService.authedFetch(`${API_URL}/api/v1/me`, { headers: { "Content-Type": "application/json" } });
    if (!resp.ok) return null;
    const body = await resp.json();
    const t = body?.tenant;
    if (!t || typeof t.name !== "string" || (t.license !== "core" && t.license !== "premium")) return null;
    return { name: t.name, license: t.license };
  } catch {
    return null;
  }
}
