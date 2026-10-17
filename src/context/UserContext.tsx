"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfileStore } from "@/hooks/useProfileStore";
import { ProfileStore, addRecent, markRead, toggleFavorite as toggledFavorite } from "@/lib/profileStore";
import * as api from "@/services/profileApi";

interface UserContextType {
  favorites: string[];
  toggleFavorite: (reportId: string) => void;
  recentReports: string[];
  addRecentReport: (reportId: string) => void;
  readNotifications: string[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  visibleWidgets: string[];
  setVisibleWidgets: (widgets: string[]) => void;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const DEFAULTS: api.PrefsView = {
  favorites: [], recentReports: [], readNotifications: [], visibleWidgets: ["ai", "kpis", "feed", "quickaccess"], version: 0,
};
// The notification feed is still mock data (components/NotificationCenter.tsx).
const ALL_NOTIFICATION_IDS = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"];

function createStore() {
  return new ProfileStore<api.PrefsView>(DEFAULTS, api.getPrefs, api.isConflict);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [store, { value, loading, loaded, error }] = useProfileStore(createStore, user?.id ?? null);

  const change = useCallback((apply: (p: api.PrefsView) => api.PrefsView) => {
    const current = store.snapshot().value;
    if (JSON.stringify(apply(current)) === JSON.stringify(current)) return;
    void store.mutate({
      apply,
      send: (next) => api.putPrefs(next, next.version),
      merge: (_, view: api.PrefsView) => view,
    });
  }, [store]);

  const toggleFavorite = useCallback((id: string) => change((p) => toggledFavorite(p, id)), [change]);
  const addRecentReport = useCallback((id: string) => change((p) => addRecent(p, id)), [change]);
  const markNotificationRead = useCallback((id: string) => change((p) => markRead(p, [id])), [change]);
  const markAllNotificationsRead = useCallback(() => change((p) => markRead(p, ALL_NOTIFICATION_IDS)), [change]);
  const setVisibleWidgets = useCallback((widgets: string[]) => change((p) => ({ ...p, visibleWidgets: widgets })), [change]);
  const clearError = useCallback(() => store.clearError(), [store]);
  const reload = useCallback(() => store.load(), [store]);

  return (
    <UserContext.Provider
      value={{
        favorites: value.favorites,
        toggleFavorite,
        recentReports: value.recentReports,
        addRecentReport,
        readNotifications: value.readNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        visibleWidgets: value.visibleWidgets,
        setVisibleWidgets,
        loading,
        loaded,
        error,
        clearError,
        reload,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
