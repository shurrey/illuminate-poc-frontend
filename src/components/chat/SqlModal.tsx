"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format as formatSql } from "sql-formatter";
import type { Artifact } from "@/types/chat";
import { summarizeContract } from "@/lib/provenance";
import { X, Copy, Check, ChevronLeft, ChevronRight, Database } from "lucide-react";

export function SqlModal({ artifacts, onClose }: { artifacts: Artifact[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = artifacts[idx];
  const multi = artifacts.length > 1;

  const formatted = useMemo(() => {
    try {
      return formatSql(current.data as string, { language: "snowflake", keywordCase: "upper", indentStyle: "standard" });
    } catch { return current.data as string; }
  }, [current]);

  const executed = useMemo(() => {
    if (!current.executed_sql) return "";
    try {
      return formatSql(current.executed_sql, { language: "snowflake", keywordCase: "upper", indentStyle: "standard" });
    } catch { return current.executed_sql; }
  }, [current]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.data as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (multi && e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    if (multi && e.key === "ArrowRight") setIdx((i) => Math.min(artifacts.length - 1, i + 1));
  }, [onClose, multi, artifacts.length]);

  useEffect(() => { document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onKey]);
  useEffect(() => { setCopied(false); }, [idx]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 rounded-lg"><Database size={16} className="text-[#0066FF]" /></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{current.title || "SQL Query"}</h3>
              {multi && <p className="text-xs text-gray-500">Query {idx + 1} of {artifacts.length}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="relative group">
            <pre className="p-4 rounded-lg bg-gray-800 text-gray-100 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap"><code>{formatted}</code></pre>
            <button onClick={handleCopy} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors">
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy SQL</>}
            </button>
          </div>
          {current.governed_parts && Object.keys(current.governed_parts).length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Governed parts</h4>
              {Object.entries(current.governed_parts).map(([name, contract]) => (
                <div key={name} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                  <div className="font-mono text-xs text-emerald-800">{name}</div>
                  <ul className="mt-1 text-xs text-gray-700 space-y-0.5">
                    {summarizeContract(contract).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {current.executed_sql && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-gray-700 uppercase tracking-wider">Executed SQL</summary>
              <pre className="mt-2 p-4 rounded-lg bg-gray-800 text-gray-100 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap"><code>{executed}</code></pre>
            </details>
          )}
        </div>
        {multi && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
            <div className="flex gap-1.5">{artifacts.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full ${i === idx ? "bg-[#0066FF]" : "bg-gray-300"}`} />)}</div>
            <button onClick={() => setIdx((i) => Math.min(artifacts.length - 1, i + 1))} disabled={idx === artifacts.length - 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-40">Next <ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
