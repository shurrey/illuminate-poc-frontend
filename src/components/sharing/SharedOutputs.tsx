"use client";

import { X } from "lucide-react";
import { ResultView } from "@/components/chat/ResultView";
import type { CopyState, RunState } from "./useSharedItem";

export function SharedRunOutput({ run, title, onClose }: { run: RunState | null; title: string; onClose: () => void }) {
  if (!run || "running" in run) return null;
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-end">
        <button onClick={onClose} aria-label="Close result" className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      {"error" in run
        ? <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{run.error}</div>
        : <ResultView title={run.result.value !== undefined ? `${title}: ${run.result.value}` : `${run.result.rows.length} rows`}
            data={{ columns: run.result.columns, rows: run.result.rows }} provenance={run.result.provenance}
            truncated={run.result.truncated} />}
    </div>
  );
}

export function CopyNotice({ copy, kind }: { copy: CopyState | null; kind: "query" | "card" }) {
  if (!copy || "copying" in copy) return null;
  if ("copied" in copy) {
    return (
      <div role="status" className="mt-2 text-xs text-emerald-700">
        Saved a copy to {kind === "query" ? "My Queries" : "your cards"}.
      </div>
    );
  }
  return <div role="alert" className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{copy.refused}</div>;
}
