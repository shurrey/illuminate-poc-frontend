"use client";

import { authService } from "./authService";
import type { DashboardCard } from "@/data/dashboardCards";
import type { SavedQuery } from "@/types/queryBuilder";
import type { LocalProfile } from "@/lib/profileImport";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

/** hidden: built-in ids the user hid, absent from cards; disabled: ids of cards shown as off. */
export interface CardsView { cards: DashboardCard[]; hidden: string[]; disabled: string[]; version: number }
export interface CardLayout { order: string[]; disabled: string[]; hidden: string[] }
export interface Prefs { favorites: string[]; recentReports: string[]; readNotifications: string[]; visibleWidgets: string[] }
export interface PrefsView extends Prefs { version: number }
export interface ImportResult {
  status: "imported" | "already_imported";
  cards?: number;
  queries?: number;
  skipped?: { kind: string; name: string; reason: string }[];
}

export class ProfileApiError extends Error {
  constructor(message: string, readonly status: number, readonly errors: string[] = []) {
    super(message);
  }
}

export const isConflict = (e: unknown) => e instanceof ProfileApiError && e.status === 409;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await authService.authedFetch(`${API_URL}/api/v1/me${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (resp.ok) return resp.json();
  let detail: unknown = null;
  try {
    detail = (await resp.json()).detail;
  } catch {
    /* non-JSON body */
  }
  if (detail && typeof detail === "object" && "errors" in detail) {
    const errors = (detail as { errors: string[] }).errors;
    throw new ProfileApiError(errors.join("; "), resp.status, errors);
  }
  throw new ProfileApiError(typeof detail === "string" ? detail : `Request failed (${resp.status})`, resp.status);
}

const json = (method: string, body?: unknown): RequestInit =>
  ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

const cardBody = ({ label, description, longDescription, prompt, contract, format, reportLink }: DashboardCard) =>
  ({ label, description, longDescription, prompt, contract, format, ...(reportLink ? { reportLink } : {}) });

const queryBody = ({ name, prompt, description, contract }: SavedQuery) => ({ name, prompt, description, contract });

const id = (value: string) => encodeURIComponent(value);

export const getCards = () => call<CardsView>("/cards");
export const putCardLayout = (layout: CardLayout, expectedVersion: number) =>
  call<CardsView>("/cards/layout", json("PUT", { ...layout, expected_version: expectedVersion }));
export const createCard = (card: DashboardCard) => call<DashboardCard>("/cards", json("POST", cardBody(card)));
export const updateCard = (card: DashboardCard) => call<DashboardCard>(`/cards/${id(card.id)}`, json("PUT", cardBody(card)));
/** Deletes a custom card or hides a built-in. */
export const deleteCard = (cardId: string) => call<CardsView>(`/cards/${id(cardId)}`, json("DELETE"));
export const resetCards = () => call<CardsView>("/cards/reset", json("POST"));

export const getQueries = () => call<{ queries: SavedQuery[] }>("/queries");
export const createQuery = (q: SavedQuery) => call<SavedQuery>("/queries", json("POST", queryBody(q)));
export const updateQuery = (q: SavedQuery) => call<SavedQuery>(`/queries/${id(q.id)}`, json("PUT", queryBody(q)));
export const markQueryUsed = (queryId: string) => call<SavedQuery>(`/queries/${id(queryId)}/used`, json("POST"));
export const deleteQuery = (queryId: string) => call<{ deleted: string }>(`/queries/${id(queryId)}`, json("DELETE"));

export const getPrefs = () => call<PrefsView>("/prefs");
export const putPrefs = ({ favorites, recentReports, readNotifications, visibleWidgets }: Prefs, expectedVersion: number) =>
  call<PrefsView>("/prefs", json("PUT", { favorites, recentReports, readNotifications, visibleWidgets, expected_version: expectedVersion }));

export const importProfile = (profile: LocalProfile) => call<ImportResult>("/import", json("POST", profile));
