"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { dashboardCards as defaultCards, type DashboardCard } from "@/data/dashboardCards";

interface CardStoreContextType {
  cards: DashboardCard[];
  enabledCards: DashboardCard[];
  addCard: (card: DashboardCard) => void;
  updateCard: (id: string, updates: Partial<DashboardCard>) => void;
  removeCard: (id: string) => void;
  toggleCard: (id: string) => void;
  moveCard: (id: string, direction: "up" | "down") => void;
  resetToDefaults: () => void;
}

const CardStoreContext = createContext<CardStoreContextType | undefined>(undefined);

const STORAGE_KEY = "illuminate-dashboard-cards";

function seedDefaults(): DashboardCard[] {
  return defaultCards.map((c) => ({ ...c, isBuiltIn: true, enabled: true }));
}

export function CardStoreProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardCard[];
        // Merge: keep stored state but add any new built-in cards that aren't in storage yet
        const storedIds = new Set(parsed.map((c) => c.id));
        const newDefaults = defaultCards
          .filter((c) => !storedIds.has(c.id))
          .map((c) => ({ ...c, isBuiltIn: true, enabled: true }));
        setCards([...parsed, ...newDefaults]);
      } else {
        setCards(seedDefaults());
      }
    } catch {
      setCards(seedDefaults());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards, hydrated]);

  const enabledCards = cards.filter((c) => c.enabled !== false);

  const addCard = useCallback((card: DashboardCard) => {
    setCards((prev) => [...prev, { ...card, enabled: true }]);
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<DashboardCard>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleCard = useCallback((id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: c.enabled === false ? true : false } : c))
    );
  }, []);

  const moveCard = useCallback((id: string, direction: "up" | "down") => {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    // Keep user-created cards but reset built-in cards
    setCards((prev) => {
      const userCards = prev.filter((c) => !c.isBuiltIn);
      return [...seedDefaults(), ...userCards];
    });
  }, []);

  return (
    <CardStoreContext.Provider
      value={{ cards, enabledCards, addCard, updateCard, removeCard, toggleCard, moveCard, resetToDefaults }}
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
