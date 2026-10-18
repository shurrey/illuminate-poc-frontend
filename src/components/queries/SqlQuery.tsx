"use client";

import { useState } from "react";
import { Loader2, Play, RotateCcw, Save, ShieldHalf } from "lucide-react";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { runSql, type SqlResult } from "@/services/sqlApi";
import { sqlRunRequest, type GovernedParts } from "@/lib/savedQuery";
import { summarizeContract } from "@/lib/provenance";
import { ResultView } from "@/components/chat/ResultView";
import { SaveQueryDialog } from "./SaveQueryDialog";
import { SavedNotice } from "./SavedNotice";
import type { SqlSavedQuery } from "@/types/queryBuilder";

/** The query builder's SQL tab. Governed parts come only from an opened saved query and are kept as they are. */
export function SqlQuery({ initial, onViewSaved }: { initial?: SqlSavedQuery; onViewSaved?: () => void }) {
  const { trySaveQuery } = useQueryBuilder();
  const [sql, setSql] = useState(initial?.sql ?? "");
  const [parts, setParts] = useState<GovernedParts>(initial?.governed_parts ?? {});
  const [result, setResult] = useState<SqlResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const partNames = Object.keys(parts);
  const usable = !!sql.trim();

  const run = async () => {
    if (!usable || running) return;
    setRunning(true);
    setRunError(null);
    try {
      setResult(await runSql(sqlRunRequest(sql, parts)));
    } catch (e) {
      setResult(null);
      setRunError(e instanceof Error ? e.message : "The query failed");
    } finally {
      setRunning(false);
    }
  };

  const save = async (name: string, description: string) => {
    setShowSave(false);
    setSaveError(null);
    const now = new Date().toISOString();
    const error = await trySaveQuery({
      id: crypto.randomUUID(), name, description, query_kind: "sql", sql, governed_parts: parts, createdAt: now, lastUsedAt: null,
    });
    if (error) setSaveError(error);
    else setSavedName(name);
  };

  const reset = () => {
    setSql("");
    setParts({});
    setResult(null);
    setRunError(null);
    setSaveError(null);
  };

  return (
    <div className="space-y-6">
      {savedName && <SavedNotice name={savedName} onView={onViewSaved} onDismiss={() => setSavedName(null)} />}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className={partNames.length ? "grid gap-4 lg:grid-cols-3" : ""}>
          <textarea value={sql} rows={12} spellCheck={false} aria-label="SQL"
            onChange={(e) => { setSql(e.target.value); setResult(null); setSaveError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
            placeholder="SELECT ... FROM CDM_LMS.COURSE ..."
            className="w-full lg:col-span-2 px-4 py-3 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-y bg-gray-50" />
          {partNames.length > 0 && (
            <aside className="space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700"><ShieldHalf size={14} className="text-amber-600" /> Governed parts</div>
              <p className="text-gray-500">The SQL reads these by name. They are kept when you save and recompiled for whoever runs the query.</p>
              {partNames.map((name) => (
                <div key={name} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
                  <div className="font-mono text-emerald-800 mb-1">{name}</div>
                  {summarizeContract(parts[name]).map((line) => <div key={line} className="text-gray-600">{line}</div>)}
                </div>
              ))}
            </aside>
          )}
        </div>
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
          <button onClick={run} disabled={!usable || running}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {running ? "Running..." : "Run"}
          </button>
          <button onClick={() => setShowSave(true)} disabled={!usable}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-50"><Save size={14} /> Save</button>
          <span className="text-xs text-gray-400">SQL queries can be saved but not pinned as cards.</span>
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 ml-auto"><RotateCcw size={14} /> Start over</button>
        </div>
      </div>

      {saveError && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Not saved: {saveError}</div>}
      {runError && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{runError}</div>}
      {result && (
        <ResultView title={`${result.rows.length} rows`} data={{ columns: result.columns, rows: result.rows }}
          provenance={result.provenance} truncated={result.truncated} />
      )}

      {showSave && (
        <SaveQueryDialog initialName={initial?.name ?? ""} initialDescription={initial?.description ?? ""}
          onClose={() => setShowSave(false)} onSave={save} />
      )}
    </div>
  );
}
