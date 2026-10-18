"use client";

import { apiCall, json, type CardsView } from "./profileApi";
import type { DashboardCard } from "@/data/dashboardCards";
import type { SavedQuery } from "@/types/queryBuilder";
import type { SqlResult } from "./sqlApi";
import type { DirectoryUser, ItemKind, ShareDraft, ShareView } from "@/lib/sharing";
import { shareRequestBody } from "@/lib/sharing";
import type { QueryContract, SemanticResult } from "@/types/semantic";
import type { GovernedParts } from "@/lib/savedQuery";

const plural = (kind: ItemKind) => (kind === "query" ? "queries" : "cards");
const sharePath = (kind: ItemKind, itemId: string) => `/me/${plural(kind)}/${encodeURIComponent(itemId)}/share`;
const sharedPath = (shareId: string, rest = "") => `/shared/${encodeURIComponent(shareId)}${rest}`;

/** Other people in the caller's tenant whose name or email contains q; at most 25. */
export const searchDirectory = async (q: string) =>
  (await apiCall<{ users: DirectoryUser[] }>(`/directory?q=${encodeURIComponent(q)}`)).users;

export const getShare = (kind: ItemKind, itemId: string) => apiCall<ShareView>(sharePath(kind, itemId));
export const putShare = (kind: ItemKind, itemId: string, draft: ShareDraft) =>
  apiCall<ShareView>(sharePath(kind, itemId), json("PUT", shareRequestBody(draft)));
export const deleteShare = (kind: ItemKind, itemId: string) => apiCall<ShareView>(sharePath(kind, itemId), json("DELETE"));

/** The raw list; read it with sharedEntries. */
export const listSharedWithMe = () => apiCall<unknown>("/shared");

/** The live item. redacted is true when the caller's role hides values; masked values read `…`. */
export interface SharedDetail {
  share_id: string;
  item_kind: ItemKind;
  name?: string;
  label?: string;
  owners_note?: string;
  owner?: { name: string };
  query_kind?: "sql" | "governed";
  governance_hint?: string;
  format?: string;
  redacted: boolean;
  prompt?: string;
  contract?: QueryContract | null;
  sql?: string | null;
  governed_parts?: GovernedParts;
  /** Why the SQL text is absent. */
  note?: string;
  longDescription?: string;
}

export const getSharedItem = (shareId: string) => apiCall<SharedDetail>(sharedPath(shareId));
export const runSharedQuery = (shareId: string) => apiCall<SqlResult>(sharedPath(shareId, "/run"), json("POST"));
export const runSharedCard = (shareId: string) => apiCall<SemanticResult>(sharedPath(shareId, "/run"), json("POST"));
/** Saves a copy to the caller's own profile; rejects with the server's reason when it can't be copied. */
export const copySharedItem = (shareId: string) =>
  apiCall<SavedQuery | DashboardCard>(sharedPath(shareId, "/copy"), json("POST"));

export const pinSharedCard = (shareId: string) => apiCall<CardsView>("/me/cards/pin-shared", json("POST", { share_id: shareId }));
