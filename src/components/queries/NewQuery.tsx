"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, LayoutDashboard, Loader2, Play, RotateCcw, Save, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import { useSemanticGeneration } from "@/hooks/useSemanticGeneration";
import { compileSemantic, querySemantic } from "@/services/semanticApi";
import { ResultTable } from "@/components/ResultTable";
import { ContractEditor } from "./ContractEditor";
import { SaveQueryDialog } from "./SaveQueryDialog";
import { SavedNotice } from "./SavedNotice";
import type { QueryContract, SemanticResult } from "@/types/semantic";

interface NewQueryProps {
  initialContract?: QueryContract;
  initialPrompt?: string;
  initialName?: string;
  initialDescription?: string;
  onViewSaved?: () => void;
}

const EMPTY: QueryContract = { metrics: [], limit: 100 };

export function NewQuery({ initialContract, initialPrompt, initialName, initialDescription, onViewSaved }: NewQueryProps) {
  const { catalog, error: catalogError } = useSemanticCatalog();
  const gen = useSemanticGeneration();
  const { saveQuery } = useQueryBuilder();

  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [refinement, setRefinement] = useState("");
  const [contract, setContract] = useState<QueryContract>(initialContract ?? EMPTY);
  const [editorKey, setEditorKey] = useState(0);
  const [result, setResult] = useState<SemanticResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);

  useEffect(() => {
    if (!gen.answer) return;
    // An answer without a governed contract must not leave the previous query looking like its result.
    setContract(gen.result.contract ?? EMPTY);
    setEditorKey((k) => k + 1);
    setResult(null);
  }, [gen.result, gen.answer]);

  const hasSelection = !!(contract.metrics?.length || contract.measures?.length);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compiledSql, setCompiledSql] = useState<string | null>(null);
  useEffect(() => {
    if (!hasSelection) { setCompileError(null); setCompiledSql(null); return; }
    let live = true;
    const t = setTimeout(() => {
      compileSemantic(contract).then((c) => { if (live) { setCompileError(null); setCompiledSql(c.sql); } })
        .catch((e) => { if (live) { setCompileError(e instanceof Error ? e.message : "This query can't be compiled"); setCompiledSql(null); } });
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [contract, hasSelection]);
  const usable = hasSelection && !compileError;
  const ungoverned = gen.result.provenance?.governed === false;

  const run = async () => {
    setRunning(true);
    setRunError(null);
    try {
      setResult(await querySemantic(contract));
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "The query failed");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    gen.reset();
    setPrompt("");
    setContract(EMPTY);
    setEditorKey((k) => k + 1);
    setResult(null);
    setRunError(null);
  };

  return (
    <div className="space-y-6">
      {savedName && <SavedNotice name={savedName} onView={onViewSaved} onDismiss={() => setSavedName(null)} />}
      {catalogError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{catalogError}</div>}

      <div className="bg-gradient-to-r from-[#0066FF] to-[#0044cc] rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2"><Sparkles size={16} /><h3 className="text-sm font-semibold">Ask a question, or build the query below</h3></div>
        <div className="relative">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} disabled={gen.isGenerating}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (prompt.trim()) gen.ask(prompt.trim()); } }}
            placeholder="e.g. Average grade by term for Ultra courses"
            className="w-full px-4 py-3 pr-12 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none resize-none" />
          <button onClick={() => prompt.trim() && gen.ask(prompt.trim())} disabled={gen.isGenerating || !prompt.trim()}
            className="absolute right-2 bottom-2 p-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg disabled:bg-gray-300">
            {gen.isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {gen.isGenerating && (
          <div className="flex items-center justify-between mt-2 text-xs text-blue-200">
            <span>{gen.status || "Working..."}</span>
            <button onClick={gen.cancel} className="hover:text-white">Cancel</button>
          </div>
        )}
      </div>

      {gen.error && <div className="text-sm text-red-600">{gen.error}</div>}
      {gen.answer && !gen.isGenerating && (
        <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-lg border border-gray-200 p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{gen.answer}</ReactMarkdown>
        </div>
      )}
      {ungoverned && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
          <div className="flex gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span><strong>Ungoverned.</strong> No governed metric answers this, so it can&apos;t be saved or made a card. {gen.result.provenance?.reason}</span>
          </div>
          {gen.result.table && <ResultTable columns={gen.result.table.columns} rows={gen.result.table.rows} />}
        </div>
      )}
      {gen.result.contract && (
        <div className="flex gap-2">
          <input value={refinement} onChange={(e) => setRefinement(e.target.value)} placeholder="Refine, e.g. only courses that have ended"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
          <button onClick={() => { gen.refine(refinement.trim()); setRefinement(""); }} disabled={!refinement.trim() || gen.isGenerating}
            className="px-3 py-2 text-sm text-[#0066FF] border border-[#0066FF] rounded-lg disabled:opacity-50">Refine</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {catalog ? <ContractEditor key={editorKey} catalog={catalog} contract={contract} onChange={(c) => { setContract(c); setResult(null); }} />
          : <Loader2 size={18} className="animate-spin text-gray-300" />}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
          <button onClick={run} disabled={!usable || running}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {running ? "Running..." : "Run"}
          </button>
          <button onClick={() => setShowSave(true)} disabled={!usable}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-50"><Save size={14} /> Save</button>
          {usable && (
            <Link href={`/cards/new?contract=${encodeURIComponent(JSON.stringify(contract))}&name=${encodeURIComponent(prompt.slice(0, 60))}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg"><LayoutDashboard size={14} /> Create card</Link>
          )}
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 ml-auto"><RotateCcw size={14} /> Start over</button>
        </div>
      </div>

      {compileError && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{compileError}</div>}
      {compiledSql && (
        <details open className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-500">
          <summary className="cursor-pointer text-sm text-gray-700">SQL</summary>
          <pre className="mt-2 p-3 bg-gray-800 text-gray-100 rounded-lg overflow-x-auto max-h-72">{compiledSql}</pre>
        </details>
      )}
      {runError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{runError}</div>}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-sm text-gray-700">
            <ShieldCheck size={14} className="text-emerald-600" /> {result.rows.length} rows from {[...(result.provenance.metrics ?? []), ...(result.provenance.measures ?? [])].join(", ")}
          </div>
          <div className="p-4"><ResultTable columns={result.columns} rows={result.rows} /></div>
        </div>
      )}

      {showSave && (
        <SaveQueryDialog initialName={initialName ?? prompt.slice(0, 60)} initialDescription={initialDescription ?? ""}
          onClose={() => setShowSave(false)}
          onSave={(name, description) => {
            const now = new Date().toISOString();
            saveQuery({ id: crypto.randomUUID(), name, description, prompt: prompt.trim(), contract, createdAt: now, lastUsedAt: now });
            setShowSave(false);
            setSavedName(name);
          }} />
      )}
    </div>
  );
}
