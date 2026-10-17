"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { onSessionEnd } from "@/lib/session";
import type { ProfileStore, StoreSnapshot } from "@/lib/profileStore";

/** One store per mount: loads once someone is signed in, and resets when the session ends. */
export function useProfileStore<T>(create: () => ProfileStore<T>, userId: string | null): [ProfileStore<T>, StoreSnapshot<T>] {
  const [store] = useState(create);
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  useEffect(() => onSessionEnd(store.reset), [store]);
  useEffect(() => {
    if (userId) store.load();
  }, [store, userId]);
  return [store, snapshot];
}
