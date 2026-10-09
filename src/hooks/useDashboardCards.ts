"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  retry: () => void;
}

type Loaded = Omit<CardResult, "card" | "retry">;

const PENDING: Loaded = { value: null, sql: null, provenance: null, loading: true, error: null };

/** A card's identity for fetching: a changed contract under the same id is a new query. */
const keyOf = (card: DashboardCard) => `${card.id}:${JSON.stringify(card.contract)}`;

/** Runs each enabled card's contract once per contract; failed cards can be retried. */
export function useDashboardCards(): CardResult[] {
  const { enabledCards } = useCardStore();
  const [results, setResults] = useState<Record<string, Loaded>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const started = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const card of enabledCards) {
      const key = keyOf(card);
      if (started.current.has(key)) continue;
      started.current.add(key);
      setResults((prev) => ({ ...prev, [key]: PENDING }));
      querySemantic(card.contract)
        .then((r) => {
          const column = valueColumn(card.contract);
          const raw = column ? r.rows[0]?.[column] : undefined;
          setResults((prev) => ({ ...prev, [key]: { value: formatCardValue(raw, card.format), sql: r.sql, provenance: r.provenance, loading: false, error: null } }));
        })
        .catch((e) => {
          started.current.delete(key);
          setResults((prev) => ({ ...prev, [key]: { ...PENDING, loading: false, error: e instanceof Error ? e.message : "Failed" } }));
        });
    }
  }, [enabledCards, attempts]);

  const retry = useCallback((key: string) => setAttempts((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 })), []);

  return enabledCards.map((card) => {
    const key = keyOf(card);
    return { card, ...(results[key] ?? PENDING), retry: () => retry(key) };
  });
}
