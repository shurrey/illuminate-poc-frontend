"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCardValue, type CardFormat } from "@/data/dashboardCards";
import { useCardStore } from "@/context/CardStoreContext";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { sessionCheck } from "@/lib/session";
import { sharedEntries, type ItemKind, type SharedEntry } from "@/lib/sharing";
import { copySharedItem, listSharedWithMe, runSharedCard, runSharedQuery } from "@/services/sharingApi";
import type { Provenance } from "@/types/semantic";

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export interface SharedRunResult {
  columns: string[];
  rows: Record<string, unknown>[];
  provenance?: Provenance;
  truncated?: boolean;
  /** A card's single value, formatted. */
  value?: string;
}

export type RunState = { running: true } | { result: SharedRunResult } | { error: string };
export type CopyState = { copying: true } | { copied: true } | { refused: string };

/** The items of one kind shared with the user; reload re-reads, so an unshared item drops out. */
export function useSharedWithMe(kind: ItemKind) {
  const [entries, setEntries] = useState<SharedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(() => {
    const live = sessionCheck();
    return listSharedWithMe()
      .then((body) => {
        if (!live()) return;
        setEntries(sharedEntries(body, kind));
        setError(null);
      })
      .catch((e) => { if (live()) setError(message(e, "Could not load items shared with you")); })
      .finally(() => { if (live()) setLoading(false); });
  }, [kind]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  const reload = useCallback(() => {
    setLoading(true);
    return fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, error, reload };
}

/** Run and copy for one shared item. A successful copy reloads the user's own queries or cards. */
export function useSharedActions(shareId: string, kind: ItemKind, format?: CardFormat) {
  const [run, setRun] = useState<RunState | null>(null);
  const [copy, setCopy] = useState<CopyState | null>(null);
  const queries = useQueryBuilder();
  const cards = useCardStore();

  const runItem = async () => {
    const live = sessionCheck();
    setRun({ running: true });
    try {
      let result: SharedRunResult;
      if (kind === "card") {
        const r = await runSharedCard(shareId);
        // A card's contract is one metric or measure with no dimensions, so the value is the only column.
        const column = r.columns[0];
        result = { ...r, value: formatCardValue(column === undefined ? undefined : r.rows[0]?.[column], format ?? "number") };
      } else {
        result = await runSharedQuery(shareId);
      }
      if (live()) setRun({ result });
    } catch (e) {
      if (live()) setRun({ error: message(e, "The run failed") });
    }
  };

  const copyItem = async () => {
    const live = sessionCheck();
    setCopy({ copying: true });
    try {
      await copySharedItem(shareId);
      if (!live()) return;
      setCopy({ copied: true });
      void (kind === "card" ? cards.reload() : queries.reload());
    } catch (e) {
      if (live()) setCopy({ refused: message(e, "The copy could not be saved") });
    }
  };

  return { run, clearRun: () => setRun(null), runItem, copy, copyItem };
}
