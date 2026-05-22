"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCardStore } from "@/context/CardStoreContext";
import { useQueryGeneration } from "@/hooks/useQueryGeneration";
import { useQueryExecution } from "@/hooks/useQueryExecution";
import { DataTable } from "@/components/chat/DataTable";
import { ThinkingBubble } from "@/components/chat/ThinkingBubble";
import { substituteParams } from "@/utils/sqlParams";
import { format as formatSql } from "sql-formatter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles, Play, Save, Send, Loader2, Check,
  ChevronDown, ChevronUp, Pencil, RotateCcw,
} from "lucide-react";

function CardBuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addCard } = useCardStore();

  // Pre-fill from query params (from Query Builder "Create Card" button)
  const initialSql = searchParams.get("sql") || "";
  const initialName = searchParams.get("name") || "";

  const {
    generatedSql, generatedParameters, description, isGenerating,
    statusMessage, thinkingSteps, generateSql, cancelGeneration, reset,
  } = useQueryGeneration();
  const { results, isExecuting, error: execError, runQuery, clearResults } = useQueryExecution();

  const [prompt, setPrompt] = useState("");
  const [sql, setSql] = useState(initialSql);
  const [showSql, setShowSql] = useState(!!initialSql);
  const [isEditingSql, setIsEditingSql] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  // Card metadata
  const [cardName, setCardName] = useState(initialName);
  const [cardDescription, setCardDescription] = useState("");
  const [valueKey, setValueKey] = useState("");
  const [changeKey, setChangeKey] = useState("");
  const [format, setFormat] = useState<"number" | "percent">("number");
  const [invertTrend, setInvertTrend] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync generated SQL
  const hasParams = generatedParameters.length > 0;
  if (generatedSql && generatedSql !== sql) setSql(generatedSql);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    clearResults();
    generateSql(prompt.trim());
  };

  const handleRun = () => {
    if (!sql.trim() || isExecuting) return;
    const finalSql = hasParams ? substituteParams(sql.trim(), paramValues) : sql.trim();
    runQuery(finalSql);
  };

  const handleSave = () => {
    if (!cardName.trim() || !sql.trim() || !valueKey.trim()) return;

    addCard({
      id: `custom-${crypto.randomUUID()}`,
      label: cardName.trim(),
      description: cardDescription.trim() || cardName.trim(),
      longDescription: description || cardDescription.trim(),
      prompt: prompt.trim() || `Tell me more about ${cardName}`,
      query: sql.trim(),
      valueKey: valueKey.trim(),
      changeKey: changeKey.trim() || undefined,
      format,
      invertTrend,
      isBuiltIn: false,
      enabled: true,
    });

    setSaved(true);
    setTimeout(() => router.push("/"), 1500);
  };

  const formatted = (() => {
    try { return formatSql(sql, { language: "snowflake", keywordCase: "upper" }); }
    catch { return sql; }
  })();

  // Available columns from results
  const resultColumns = results?.columns || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Dashboard Card</h1>
        <p className="text-gray-500 mt-1">Build a KPI card from a SQL query</p>
      </div>

      {/* Step 1: Get the SQL */}
      {!sql && (
        <div className="bg-gradient-to-r from-[#0066FF] to-[#0044cc] rounded-xl p-5 text-white mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} />
            <h3 className="text-sm font-semibold">Describe the metric you want to track</h3>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="e.g. Count of students who haven't logged in for 14 days"
              rows={2}
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
      )}

      {thinkingSteps.length > 0 && (
        <div className="mb-4">
          <ThinkingBubble steps={thinkingSteps} isExpanded={showThinking} onToggle={() => setShowThinking(!showThinking)} isLoading={isGenerating} />
        </div>
      )}

      {/* SQL display */}
      {sql && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <button onClick={() => setShowSql(!showSql)} className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {showSql ? <ChevronUp size={14} /> : <ChevronDown size={14} />} SQL Query
            </button>
            <button onClick={() => setIsEditingSql(!isEditingSql)} className="p-1.5 text-gray-400 hover:text-[#0066FF] rounded"><Pencil size={13} /></button>
          </div>
          {showSql && (
            isEditingSql ? (
              <textarea value={sql} onChange={(e) => setSql(e.target.value)} rows={10} className="w-full p-4 text-sm font-mono bg-gray-800 text-gray-100 focus:outline-none resize-none" />
            ) : (
              <pre className="p-4 bg-gray-800 text-gray-100 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-60"><code>{formatted}</code></pre>
            )
          )}

          {/* Parameters */}
          {hasParams && (
            <div className="px-4 py-3 border-t border-gray-100 space-y-2.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parameters</div>
              {generatedParameters.map((p) => (
                <div key={p.name}>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    {p.label}{p.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type={p.type === "number" ? "number" : "text"}
                    value={paramValues[p.name] || ""}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.placeholder}
                    className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                  />
                  {p.description && <p className="text-[11px] text-gray-400 mt-0.5">{p.description}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
            <button onClick={handleRun} disabled={isExecuting || !sql.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {isExecuting ? "Running..." : "Test Query"}
            </button>
            <button onClick={() => { setSql(""); reset(); clearResults(); setCardName(""); setValueKey(""); setChangeKey(""); }} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-lg transition-colors ml-auto">
              <RotateCcw size={14} /> Start Over
            </button>
          </div>
        </div>
      )}

      {/* Execution error */}
      {execError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-6">{execError}</div>}

      {/* Results preview */}
      {results && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-700">
            Query Results ({results.rows.length} rows)
          </div>
          <DataTable data={{ columns: results.columns, rows: results.rows }} maxRows={5} />
        </div>
      )}

      {/* AI description */}
      {description && !isGenerating && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-[#0066FF]" />
            <span className="text-xs font-semibold text-[#0066FF]">AI Explanation</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Step 2: Configure the card */}
      {sql && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Card Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Card Name *</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g. Inactive Students"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={cardDescription}
                onChange={(e) => setCardDescription(e.target.value)}
                placeholder="Short description for the card"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Value Column *</label>
              {resultColumns.length > 0 ? (
                <select
                  value={valueKey}
                  onChange={(e) => setValueKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                >
                  <option value="">Select column...</option>
                  {resultColumns.map((col) => <option key={col} value={col}>{col}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={valueKey}
                  onChange={(e) => setValueKey(e.target.value)}
                  placeholder="Column name for the main value"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                />
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">The column whose value shows as the big number on the card</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Change Column (optional)</label>
              {resultColumns.length > 0 ? (
                <select
                  value={changeKey}
                  onChange={(e) => setChangeKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                >
                  <option value="">None</option>
                  {resultColumns.map((col) => <option key={col} value={col}>{col}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={changeKey}
                  onChange={(e) => setChangeKey(e.target.value)}
                  placeholder="Column for period-over-period change"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                />
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">Column for the trend indicator (percentage or absolute change)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "number" | "percent")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              >
                <option value="number">Number (12,847)</option>
                <option value="percent">Percentage (87.3%)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                <input
                  type="checkbox"
                  checked={invertTrend}
                  onChange={(e) => setInvertTrend(e.target.checked)}
                  className="rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
                />
                Invert trend (up = bad)
              </label>
            </div>
          </div>

          {/* Save */}
          <div className="pt-2">
            {saved ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <Check size={16} /> Card created! Redirecting to dashboard...
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={!cardName.trim() || !sql.trim() || !valueKey.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={14} /> Create Card
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CardBuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><Loader2 size={24} className="animate-spin text-[#0066FF]" /></div>}>
      <CardBuilderContent />
    </Suspense>
  );
}
