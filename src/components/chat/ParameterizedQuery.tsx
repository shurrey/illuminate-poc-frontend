"use client";

import { useState, useMemo } from "react";
import { format as formatSql } from "sql-formatter";
import { executeQuery, type QueryResult } from "@/services/dashboardApi";
import { DataTable } from "./DataTable";
import { ExportButton } from "./ExportButton";
import type { QueryParameter, Artifact } from "@/types/chat";
import {
  Play, Loader2, ChevronDown, ChevronUp, RotateCcw, AlertCircle, Copy, Check,
} from "lucide-react";

function highlightParams(sql: string): string {
  return sql.replace(
    /:([a-zA-Z_]\w*)/g,
    '<span style="color:#0066FF;font-weight:600;background:rgba(0,102,255,0.08);padding:1px 3px;border-radius:3px">:$1</span>'
  );
}

interface ParameterizedQueryProps {
  sql: string;
  parameters: QueryParameter[];
  title?: string;
}

export function ParameterizedQuery({ sql, parameters, title }: ParameterizedQueryProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    parameters.forEach((p) => { initial[p.name] = ""; });
    return initial;
  });
  const [results, setResults] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const allRequiredFilled = useMemo(
    () => parameters.filter((p) => p.required).every((p) => values[p.name]?.trim()),
    [parameters, values]
  );

  const formatted = useMemo(() => {
    try { return formatSql(sql, { language: "snowflake", keywordCase: "upper" }); }
    catch { return sql; }
  }, [sql]);

  const handleRun = async () => {
    if (!allRequiredFilled) return;
    setExecuting(true);
    setError(null);

    // Build params object, converting types
    const params: Record<string, unknown> = {};
    parameters.forEach((p) => {
      const v = values[p.name];
      if (v === "" && !p.required) return;
      if (p.type === "number") params[p.name] = Number(v);
      else params[p.name] = v;
    });

    try {
      const data = await executeQuery(sql, params);
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const handleClear = () => {
    const cleared: Record<string, string> = {};
    parameters.forEach((p) => { cleared[p.name] = ""; });
    setValues(cleared);
    setResults(null);
    setError(null);
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      {title && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          {title}
        </div>
      )}

      {/* SQL collapsible */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowSql(!showSql)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            {showSql ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            SQL Query
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopySql(); }}
            className="text-gray-400 hover:text-[#0066FF] p-0.5 rounded"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </button>
        {showSql && (
          <pre
            className="px-3 pb-3 text-xs font-mono leading-relaxed text-gray-700 overflow-x-auto max-h-48"
            dangerouslySetInnerHTML={{ __html: highlightParams(formatted.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")) }}
          />
        )}
      </div>

      {/* Parameter form */}
      <div className="px-3 py-3 space-y-2.5">
        {parameters.map((param) => (
          <div key={param.name}>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
              {param.label}
              {param.required && <span className="text-red-400">*</span>}
            </label>

            {param.type === "select" ? (
              <select
                value={values[param.name]}
                onChange={(e) => setValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              >
                <option value="">{param.placeholder || "Select..."}</option>
                {param.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : param.type === "date" ? (
              <input
                type="date"
                value={values[param.name]}
                onChange={(e) => setValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            ) : (
              <input
                type={param.type === "number" ? "number" : "text"}
                value={values[param.name]}
                onChange={(e) => setValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                placeholder={param.placeholder}
                className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            )}

            {param.description && (
              <p className="text-[11px] text-gray-400 mt-0.5">{param.description}</p>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleRun}
            disabled={!allRequiredFilled || executing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {executing ? "Running..." : "Run Query"}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="border-t border-gray-200">
          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">{results.rows.length} rows returned</span>
            <ExportButton artifacts={[{
              id: "param-result",
              type: "table",
              data: { columns: results.columns, rows: results.rows },
              title: title || "Query Results",
            }]} />
          </div>
          <DataTable data={{ columns: results.columns, rows: results.rows }} maxRows={20} />
        </div>
      )}
    </div>
  );
}
