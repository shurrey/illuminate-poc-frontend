"use client";

import React, { createContext, useContext, useCallback } from "react";
import type { SavedQuery } from "@/types/queryBuilder";
import { useAuth } from "@/context/AuthContext";
import { useProfileStore } from "@/hooks/useProfileStore";
import { ProfileStore } from "@/lib/profileStore";
import * as api from "@/services/profileApi";

interface QueryBuilderContextType {
  queries: SavedQuery[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<boolean>;
  /** Creates the query, or updates it when its id is already saved; resolves false when the server refused it. */
  saveQuery: (q: SavedQuery) => Promise<boolean>;
  updateQuery: (id: string, updates: Partial<SavedQuery>) => Promise<boolean>;
  deleteQuery: (id: string) => Promise<boolean>;
  getQuery: (id: string) => SavedQuery | undefined;
}

const QueryBuilderContext = createContext<QueryBuilderContextType | undefined>(undefined);

function createStore() {
  return new ProfileStore<SavedQuery[]>([], async () => (await api.getQueries()).queries, api.isConflict);
}

const replace = (queries: SavedQuery[], id: string, saved: SavedQuery) => queries.map((q) => (q.id === id ? saved : q));

export function QueryBuilderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [store, { value: queries, loading, loaded, error }] = useProfileStore(createStore, user?.id ?? null);

  const updateQuery = useCallback((id: string, updates: Partial<SavedQuery>) => store.mutate({
    apply: (s) => s.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    send: (next) => {
      const query = next.find((q) => q.id === id);
      if (!query) throw new Error("Query not found");
      return api.updateQuery(query);
    },
    merge: (base, saved) => replace(base, id, saved),
  }), [store]);

  const saveQuery = useCallback((q: SavedQuery) => {
    if (store.snapshot().value.some((p) => p.id === q.id)) return updateQuery(q.id, q);
    return store.mutate({
      apply: (s) => [q, ...s],
      send: () => api.createQuery(q),
      merge: (base, saved) => [saved, ...base],
    });
  }, [store, updateQuery]);

  const deleteQuery = useCallback((id: string) => store.mutate({
    apply: (s) => s.filter((q) => q.id !== id),
    send: () => api.deleteQuery(id),
    merge: (base) => base.filter((q) => q.id !== id),
  }), [store]);

  const getQuery = useCallback((id: string) => queries.find((q) => q.id === id), [queries]);
  const clearError = useCallback(() => store.clearError(), [store]);
  const reload = useCallback(() => store.load(), [store]);

  return (
    <QueryBuilderContext.Provider
      value={{ queries, loading, loaded, error, clearError, reload, saveQuery, updateQuery, deleteQuery, getQuery }}
    >
      {children}
    </QueryBuilderContext.Provider>
  );
}

export function useQueryBuilder() {
  const ctx = useContext(QueryBuilderContext);
  if (!ctx) throw new Error("useQueryBuilder must be used within QueryBuilderProvider");
  return ctx;
}
