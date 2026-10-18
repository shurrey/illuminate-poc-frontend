"use client";

import { useEffect, useState } from "react";
import { Copy, EyeOff, Loader2, Play } from "lucide-react";
import { ModalShell } from "@/components/CardModals";
import { summarizeContract } from "@/lib/provenance";
import { sessionCheck } from "@/lib/session";
import { hiddenForRole, ownersNoteLine, type SharedEntry } from "@/lib/sharing";
import { getSharedItem, type SharedDetail } from "@/services/sharingApi";
import { HintChip } from "./HintChip";
import { CopyNotice, SharedRunOutput } from "./SharedOutputs";
import { useSharedActions } from "./useSharedItem";

/** A read-only view of the live shared item, as the server shows it to this user's role. */
export function SharedItemView({ entry, onClose }: { entry: SharedEntry; onClose: () => void }) {
  const [detail, setDetail] = useState<SharedDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, clearRun, runItem, copy, copyItem } = useSharedActions(entry.shareId, entry.kind, entry.format);

  useEffect(() => {
    const live = sessionCheck();
    getSharedItem(entry.shareId)
      .then((d) => { if (live()) setDetail(d); })
      .catch((e) => { if (live()) setError(e instanceof Error ? e.message : "Could not open this item"); });
  }, [entry.shareId]);

  const note = ownersNoteLine(entry.note);
  const parts = Object.entries(detail?.governed_parts ?? {});

  return (
    <ModalShell title={entry.title} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <HintChip hint={entry.hint} sql={entry.isSql} />
          <span className="text-xs text-gray-500">Shared by {entry.ownerName}</span>
        </div>
        {note && <p className="text-xs text-gray-600">{note}</p>}
        {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">{error}</div>}
        {!detail && !error && <div className="text-xs text-gray-400">Loading...</div>}
        {detail && (
          <>
            {hiddenForRole(detail) && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <EyeOff size={13} /> Some values are hidden for your role
              </div>
            )}
            {detail.prompt && <p className="text-xs text-gray-500">Prompt: {detail.prompt}</p>}
            {detail.query_kind === "sql" ? (
              detail.sql
                ? <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">{detail.sql}</pre>
                : <p className="text-xs text-gray-500">{detail.note ?? "The SQL text is hidden."}</p>
            ) : detail.contract ? (
              <ul className="text-xs text-gray-700 space-y-0.5">
                {summarizeContract(detail.contract).map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : null}
            {parts.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-600">Governed parts</div>
                {parts.map(([name, part]) => (
                  <div key={name} className="text-xs text-gray-700">
                    <span className="font-mono">{name}</span>: {summarizeContract(part).join("; ")}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button onClick={runItem} disabled={!!run && "running" in run}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0066FF] text-white hover:bg-[#0052cc] disabled:opacity-50">
            {run && "running" in run ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run
          </button>
          <button onClick={copyItem} disabled={!!copy && "copying" in copy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Copy size={13} /> Make a copy
          </button>
        </div>
        <CopyNotice copy={copy} kind={entry.kind} />
        <SharedRunOutput run={run} title={entry.title} onClose={clearRun} />
      </div>
    </ModalShell>
  );
}
