"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { isSqlQuery, type SavedQuery } from "@/types/queryBuilder";
import { hintOf } from "@/lib/savedQuery";
import { shareStatus } from "@/lib/sharing";
import { runSavedQuery, type SqlResult } from "@/services/sqlApi";
import { ResultView } from "@/components/chat/ResultView";
import { HintChip } from "@/components/sharing/HintChip";
import { ShareDialog } from "@/components/sharing/ShareDialog";
import { Search, Play, Trash2, Copy, Clock, FileCode, FolderOpen, Loader2, Share2, Users, X } from "lucide-react";

interface MyQueriesProps {
  onLoadQuery: (query: SavedQuery) => void;
}

type Run = { running: true } | { result: SqlResult } | { error: string };

const searchText = (q: SavedQuery) => [q.name, q.description, isSqlQuery(q) ? q.sql : q.prompt].join("\n").toLowerCase();

export function MyQueries({ onLoadQuery }: MyQueriesProps) {
  const { queries, loading, loaded, deleteQuery, reload } = useQueryBuilder();
  const { tenant } = useAuth();
  const [search, setSearch] = useState("");
  const [sharing, setSharing] = useState<SavedQuery | null>(null);
  const [runs, setRuns] = useState<Record<string, Run>>({});

  const filtered = queries.filter((q) => !search || searchText(q).includes(search.toLowerCase()));

  const handleCopy = async (q: SavedQuery) => {
    await navigator.clipboard.writeText(isSqlQuery(q) ? q.sql : JSON.stringify(q.contract, null, 2));
  };

  const setRun = (id: string, run: Run | null) => setRuns((r) => {
    const next = { ...r };
    if (run) next[id] = run;
    else delete next[id];
    return next;
  });

  const handleRun = async (q: SavedQuery) => {
    setRun(q.id, { running: true });
    try {
      setRun(q.id, { result: await runSavedQuery(q.id) });
    } catch (e) {
      setRun(q.id, { error: e instanceof Error ? e.message : "The query failed" });
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading && !loaded) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading your saved queries...</div>;
  }

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileCode size={40} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved queries yet</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Build a query from the catalog, ask a question, write SQL, or import an existing SQL query to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved queries..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        />
      </div>

      {/* Query list */}
      <div className="space-y-2">
        {filtered.map((q) => {
          const hint = hintOf(q);
          const run = runs[q.id];
          const status = shareStatus(q.shared, tenant?.name);
          return (
            <div
              key={q.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0066FF]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{q.name}</h4>
                    <HintChip hint={hint} sql={isSqlQuery(q)} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{q.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={11} />{formatDate(q.lastUsedAt || q.createdAt)}</span>
                    {status && <span className="flex items-center gap-1 text-[#0066FF]"><Users size={11} />{status}</span>}
                    {isSqlQuery(q)
                      ? <span className="truncate max-w-[300px] font-mono">{q.sql}</span>
                      : q.prompt && <span className="truncate max-w-[200px]">Prompt: {q.prompt}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRun(q)}
                    disabled={!!run && "running" in run}
                    className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
                    title="Run"
                  >
                    {run && "running" in run ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => onLoadQuery(q)}
                    className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
                    title={isSqlQuery(q) ? "Open in the SQL tab" : "Open in workbench"}
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={() => handleCopy(q)}
                    className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
                    title={isSqlQuery(q) ? "Copy SQL" : "Copy query contract"}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => setSharing(q)}
                    className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
                    title="Share"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteQuery(q.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {run && !("running" in run) && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-end">
                    <button onClick={() => setRun(q.id, null)} aria-label="Close result" className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  {"error" in run
                    ? <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{run.error}</div>
                    : <ResultView title={`${run.result.rows.length} rows`} data={{ columns: run.result.columns, rows: run.result.rows }}
                        provenance={run.result.provenance} truncated={run.result.truncated}
                        query={isSqlQuery(q) ? undefined : q.contract} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {sharing && (
        <ShareDialog kind="query" itemId={sharing.id} itemName={sharing.name}
          onClose={() => setSharing(null)} onChanged={() => void reload()} />
      )}
    </div>
  );
}
