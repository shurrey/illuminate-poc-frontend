"use client";

import { useState, useEffect } from "react";
import type { SchemaInfo, Relationship, PreviewResponse } from "@/services/dictionaryApi";
import { DOMAIN_COLORS } from "./DomainSidebar";
import { ResultTable } from "@/components/ResultTable";
import { X, Key, ArrowRight, ExternalLink, Loader2 } from "lucide-react";

interface EntityDetailProps {
  schemaId: string;
  tableName: string;
  schema: SchemaInfo;
  relationships: Relationship[];
  preview: PreviewResponse | null;
  previewLoading: boolean;
  onLoadPreview: () => void;
  /** Table previews return raw rows, so only administrators get the Data Preview tab. */
  canPreview: boolean;
  onClose: () => void;
  onNavigate: (schema: string, table: string) => void;
}

export function EntityDetail({
  schemaId, tableName, schema, relationships, preview, previewLoading,
  onLoadPreview, canPreview, onClose, onNavigate,
}: EntityDetailProps) {
  const [activeTab, setActiveTab] = useState<"schema" | "data">("schema");
  const table = schema.tables[tableName];
  const color = DOMAIN_COLORS[schemaId] || "#6b7280";

  // Fetch preview when Data tab is activated
  useEffect(() => {
    if (activeTab === "data" && !preview && !previewLoading) {
      onLoadPreview();
    }
  }, [activeTab, preview, previewLoading, onLoadPreview]);

  if (!table) return null;

  const columns = Object.entries(table.columns).sort(([a], [b]) => a.localeCompare(b));

  // Deduplicate relationships
  const uniqueRels: Relationship[] = [];
  const seen = new Set<string>();
  for (const r of relationships) {
    const key = `${r.sourceSchema}.${r.sourceTable}.${r.sourceColumn}->${r.targetSchema}.${r.targetTable}.${r.targetColumn}`;
    if (!seen.has(key)) { seen.add(key); uniqueRels.push(r); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-semibold font-mono" style={{ color }}>{tableName}</div>
              <div className="text-sm text-gray-500 mt-1">{table.description || "No description"}</div>
              <div className="text-xs text-gray-400 mt-1">{schemaId} &middot; {columns.length} columns</div>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
          {(canPreview ? (["schema", "data"] as const) : (["schema"] as const)).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab ? "border-[#0066FF] text-[#0066FF]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "schema" ? "Schema" : "Data Preview"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "schema" ? (
            <SchemaTab columns={columns} relationships={uniqueRels} schemaId={schemaId} tableName={tableName} onNavigate={onNavigate} />
          ) : (
            <DataTab preview={preview} loading={previewLoading} schemaId={schemaId} tableName={tableName} columnMeta={table.columns} />
          )}
        </div>
      </div>
    </div>
  );
}

function SchemaTab({
  columns, relationships, onNavigate,
}: {
  columns: [string, { description: string; dataType: string; nullable: boolean }][];
  relationships: Relationship[];
  schemaId: string;
  tableName: string;
  onNavigate: (schema: string, table: string) => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Columns ({columns.length})</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Column</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-24">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {columns.map(([colName, col]) => {
                const isPk = colName.endsWith("_ID") || colName === "PK1" || colName === "ID";
                return (
                  <tr key={colName} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono">
                      <span className="flex items-center gap-1.5">
                        {isPk && <Key size={11} className="text-amber-500" />}
                        <span className={isPk ? "font-semibold text-gray-900" : "text-gray-700"}>{colName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">{col.dataType}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{col.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Relationships ({relationships.length})</h3>
        {relationships.length === 0 ? (
          <p className="text-sm text-gray-400">No relationships found</p>
        ) : (
          <div className="space-y-1.5">
            {relationships.map((rel, i) => {
              const targetSchema = rel.targetSchema;
              const targetTable = rel.targetTable;
              return (
                <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-gray-600">{rel.sourceColumn}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <button
                    onClick={() => onNavigate(targetSchema, targetTable)}
                    className="font-mono text-xs text-[#0066FF] hover:underline flex items-center gap-1"
                  >
                    {targetSchema}.{targetTable}.{rel.targetColumn}
                    <ExternalLink size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DataTab({
  preview, loading, schemaId, tableName, columnMeta,
}: {
  preview: PreviewResponse | null;
  loading: boolean;
  schemaId: string;
  tableName: string;
  columnMeta: Record<string, { description: string; dataType: string; nullable: boolean }>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-3" />
        <span className="text-sm">Loading preview from Snowflake...</span>
      </div>
    );
  }

  if (!preview || preview.columns.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        No preview data available
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-xs text-gray-400 mb-3">
        Live data &middot; {preview.rows.length} rows &middot; {schemaId}.{tableName}
      </div>
      <ResultTable columns={preview.columns} rows={preview.rows}
        columnTitles={Object.fromEntries(Object.entries(columnMeta).map(([c, m]) => [c, `${c} (${m.dataType})\n${m.description}`]))} />
    </div>
  );
}
