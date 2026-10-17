import { userStorageKey } from "./userStorage";

type KeyStorage = Pick<Storage, "getItem" | "removeItem" | "key" | "length">;

const CARDS_KEY = "illuminate-dashboard-cards-v2";
const QUERIES_KEY = "illuminate-queries-v2";
const PREFS_KEY = "illuminate-user";
const PREF_LISTS = ["favorites", "recentReports", "readNotifications", "visibleWidgets"] as const;

export interface LocalProfile {
  cards: unknown[];
  queries: unknown[];
  prefs: Partial<Record<(typeof PREF_LISTS)[number], string[]>> | null;
}

function parse(raw: string | null): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function prefsOf(value: unknown): LocalProfile["prefs"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prefs: NonNullable<LocalProfile["prefs"]> = {};
  for (const field of PREF_LISTS) {
    const list = (value as Record<string, unknown>)[field];
    if (Array.isArray(list)) prefs[field] = list.filter((i): i is string => typeof i === "string");
  }
  return Object.keys(prefs).length ? prefs : null;
}

/** What this browser saved for sub before profiles moved to the server; null when there is nothing to import. */
export function collectLocalProfile(sub: string, storage: KeyStorage = localStorage): LocalProfile | null {
  try {
    const list = (base: string) => {
      const value = parse(storage.getItem(userStorageKey(base, sub)!));
      return Array.isArray(value) ? value : [];
    };
    const profile = { cards: list(CARDS_KEY), queries: list(QUERIES_KEY), prefs: prefsOf(parse(storage.getItem(PREFS_KEY))) };
    return profile.cards.length || profile.queries.length || profile.prefs ? profile : null;
  } catch {
    return null;
  }
}

/** Removes the keys collectLocalProfile reads. */
export function clearLocalProfile(sub: string, storage: KeyStorage = localStorage): void {
  for (const key of [userStorageKey(CARDS_KEY, sub)!, userStorageKey(QUERIES_KEY, sub)!, PREFS_KEY]) {
    try { storage.removeItem(key); } catch {}
  }
}

/** The pre-per-user keys are never imported: nothing records which user, or which tenant, wrote them. */
export function dropUnownedProfileKeys(storage: KeyStorage = localStorage): void {
  for (const key of [CARDS_KEY, QUERIES_KEY]) {
    try { storage.removeItem(key); } catch {}
  }
}

/** Removes every `illuminate-` key; `illuminate_auth` (underscore) belongs to authService. */
export function clearAppStorage(storage: KeyStorage = localStorage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith("illuminate-")) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {}
}

export type ImportOutcome = "imported" | "already_imported" | "nothing" | "failed";

/** Posts what this browser saved for sub; the keys are removed only once the server has the items. */
export async function importLocalProfile(
  sub: string,
  post: (profile: LocalProfile) => Promise<{ status: "imported" | "already_imported" }>,
  storage: KeyStorage = localStorage,
): Promise<ImportOutcome> {
  dropUnownedProfileKeys(storage);
  const profile = collectLocalProfile(sub, storage);
  if (!profile) {
    clearLocalProfile(sub, storage);
    return "nothing";
  }
  try {
    const { status } = await post(profile);
    if (status !== "imported" && status !== "already_imported") return "failed";
    clearLocalProfile(sub, storage);
    return status;
  } catch {
    return "failed";
  }
}
