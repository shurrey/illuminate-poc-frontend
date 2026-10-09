"use client";

import { useEffect, useRef, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { agentClient, type ConversationSummary } from "@/services/agentClient";

/** Past conversations, newest first; loads each time it opens. */
export function ChatHistory({ currentId, onOpen }: { currentId: string | null; onOpen: (contextId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    agentClient.listConversations()
      .then((c) => { if (live) { setItems(c); setError(null); } })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load your conversations"));
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { live = false; document.removeEventListener("mousedown", close); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
        <History size={14} /> History
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
          {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}
          {!error && !items && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-300" /></div>}
          {items?.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No earlier conversations.</p>}
          {items?.map((c) => (
            <button key={c.context_id} onClick={() => { setOpen(false); onOpen(c.context_id); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${c.context_id === currentId ? "bg-blue-50" : ""}`}>
              <div className="text-gray-800 truncate">{c.title || "Untitled conversation"}</div>
              <div className="text-[11px] text-gray-400">{new Date(c.updated_at * 1000).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
