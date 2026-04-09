"use client";

import type { SchemaInfo, Relationship } from "@/services/dictionaryApi";
import { DOMAIN_COLORS, DOMAIN_REFRESH } from "./DomainSidebar";
import { Table2, ArrowRightLeft } from "lucide-react";

export function EntityGrid({
  schemaId,
  schema,
  relationships,
  activeTable,
  onSelect,
}: {
  schemaId: string;
  schema: SchemaInfo;
  relationships: Relationship[];
  activeTable: string | null;
  onSelect: (table: string) => void;
}) {
  const tables = Object.entries(schema.tables).sort(([a], [b]) => a.localeCompare(b));
  const color = DOMAIN_COLORS[schemaId] || "#6b7280";
  const refresh = DOMAIN_REFRESH[schemaId];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold" style={{ color }}>{schemaId}</span>
          <span className="text-sm text-gray-500">{schema.displayName}</span>
          {refresh && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Refresh: {refresh}</span>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map(([tableName, tableData]) => {
          const colCount = Object.keys(tableData.columns).length;
          const relCount = relationships.filter(
            (r) => (r.sourceSchema === schemaId && r.sourceTable === tableName) || (r.targetSchema === schemaId && r.targetTable === tableName)
          ).length;
          const isActive = tableName === activeTable;

          return (
            <button
              key={tableName}
              onClick={() => onSelect(tableName)}
              className={`text-left p-4 rounded-lg border transition-all ${
                isActive
                  ? "border-[#0066FF] bg-blue-50/50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900 font-mono mb-1">{tableName}</div>
              <div className="text-xs text-gray-500 line-clamp-2 mb-2 min-h-[2rem]">
                {tableData.description || "No description"}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Table2 size={12} />{colCount} columns</span>
                {relCount > 0 && (
                  <span className="flex items-center gap-1"><ArrowRightLeft size={12} />{relCount} rel{relCount > 1 ? "s" : ""}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
