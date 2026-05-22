"use client";

import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface SnowflakeConfig {
  account: string;
  user: string;
  has_password: boolean;
  database: string;
  warehouse: string;
  role: string;
}

export interface SnowflakeConfigUpdate {
  account?: string;
  user?: string;
  password?: string;
  database?: string;
  warehouse?: string;
  role?: string;
}

export async function getSnowflakeConfig(): Promise<SnowflakeConfig> {
  const token = await authService.getValidToken();
  const resp = await fetch(`${API_URL}/api/v1/config/snowflake`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!resp.ok) throw new Error(`Failed to load config (${resp.status})`);
  return resp.json();
}

export async function updateSnowflakeConfig(updates: SnowflakeConfigUpdate): Promise<{ success: boolean; updated_fields: string[] }> {
  const token = await authService.getValidToken();
  const resp = await fetch(`${API_URL}/api/v1/config/snowflake`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to update config (${resp.status}): ${text}`);
  }
  return resp.json();
}
