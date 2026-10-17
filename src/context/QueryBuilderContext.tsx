"use client";

import React, { createContext, useContext, useCallback } from "react";
import type { SavedQuery } from "@/types/queryBuilder";
import { useAuth } from "@/context/AuthContext";
import { useUserStoredState } from "@/lib/userStorage";

interface QueryBuilderContextType {
  queries: SavedQuery[];
  saveQuery: (q: SavedQuery) => void;
  updateQuery: (id: string, updates: Partial<SavedQuery>) => void;
  deleteQuery: (id: string) => void;
  getQuery: (id: string) => SavedQuery | undefined;
}

const QueryBuilderContext = createContext<QueryBuilderContextType | undefined>(undefined);

// v2: saved queries are contracts; v1 held SQL and is not migrated.
const STORAGE_KEY = "illuminate-queries-v2";

function loadQueries(stored: string | null): SavedQuery[] {
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function QueryBuilderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [queries, setQueries] = useUserStoredState(STORAGE_KEY, user?.id ?? null, loadQueries);

  const saveQuery = useCallback((q: SavedQuery) => {
    setQueries((prev) => [q, ...prev.filter((p) => p.id !== q.id)]);
  }, [setQueries]);

  const updateQuery = useCallback((id: string, updates: Partial<SavedQuery>) => {
    setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }, [setQueries]);

  const deleteQuery = useCallback((id: string) => {
    setQueries((prev) => prev.filter((q) => q.id !== id));
  }, [setQueries]);

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
