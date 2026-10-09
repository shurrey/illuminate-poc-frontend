"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Loader2, Save, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useCardStore } from "@/context/CardStoreContext";
import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import { useSemanticGeneration } from "@/hooks/useSemanticGeneration";
import { querySemantic } from "@/services/semanticApi";
import { type CardFormat, formatCardValue, formatFor, kpiContract, valueColumn } from "@/data/dashboardCards";
import type { QueryContract } from "@/types/semantic";

const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent";

function parseContract(raw: string | null): QueryContract | null {
  try {
    return raw ? (JSON.parse(raw) as QueryContract) : null;
  } catch {
    return null;
  }
}

function CardBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addCard } = useCardStore();
  const { catalog, error: catalogError } = useSemanticCatalog();
  const gen = useSemanticGeneration();

  const [mode, setMode] = useState<"pick" | "describe">("pick");
  const [prompt, setPrompt] = useState("");
  const [refinement, setRefinement] = useState("");
  const [source, setSource] = useState<QueryContract | null>(() => parseContract(searchParams.get("contract")));
  const [preview, setPreview] = useState<{ raw: unknown; sql: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [nameTouched, setNameTouched] = useState(!!searchParams.get("name"));
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<CardFormat>("number");
  const [saved, setSaved] = useState(false);

  const contract = useMemo(() => (source ? kpiContract(source) : null), [source]);
  const dropped = [
    ...(source?.dimensions ?? []).map((d) => `the breakdown by ${d}`),
    ...[...(source?.metrics ?? []), ...(source?.measures ?? [])].slice(1),
  ];

  useEffect(() => {
    if (gen.answer) setSource(gen.result.contract);
  }, [gen.result, gen.answer]);

  useEffect(() => {
    if (!contract || !catalog) return;
    setFormat(formatFor(contract, catalog));
    const metric = catalog.metrics.find((m) => m.id === contract.metrics?.[0]);
    if (metric && !nameTouched) {
      setName(metric.display_name);
      setDescription(metric.description);
    }
  }, [contract, catalog, nameTouched]);

  useEffect(() => {
    if (!contract) return;
    let live = true;
    setPreview(null);
    setPreviewError(null);
    // The agent already ran this exact query; reuse its result instead of running it again.
    const column = valueColumn(contract);
    if (gen.result.contract === source && JSON.stringify(source) === JSON.stringify(contract) && gen.result.table && column) {
      setPreview({ raw: gen.result.table.rows[0]?.[column], sql: gen.result.sql ?? "" });
      return;
    }
    querySemantic(contract)
      .then((r) => {
        const column = valueColumn(contract);
        if (live) setPreview({ raw: column ? r.rows[0]?.[column] : undefined, sql: r.sql });
      })
      .catch((e) => live && setPreviewError(e instanceof Error ? e.message : "The query failed"));
    return () => { live = false; };
  }, [contract]);

  const ungoverned = gen.result.provenance?.governed === false;

  const handleSave = () => {
    if (!contract || !name.trim()) return;
    addCard({
      id: `custom-${crypto.randomUUID()}`,
      label: name.trim(),
      description: description.trim() || name.trim(),
      longDescription: description.trim() || name.trim(),
      prompt: prompt.trim() || `Tell me more about ${name.trim()}`,
      contract,
      format,
      isBuiltIn: false,
      enabled: true,
    });
    setSaved(true);
    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Dashboard Card</h1>
        <p className="text-gray-500 mt-1">Cards show one governed metric from the semantic layer</p>
      </div>

      {catalogError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{catalogError}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100 text-sm">
          {(["pick", "describe"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2.5 font-medium ${mode === m ? "text-[#0066FF] border-b-2 border-[#0066FF]" : "text-gray-500"}`}>
              {m === "pick" ? "Pick a metric" : "Describe it"}
            </button>
          ))}
        </div>

        {mode === "pick" ? (
          <div className="p-5">
            <select value={source?.metrics?.[0] ?? ""} onChange={(e) => e.target.value && setSource({ metrics: [e.target.value] })}
              disabled={!catalog} className={input}>
              <option value="">{catalog ? "Select a metric..." : "Loading the catalog..."}</option>
              {catalog?.metrics.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <div className="relative">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} disabled={gen.isGenerating}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (prompt.trim()) gen.ask(prompt.trim()); } }}
                placeholder="e.g. Share of students in ongoing courses who were active this week"
                className={`${input} pr-12 resize-none`} />
              <button onClick={() => prompt.trim() && gen.ask(prompt.trim())} disabled={gen.isGenerating || !prompt.trim()}
                className="absolute right-2 bottom-2 p-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg disabled:bg-gray-300">
                {gen.isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {gen.isGenerating && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{gen.status || "Working..."}</span>
                <button onClick={gen.cancel} className="hover:text-gray-700">Cancel</button>
              </div>
            )}
            {gen.error && <div className="text-sm text-red-600">{gen.error}</div>}
            {gen.answer && !gen.isGenerating && (
              <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-lg p-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{gen.answer}</ReactMarkdown>
              </div>
            )}
            {ungoverned && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>No governed metric answers this, so it can&apos;t become a card. {gen.result.provenance?.reason}</span>
              </div>
            )}
            {gen.result.contract && (
              <div className="flex gap-2">
                <input value={refinement} onChange={(e) => setRefinement(e.target.value)} placeholder="Refine, e.g. only Ultra courses"
                  className={input} />
                <button onClick={() => { gen.refine(refinement.trim()); setRefinement(""); }} disabled={!refinement.trim() || gen.isGenerating}
                  className="px-3 py-2 text-sm text-[#0066FF] border border-[#0066FF] rounded-lg disabled:opacity-50">
                  <Sparkles size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {contract && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <ShieldCheck size={15} /> {[...(contract.metrics ?? []), ...(contract.measures ?? [])].join(", ")}
            {contract.filters?.map((f) => <span key={f.dimension} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{f.dimension} {f.op} {f.values?.join(", ")}</span>)}
          </div>
          {dropped.length > 0 && (
            <p className="text-xs text-gray-500">Cards show a single value, so {dropped.join(", ")} {dropped.length > 1 ? "were" : "was"} dropped.</p>
          )}
          <div className="text-3xl font-bold text-gray-900">
            {previewError ? <span className="text-sm text-red-600">{previewError}</span> : preview ? formatCardValue(preview.raw, format) : <Loader2 size={20} className="animate-spin text-gray-300" />}
          </div>
          {preview && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">Compiled SQL</summary>
              <pre className="mt-2 p-3 bg-gray-800 text-gray-100 rounded-lg overflow-x-auto max-h-60">{preview.sql}</pre>
            </details>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-xs font-medium text-gray-600">Card name *
              <input value={name} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-medium text-gray-600">Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-medium text-gray-600">Format
              <select value={format} onChange={(e) => setFormat(e.target.value as CardFormat)} className={`${input} mt-1`}>
                <option value="number">Number (12,847)</option>
                <option value="ratio">Share (0.873 → 87.3%)</option>
                <option value="percent">Percentage (87.3 → 87.3%)</option>
              </select>
            </label>
          </div>

          {saved ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium"><Check size={16} /> Card created! Redirecting to dashboard...</div>
          ) : (
            <button onClick={handleSave} disabled={!name.trim() || !!previewError}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg disabled:opacity-50">
              <Save size={14} /> Create Card
            </button>
          )}
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
