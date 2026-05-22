"use client";

import { useState, useEffect, useRef } from "react";
import { useCardStore } from "@/context/CardStoreContext";
import { type DashboardCard } from "@/data/dashboardCards";
import { executeQuery } from "@/services/dashboardApi";

export interface CardResult {
  card: DashboardCard;
  value: string | null;
  rawValue: number | null;
  rawPrevious: number | null;
  change: number | null;
  loading: boolean;
  error: string | null;
}

function resolveKey(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toLowerCase()] ?? undefined;
}

export function useDashboardCards(): CardResult[] {
  const { enabledCards } = useCardStore();
  const [results, setResults] = useState<CardResult[]>([]);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Sync results array with enabled cards
  useEffect(() => {
    setResults((prev) => {
      const prevMap = new Map(prev.map((r) => [r.card.id, r]));
      return enabledCards.map((card) =>
        prevMap.get(card.id) || { card, value: null, rawValue: null, rawPrevious: null, change: null, loading: true, error: null }
      );
    });
  }, [enabledCards]);

  // Fetch data for any cards that haven't been fetched yet
  useEffect(() => {
    enabledCards.forEach((card, idx) => {
      if (fetchedIdsRef.current.has(card.id)) return;
      fetchedIdsRef.current.add(card.id);

      executeQuery(card.query)
        .then((result) => {
          const row = result.rows?.[0];
          if (!row) {
            setResults((prev) => {
              const next = [...prev];
              const i = next.findIndex((r) => r.card.id === card.id);
              if (i >= 0) next[i] = { ...next[i], value: "—", loading: false };
              return next;
            });
            return;
          }

          const rawValue = resolveKey(row, card.valueKey) ?? Object.values(row)[0];
          const allValues = Object.values(row).map(Number).filter((n) => !isNaN(n));
          const numericValue = rawValue !== null && rawValue !== undefined ? Number(rawValue) : null;
          const previousValue = allValues.length >= 2 ? allValues[1] : null;

          let formatted: string;
          if (rawValue === null || rawValue === undefined) {
            formatted = "—";
          } else if (card.format === "percent") {
            formatted = `${Number(rawValue).toFixed(1)}%`;
          } else if (card.format === "number") {
            formatted = Number(rawValue).toLocaleString();
          } else {
            formatted = String(rawValue);
          }

          let change: number | null = null;
          if (card.changeKey) {
            const rawChange = resolveKey(row, card.changeKey);
            if (rawChange !== null && rawChange !== undefined) {
              change = Number(rawChange);
            }
          }

          setResults((prev) => {
            const next = [...prev];
            const i = next.findIndex((r) => r.card.id === card.id);
            if (i >= 0) next[i] = { ...next[i], value: formatted, rawValue: numericValue, rawPrevious: previousValue, change, loading: false };
            return next;
          });
        })
        .catch((err) => {
          setResults((prev) => {
            const next = [...prev];
            const i = next.findIndex((r) => r.card.id === card.id);
            if (i >= 0) next[i] = { ...next[i], loading: false, error: err instanceof Error ? err.message : "Failed" };
            return next;
          });
        });
    });
  }, [enabledCards]);

  return results;
}
