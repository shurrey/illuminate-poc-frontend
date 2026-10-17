"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCardStore } from "@/context/CardStoreContext";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { useUser } from "@/context/UserContext";
import { createImportRunner } from "@/lib/profileImport";
import { sessionCheck } from "@/lib/session";
import { importProfile } from "@/services/profileApi";

const runImport = createImportRunner(importProfile);

/** Once all three profile stores have loaded, moves what this browser saved for the user to the server. */
export function ProfileImport() {
  const { user } = useAuth();
  const cards = useCardStore();
  const queries = useQueryBuilder();
  const prefs = useUser();
  const ready = !!user && cards.loaded && queries.loaded && prefs.loaded;
  const { reload: reloadCards } = cards;
  const { reload: reloadQueries } = queries;
  const { reload: reloadPrefs } = prefs;

  useEffect(() => {
    if (!ready || !user) return;
    const live = sessionCheck();
    runImport(user.id).then((outcome) => {
      if (!live() || outcome !== "imported") return;
      reloadCards();
      reloadQueries();
      reloadPrefs();
    });
  }, [ready, user, reloadCards, reloadQueries, reloadPrefs]);

  return null;
}
