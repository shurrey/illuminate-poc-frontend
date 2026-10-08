"use client";

import { useEffect, useRef, useState } from "react";
import { useCardStore } from "@/context/CardStoreContext";
import { type DashboardCard, formatCardValue, valueColumn } from "@/data/dashboardCards";
import { querySemantic } from "@/services/semanticApi";
import type { Provenance } from "@/types/semantic";

export interface CardResult {
  card: DashboardCard;
  value: string | null;
  sql: string | null;
  provenance: Provenance | null;
  loading: boolean;
  error: string | null;
}

const pending = (card: DashboardCard): CardResult => ({ card, value: null, sql: null, provenance: null, loading: true, error: null });

/** Runs each enabled card's contract once, keyed by card id. */
export function useDashboardCards(): CardResult[] {
  const { enabledCards } = useCardStore();
  const [results, setResults] = useState<Record<string, CardResult>>({});
  const started = useRef<Set<string>>(new Set());

  useEffect(() => {
    const update = (id: string, patch: Partial<CardResult>) =>
      setResults((prev) => ({ ...prev, [id]: { ...(prev[id] ?? pending(patch.card!)), ...patch } }));

    for (const card of enabledCards) {
      if (started.current.has(card.id)) continue;
      started.current.add(card.id);
      querySemantic(card.contract)
        .then((r) => {
          const column = valueColumn(card.contract);
          const row = r.rows[0];
          const raw = row && column ? row[column] : undefined;
          update(card.id, { card, value: formatCardValue(raw, card.format), sql: r.sql, provenance: r.provenance, loading: false });
        })
        .catch((e) => update(card.id, { card, loading: false, error: e instanceof Error ? e.message : "Failed" }));
    }
  }, [enabledCards]);

  return enabledCards.map((card) => ({ ...(results[card.id] ?? pending(card)), card }));
}
