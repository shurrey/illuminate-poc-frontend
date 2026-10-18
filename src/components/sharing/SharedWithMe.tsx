"use client";

import { useState } from "react";
import { Check, Copy, FolderOpen, Home, Inbox, Loader2, Play } from "lucide-react";
import { useCardStore } from "@/context/CardStoreContext";
import { ownersNoteLine, pinnedShareIds, type ItemKind, type SharedEntry } from "@/lib/sharing";
import { HintChip } from "./HintChip";
import { SharedItemView } from "./SharedItemView";
import { CopyNotice, SharedRunOutput } from "./SharedOutputs";
import { useSharedActions, useSharedWithMe } from "./useSharedItem";

const iconButton = "p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors disabled:opacity-40";

function SharedRow({ entry, onOpen, pinned }: { entry: SharedEntry; onOpen: () => void; pinned?: boolean }) {
  const { run, clearRun, runItem, copy, copyItem } = useSharedActions(entry.shareId, entry.kind, entry.format);
  const { pinSharedCard, loading } = useCardStore();
  const note = ownersNoteLine(entry.note);
  const running = !!run && "running" in run;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{entry.title}</h4>
            <HintChip hint={entry.hint} sql={entry.isSql} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Shared by {entry.ownerName}</p>
          {note && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{note}</p>}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={runItem} disabled={running} className={iconButton} title="Run">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          </button>
          <button onClick={onOpen} className={iconButton} title="Open">
            <FolderOpen size={14} />
          </button>
          <button onClick={copyItem} disabled={!!copy && "copying" in copy} className={iconButton} title="Make a copy">
            <Copy size={14} />
          </button>
          {entry.kind === "card" && (
            pinned
              ? <span className="p-1.5 text-emerald-600" title="On your home"><Check size={14} /></span>
              : <button onClick={() => pinSharedCard(entry.shareId)} disabled={loading} className={iconButton} title="Add to my home">
                  <Home size={14} />
                </button>
          )}
        </div>
      </div>
      <CopyNotice copy={copy} kind={entry.kind} />
      <SharedRunOutput run={run} title={entry.title} onClose={clearRun} />
    </div>
  );
}

/** Items of one kind that people in the user's organization shared with them. */
export function SharedWithMe({ kind }: { kind: ItemKind }) {
  const { entries, loading, error, reload } = useSharedWithMe(kind);
  const { cards } = useCardStore();
  const [open, setOpen] = useState<SharedEntry | null>(null);
  const pinned = pinnedShareIds(cards);
  const noun = kind === "query" ? "queries" : "cards";

  return (
    <div className="space-y-2">
      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button onClick={() => void reload()} className="text-xs text-[#0066FF] hover:underline">Retry</button>
        </div>
      )}
      {loading && entries.length === 0 && <div className="text-xs text-gray-400">Loading {noun} shared with you...</div>}
      {!loading && !error && entries.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
          <Inbox size={14} /> No one has shared any {noun} with you yet.
        </div>
      )}
      {entries.map((e) => (
        <SharedRow key={e.shareId} entry={e} onOpen={() => setOpen(e)} pinned={pinned.has(e.shareId)} />
      ))}
      {open && <SharedItemView entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
