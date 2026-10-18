"use client";

import React, { createContext, useContext, useCallback, useMemo } from "react";
import { fallbackCards, type DashboardCard } from "@/data/dashboardCards";
import { useAuth } from "@/context/AuthContext";
import { useProfileStore } from "@/hooks/useProfileStore";
import { ProfileStore, createThenReload, layoutOf, moved, toggled } from "@/lib/profileStore";
import * as api from "@/services/profileApi";
import { pinSharedCard as pinShared } from "@/services/sharingApi";

interface CardStoreContextType {
  cards: DashboardCard[];
  enabledCards: DashboardCard[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<boolean>;
  /** Resolves false when the server refused the card; the error is in `error`. */
  addCard: (card: DashboardCard) => Promise<boolean>;
  updateCard: (id: string, updates: Partial<DashboardCard>) => Promise<boolean>;
  removeCard: (id: string) => Promise<boolean>;
  toggleCard: (id: string) => Promise<boolean>;
  moveCard: (id: string, direction: "up" | "down") => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  /** Adds a card shared with the user to their home page; removeCard takes it off again. */
  pinSharedCard: (shareId: string) => Promise<boolean>;
}

const CardStoreContext = createContext<CardStoreContextType | undefined>(undefined);

const LOADING: api.CardsView = {
  cards: fallbackCards.map((c) => ({ ...c, isBuiltIn: true, enabled: true })), hidden: [], disabled: [], version: 0,
};
const takeView = (_: api.CardsView, view: api.CardsView) => view;

function createStore() {
  return new ProfileStore<api.CardsView>(LOADING, api.getCards, api.isConflict);
}

export function CardStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [store, { value, loading, loaded, error }] = useProfileStore(createStore, user?.id ?? null);
  const cards = useMemo(() => (loaded ? value.cards : loading ? LOADING.cards : []), [value, loaded, loading]);
  const enabledCards = useMemo(() => (loaded ? cards.filter((c) => c.enabled !== false) : []), [cards, loaded]);

  const relayout = useCallback((change: (cards: DashboardCard[]) => DashboardCard[]) => store.mutate({
    apply: (s) => ({ ...s, cards: change(s.cards) }),
    send: (next) => api.putCardLayout(layoutOf(next.cards, next.hidden), next.version),
    merge: takeView,
  }), [store]);

  // Creating a card also appends it to the layout, which bumps the layout version: re-read both.
  const addCard = useCallback((card: DashboardCard) => store.mutate(createThenReload<api.CardsView, DashboardCard>(
    (s) => ({ ...s, cards: [...s.cards, { ...card, isBuiltIn: false, enabled: true }] }),
    () => api.createCard(card),
    api.getCards,
    (s, created) => ({ ...s, cards: [...s.cards, created] }),
  )), [store]);

  const updateCard = useCallback((id: string, updates: Partial<DashboardCard>) => store.mutate({
    apply: (s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)) }),
    send: (next) => {
      const card = next.cards.find((c) => c.id === id);
      if (!card) throw new Error("Card not found");
      return api.updateCard(card);
    },
    merge: (base, saved) => ({ ...base, cards: base.cards.map((c) => (c.id === id ? { ...saved, enabled: c.enabled } : c)) }),
  }), [store]);

  const removeCard = useCallback((id: string) => store.mutate({
    apply: (s) => {
      const builtIn = s.cards.some((c) => c.id === id && c.isBuiltIn);
      return { ...s, cards: s.cards.filter((c) => c.id !== id), hidden: builtIn ? [...s.hidden, id] : s.hidden };
    },
    send: () => api.deleteCard(id),
    merge: takeView,
  }), [store]);

  const toggleCard = useCallback((id: string) => relayout((cs) => toggled(cs, id)), [relayout]);
  const moveCard = useCallback((id: string, direction: "up" | "down") => relayout((cs) => moved(cs, id, direction)), [relayout]);

  const resetToDefaults = useCallback(() => store.mutate({
    apply: (s) => {
      const builtIns = s.cards.filter((c) => c.isBuiltIn).map((c) => ({ ...c, enabled: true }));
      return { ...s, cards: [...builtIns, ...s.cards.filter((c) => !c.isBuiltIn)], hidden: [] };
    },
    send: api.resetCards,
    merge: takeView,
  }), [store]);

  const pinSharedCard = useCallback((shareId: string) => store.mutate({
    apply: (s) => s,
    send: () => pinShared(shareId),
    merge: takeView,
  }), [store]);

  const clearError = useCallback(() => store.clearError(), [store]);
  const reload = useCallback(() => store.load(), [store]);

  return (
    <CardStoreContext.Provider
      value={{
        cards, enabledCards, loading, loaded, error, clearError, reload,
        addCard, updateCard, removeCard, toggleCard, moveCard, resetToDefaults, pinSharedCard,
      }}
    >
      {children}
    </CardStoreContext.Provider>
  );
}

export function useCardStore() {
  const ctx = useContext(CardStoreContext);
  if (!ctx) throw new Error("useCardStore must be used within CardStoreProvider");
  return ctx;
}
