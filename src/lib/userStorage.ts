"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

/** The localStorage key for one user's copy of a store, or null when no one is signed in. */
export function userStorageKey(base: string, userId: string | null): string | null {
  return userId ? `${base}:${userId}` : null;
}

/**
 * State persisted in localStorage per user: each user loads and saves only their own copy.
 * load turns the stored string (null when absent) into the state and must be stable.
 */
export function useUserStoredState<T>(
  base: string, userId: string | null, load: (stored: string | null) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<{ key: string | null; value: T }>(() => ({ key: null, value: load(null) }));
  const key = userStorageKey(base, userId);
  const empty = useMemo(() => load(null), [load]);

  useEffect(() => {
    let stored: string | null = null;
    try {
      if (key) stored = localStorage.getItem(key);
    } catch {}
    setState({ key, value: load(stored) });
  }, [key, load]);

  useEffect(() => {
    // Writes only once the state belongs to the current key, so one user's state never lands in another's.
    if (!state.key || state.key !== key) return;
    try {
      localStorage.setItem(state.key, JSON.stringify(state.value));
    } catch {}
  }, [state, key]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    setState((prev) => ({
      key: prev.key,
      value: typeof update === "function" ? (update as (p: T) => T)(prev.value) : update,
    }));
  }, []);

  return [state.key === key ? state.value : empty, set];
}
