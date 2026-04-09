"use client";

import { useState, useEffect, useRef } from "react";
import { dashboardCards, type DashboardCard } from "@/data/dashboardCards";
import { executeQuery } from "@/services/dashboardApi";

export interface CardResult {
  card: DashboardCard;
  value: string | null;
  rawValue: number | null;
  rawPrevious: number | null;
  change: number | null;   // percentage change or absolute diff
  loading: boolean;
  error: string | null;
}

function resolveKey(row: Record<string, unknown>, key: string): unknown {
  // Try exact, then lowercase, then first value
  return row[key] ?? row[key.toLowerCase()] ?? undefined;
}

export function useDashboardCards(): CardResult[] {
  const [results, setResults] = useState<CardResult[]>(
    dashboardCards.map((card) => ({ card, value: null, rawValue: null, rawPrevious: null, change: null, loading: true, error: null }))
  );
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    dashboardCards.forEach((card, idx) => {
      executeQuery(card.query)
        .then((result) => {
          const row = result.rows?.[0];
          if (!row) {
            setResults((prev) => { const next = [...prev]; next[idx] = { ...next[idx], value: "—", loading: false }; return next; });
            return;
          }

          // Resolve value — also grab the "previous" column (second column typically)
          const rawValue = resolveKey(row, card.valueKey) ?? Object.values(row)[0];
          const allValues = Object.values(row).map(Number).filter((n) => !isNaN(n));
          const numericValue = rawValue !== null && rawValue !== undefined ? Number(rawValue) : null;
          // Previous is typically the second numeric column
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

          // Resolve change
          let change: number | null = null;
          if (card.changeKey) {
            const rawChange = resolveKey(row, card.changeKey);
            if (rawChange !== null && rawChange !== undefined) {
              change = Number(rawChange);
            }
          }

          setResults((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], value: formatted, rawValue: numericValue, rawPrevious: previousValue, change, loading: false };
            return next;
          });
        })
        .catch((err) => {
          setResults((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], loading: false, error: err instanceof Error ? err.message : "Failed" };
            return next;
          });
        });
    });
  }, []);

  return results;
}
