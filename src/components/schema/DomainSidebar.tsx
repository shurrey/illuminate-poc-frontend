"use client";

import type { SchemaInfo } from "@/services/dictionaryApi";

export const DOMAIN_COLORS: Record<string, string> = {
  CDM_LMS: "#6366f1", CDM_SIS: "#06b6d4", CDM_TLM: "#f59e0b",
  CDM_ALY: "#10b981", CDM_CLB: "#ef4444", CDM_MAP: "#8b5cf6",
  CDM_MEDIA: "#ec4899", CDM_META: "#64748b", CDM_CRM: "#f97316",
};

export const DOMAIN_REFRESH: Record<string, string> = {
  CDM_LMS: "Overnight", CDM_SIS: "Daily", CDM_TLM: "Every 30 min",
  CDM_ALY: "Every 12 hours", CDM_CLB: "Every 2 hours", CDM_MAP: "Every 2 hours",
  CDM_MEDIA: "Near real-time", CDM_META: "Static", CDM_CRM: "Daily",
};

export function DomainSidebar({
  schemas,
  catalog,
  activeSchema,
  onSelect,
}: {
  schemas: string[];
  catalog: Record<string, SchemaInfo>;
  activeSchema: string | null;
  onSelect: (schema: string) => void;
}) {
  return (
    <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CDM Domains</h3>
      </div>
      <nav className="py-1">
        {schemas.map((schemaId) => {
          const schema = catalog[schemaId];
          if (!schema) return null;
          const tableCount = Object.keys(schema.tables).length;
          const isActive = schemaId === activeSchema;
          const color = DOMAIN_COLORS[schemaId] || "#6b7280";

          return (
            <button
              key={schemaId}
              onClick={() => onSelect(schemaId)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                isActive ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isActive ? "text-[#0066FF]" : "text-gray-900"}`}>
                  {schema.displayName}
                </div>
                <div className="text-xs text-gray-400">{schemaId}</div>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tableCount}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
