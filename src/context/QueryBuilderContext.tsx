"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SavedQuery } from "@/types/queryBuilder";

interface QueryBuilderContextType {
  queries: SavedQuery[];
  saveQuery: (q: SavedQuery) => void;
  updateQuery: (id: string, updates: Partial<SavedQuery>) => void;
  deleteQuery: (id: string) => void;
  getQuery: (id: string) => SavedQuery | undefined;
}

const QueryBuilderContext = createContext<QueryBuilderContextType | undefined>(undefined);

const STORAGE_KEY = "illuminate-queries";

export function QueryBuilderProvider({ children }: { children: React.ReactNode }) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setQueries(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
  }, [queries, hydrated]);

  const saveQuery = useCallback((q: SavedQuery) => {
    setQueries((prev) => [q, ...prev.filter((p) => p.id !== q.id)]);
  }, []);

  const updateQuery = useCallback((id: string, updates: Partial<SavedQuery>) => {
    setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }, []);

  const deleteQuery = useCallback((id: string) => {
    setQueries((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const getQuery = useCallback((id: string) => queries.find((q) => q.id === id), [queries]);

  return (
    <QueryBuilderContext.Provider value={{ queries, saveQuery, updateQuery, deleteQuery, getQuery }}>
      {children}
    </QueryBuilderContext.Provider>
  );
}

export function useQueryBuilder() {
  const ctx = useContext(QueryBuilderContext);
  if (!ctx) throw new Error("useQueryBuilder must be used within QueryBuilderProvider");
  return ctx;
}
