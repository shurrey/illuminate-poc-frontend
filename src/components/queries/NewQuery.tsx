"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQueryGeneration } from "@/hooks/useQueryGeneration";
import { useQueryExecution } from "@/hooks/useQueryExecution";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { DataTable } from "@/components/chat/DataTable";
import { ThinkingBubble } from "@/components/chat/ThinkingBubble";
import { SaveQueryDialog } from "./SaveQueryDialog";
import { format as formatSql } from "sql-formatter";
import { substituteParams } from "@/utils/sqlParams";
import Link from "next/link";
import {
  Sparkles, Play, Save, Copy, Check, X, Send, Loader2,
  Pencil, RotateCcw, ChevronDown, ChevronUp, LayoutDashboard,
} from "lucide-react";

interface NewQueryProps {
  initialSql?: string;
  initialPrompt?: string;
  initialName?: string;
  initialDescription?: string;
}

export function NewQuery({ initialSql, initialPrompt, initialName, initialDescription }: NewQueryProps) {
  const {
    generatedSql, generatedParameters, description, isGenerating, error: genError,
    statusMessage, thinkingSteps, generateSql, refineSql, cancelGeneration, reset,
  } = useQueryGeneration();
  const { results, isExecuting, error: execError, runQuery, clearResults } = useQueryExecution();
  const { saveQuery } = useQueryBuilder();

  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [sql, setSql] = useState(initialSql || "");
  const [isEditingSql, setIsEditingSql] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [showSql, setShowSql] = useState(true);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Sync generated SQL and parameters
  useEffect(() => {
    if (generatedSql) setSql(generatedSql);
  }, [generatedSql]);

  useEffect(() => {
    if (generatedParameters.length > 0) {
      const initial: Record<string, string> = {};
      generatedParameters.forEach((p) => { initial[p.name] = ""; });
      setParamValues(initial);
    }
  }, [generatedParameters]);

  // Auto-resize prompt textarea
  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.style.height = "auto";
      promptRef.current.style.height = `${Math.min(promptRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    clearResults();
    generateSql(prompt.trim());
  };

  const hasParams = generatedParameters.length > 0;
  const allRequiredFilled = !hasParams || generatedParameters
    .filter((p) => p.required)
    .every((p) => paramValues[p.name]?.trim());

  const handleRun = () => {
    if (!sql.trim() || isExecuting || !allRequiredFilled) return;
    const finalSql = hasParams ? substituteParams(sql.trim(), paramValues) : sql.trim();
    runQuery(finalSql);
  };

  const handleRefine = () => {
    if (!refineInput.trim() || isGenerating) return;
    clearResults();
    refineSql(refineInput.trim());
    setRefineInput("");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (name: string, desc: string) => {
    saveQuery({
      id: crypto.randomUUID(),
      name,
      prompt: prompt.trim(),
      sql: sql.trim(),
      description: desc,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
    setShowSaveDialog(false);
  };

  const handleReset = () => {
    reset();
    setSql("");
    setPrompt("");
    setRefineInput("");
    clearResults();
    setIsEditingSql(false);
    promptRef.current?.focus();
  };

  const formatted = (() => {
    try { return formatSql(sql, { language: "snowflake", keywordCase: "upper" }); }
    catch { return sql; }
  })();

  return (
    <div className="space-y-4">
      {/* Prompt input */}
      <div className="bg-gradient-to-r from-[#0066FF] to-[#0044cc] rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} />
          <h3 className="text-sm font-semibold">Describe what you want to query</h3>
        </div>
        <div className="relative">
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="e.g. Show me student enrollment by department for the current term, with year-over-year comparison"
            rows={1}
            disabled={isGenerating}
            className="w-full px-4 py-3 pr-12 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none disabled:bg-gray-50"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="absolute right-2 bottom-2 p-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg transition-colors disabled:bg-gray-300"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {isGenerating && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-blue-200">{statusMessage || "Generating..."}</span>
            <button onClick={cancelGeneration} className="text-xs text-blue-200 hover:text-white">Cancel</button>
          </div>
        )}
      </div>

      {/* Thinking bubble */}
      {thinkingSteps.length > 0 && (
        <ThinkingBubble steps={thinkingSteps} isExpanded={showThinking} onToggle={() => setShowThinking(!showThinking)} isLoading={isGenerating} />
      )}

      {/* Generation error */}
      {genError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{genError}</div>
      )}

      {/* SQL Panel */}
      {sql && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => setShowSql(!showSql)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700"
            >
              {showSql ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              SQL Query
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsEditingSql(!isEditingSql)} className="p-1.5 text-gray-400 hover:text-[#0066FF] rounded transition-colors" title="Edit SQL">
                <Pencil size={13} />
              </button>
              <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-[#0066FF] rounded transition-colors" title="Copy SQL">
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {showSql && (
            isEditingSql ? (
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                rows={12}
                className="w-full p-4 text-sm font-mono bg-gray-800 text-gray-100 focus:outline-none resize-none"
              />
            ) : (
              <pre className="p-4 bg-gray-800 text-gray-100 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-80">
                <code>{formatted}</code>
              </pre>
            )
          )}

          {/* Parameter form */}
          {hasParams && (
            <div className="px-4 py-3 border-t border-gray-100 space-y-2.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parameters</div>
              {generatedParameters.map((param) => (
                <div key={param.name}>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    {param.label}
                    {param.required && <span className="text-red-400">*</span>}
                  </label>
                  {param.type === "select" ? (
                    <select
                      value={paramValues[param.name] || ""}
                      onChange={(e) => setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
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
                      value={paramValues[param.name] || ""}
                      onChange={(e) => setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                    />
                  ) : (
                    <input
                      type={param.type === "number" ? "number" : "text"}
                      value={paramValues[param.name] || ""}
                      onChange={(e) => setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                      placeholder={param.placeholder}
                      className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                    />
                  )}
                  {param.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{param.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
            <button
              onClick={handleRun}
              disabled={isExecuting || !sql.trim() || !allRequiredFilled}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {isExecuting ? "Running..." : "Run Query"}
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors"
            >
              <Save size={14} /> Save
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-lg transition-colors ml-auto"
            >
              <RotateCcw size={14} /> New Query
            </button>
          </div>
        </div>
      )}

      {/* Execution error */}
      {execError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{execError}</div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Results ({results.rows.length} rows)</span>
            <Link
              href={`/cards/new/?sql=${encodeURIComponent(sql)}&name=${encodeURIComponent(prompt.slice(0, 60))}`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0066FF] hover:bg-blue-50 rounded transition-colors"
            >
              <LayoutDashboard size={12} /> Create Card
            </Link>
          </div>
          <DataTable data={{ columns: results.columns, rows: results.rows }} maxRows={20} />
        </div>
      )}

      {/* Refinement input */}
      {sql && !isGenerating && (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRefine(); }}
              placeholder="Refine: add a filter, change grouping, limit results..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent pr-10"
            />
            <button
              onClick={handleRefine}
              disabled={!refineInput.trim() || isGenerating}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#0066FF] disabled:text-gray-300 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* AI description */}
      {description && !isGenerating && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-[#0066FF]" />
            <span className="text-xs font-semibold text-[#0066FF]">AI Explanation</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <SaveQueryDialog
          initialName={initialName || prompt.slice(0, 60) || "Untitled Query"}
          initialDescription={initialDescription || description || ""}
          onSave={handleSave}
          onClose={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
