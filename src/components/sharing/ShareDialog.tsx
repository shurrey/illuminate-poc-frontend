"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Users, X } from "lucide-react";
import { ModalShell } from "@/components/CardModals";
import { useAuth } from "@/context/AuthContext";
import { sessionCheck } from "@/lib/session";
import {
  addRecipient, draftOf, isDirty, isShared, pickable, removeRecipient, searchTerm, setTenant,
  type DirectoryUser, type ItemKind, type ShareDraft,
} from "@/lib/sharing";
import { deleteShare, getShare, putShare, searchDirectory } from "@/services/sharingApi";

const SEARCH_DELAY_MS = 250;
const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Share one of the user's own queries or custom cards; onChanged runs after a save or stop so lists can reload. */
export function ShareDialog({ kind, itemId, itemName, onClose, onChanged }: {
  kind: ItemKind;
  itemId: string;
  itemName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { tenant } = useAuth();
  const [initial, setInitial] = useState<ShareDraft | null>(null);
  const [draft, setDraft] = useState<ShareDraft>({ recipients: [], tenant: false });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestSearch = useRef(0);

  useEffect(() => {
    const live = sessionCheck();
    getShare(kind, itemId)
      .then((view) => {
        if (!live()) return;
        setInitial(draftOf(view));
        setDraft(draftOf(view));
      })
      .catch((e) => { if (live()) setError(message(e, "Could not load who this is shared with")); });
  }, [kind, itemId]);

  useEffect(() => {
    const term = searchTerm(query);
    const ticket = ++latestSearch.current;
    const timer = setTimeout(() => {
      if (!term) {
        setResults([]);
        setSearching(false);
        return;
      }
      const live = sessionCheck();
      setSearching(true);
      searchDirectory(term)
        .then((users) => { if (live() && ticket === latestSearch.current) setResults(users); })
        .catch((e) => { if (live() && ticket === latestSearch.current) setError(message(e, "Search failed")); })
        .finally(() => { if (live() && ticket === latestSearch.current) setSearching(false); });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const finish = async (send: () => Promise<unknown>) => {
    const live = sessionCheck();
    setSaving(true);
    setError(null);
    try {
      await send();
      if (!live()) return;
      onChanged();
      onClose();
    } catch (e) {
      if (live()) setError(message(e, "Could not save sharing"));
    } finally {
      if (live()) setSaving(false);
    }
  };

  const tenantName = tenant?.name ?? "your organization";
  const options = pickable(results, draft);
  const loaded = initial !== null;

  return (
    <ModalShell title={`Share "${itemName}"`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-red-400 hover:text-red-600"><X size={14} /></button>
          </div>
        )}
        {!loaded && !error && <div className="text-xs text-gray-400">Loading who this is shared with...</div>}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={draft.tenant} disabled={!loaded || saving}
            onChange={(e) => setDraft((d) => setTenant(d, e.target.checked))} />
          <Users size={14} className="text-gray-500" />
          <span>Everyone at {tenantName}</span>
        </label>

        <div>
          <label htmlFor="share-search" className="block text-xs font-medium text-gray-600 mb-1">People</label>
          {draft.recipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.recipients.map((r) => (
                <span key={r.sub} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#0066FF]/10 text-[#0066FF] text-xs">
                  {r.name}
                  <button onClick={() => setDraft((d) => removeRecipient(d, r.sub))} disabled={saving}
                    aria-label={`Remove ${r.name}`} className="p-0.5 rounded-full hover:bg-[#0066FF]/20"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input id="share-search" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              disabled={!loaded || saving} placeholder="Search by name or email"
              className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent" />
            {searching && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
          </div>
          {searchTerm(query) && !searching && (
            <ul className="mt-1 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {options.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">No one else matches</li>}
              {options.map((u) => (
                <li key={u.sub}>
                  <button onClick={() => setDraft((d) => addRecipient(d, u))}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50">
                    <div className="text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500">
          People you share with can run it as themselves and save their own copy. They can&apos;t change yours.
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {initial && isShared(initial) ? (
            <button onClick={() => finish(() => deleteShare(kind, itemId))} disabled={saving}
              className="text-red-600 hover:underline disabled:opacity-50">Stop sharing</button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={() => finish(() => putShare(kind, itemId, draft))}
              disabled={!initial || saving || !isDirty(initial, draft)}
              className="px-3 py-1.5 rounded-lg bg-[#0066FF] text-white hover:bg-[#0052cc] disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
