"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCardStore } from "@/context/CardStoreContext";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { useUser } from "@/context/UserContext";
import { importLocalProfile } from "@/lib/profileImport";
import { sessionCheck } from "@/lib/session";
import { importProfile } from "@/services/profileApi";

/** Once all three profile stores have loaded, moves what this browser saved for the user to the server. */
export function ProfileImport() {
  const { user } = useAuth();
  const cards = useCardStore();
  const queries = useQueryBuilder();
  const prefs = useUser();
  const started = useRef(false);
  const ready = !!user && cards.loaded && queries.loaded && prefs.loaded;
  const { reload: reloadCards } = cards;
  const { reload: reloadQueries } = queries;
  const { reload: reloadPrefs } = prefs;

  useEffect(() => {
    if (!ready || !user || started.current) return;
    started.current = true;
    const live = sessionCheck();
    importLocalProfile(user.id, importProfile).then((outcome) => {
      if (!live() || outcome !== "imported") return;
      reloadCards();
      reloadQueries();
      reloadPrefs();
    });
  }, [ready, user, reloadCards, reloadQueries, reloadPrefs]);

  return null;
}
