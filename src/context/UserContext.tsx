"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentReports, setRecentReports] = useState<string[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(["ai", "kpis", "feed", "quickaccess"]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("illuminate-user");
    if (stored) {
      const data = JSON.parse(stored);
      if (data.favorites) setFavorites(data.favorites);
      if (data.recentReports) setRecentReports(data.recentReports);
      if (data.readNotifications) setReadNotifications(data.readNotifications);
      if (data.visibleWidgets) setVisibleWidgets(data.visibleWidgets);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "illuminate-user",
      JSON.stringify({ favorites, recentReports, readNotifications, visibleWidgets })
    );
  }, [favorites, recentReports, readNotifications, visibleWidgets, hydrated]);

  const toggleFavorite = useCallback((reportId: string) => {
    setFavorites((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  }, []);

  const addRecentReport = useCallback((reportId: string) => {
    setRecentReports((prev) => {
      const filtered = prev.filter((id) => id !== reportId);
      return [reportId, ...filtered].slice(0, 5);
    });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotifications((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setReadNotifications((prev) => {
      const allIds = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"];
      return [...new Set([...prev, ...allIds])];
    });
  }, []);

  return (
    <UserContext.Provider
      value={{
        favorites,
        toggleFavorite,
        recentReports,
        addRecentReport,
        readNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        visibleWidgets,
        setVisibleWidgets,
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
