"use client";

import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCardStore } from "@/context/CardStoreContext";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { useUser } from "@/context/UserContext";

export const TENANT_ERROR = "We couldn't load your organization's settings. Some features may be unavailable.";

/** The /me failure banner, and any error from loading or saving the profile. */
export function ProfileNotices() {
  const { isAuthenticated, tenantError } = useAuth();
  const stores = [useCardStore(), useQueryBuilder(), useUser()];
  if (!isAuthenticated) return null;

  const errors = new Map<string, () => void>();
  for (const s of stores) {
    if (s.error && !errors.has(s.error)) errors.set(s.error, () => stores.forEach((t) => t.error === s.error && t.clearError()));
  }
  if (!tenantError && errors.size === 0) return null;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 space-y-2">
      {tenantError && (
        <div role="alert" className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{TENANT_ERROR}</span>
        </div>
      )}
      {[...errors].map(([message, dismiss]) => (
        <div key={message} role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <span className="flex-1">{message}</span>
          <button onClick={dismiss} aria-label="Dismiss" className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
