import { sessionCheck } from "./session";
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

const isUnimportedUserKey = (key: string) =>
  [CARDS_KEY, QUERIES_KEY].some((base) => key.startsWith(`${base}:`) && key.length > base.length + 1);

/**
 * Removes every `illuminate-` key except each user's unimported cards and queries, which stay until that
 * user's import succeeds; only the matching signed-in user ever reads them. `illuminate_auth` belongs to authService.
 */
export function clearAppStorage(storage: KeyStorage = localStorage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith("illuminate-") && !isUnimportedUserKey(key)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {}
}

/** partial: the server saved some items but not all, and will take the rest on a later import. */
export type ImportOutcome = "imported" | "already_imported" | "partial" | "nothing" | "failed";

/** Posts what this browser saved for sub; the keys are removed only once the server has every item. */
export async function importLocalProfile(
  sub: string,
  post: (profile: LocalProfile) => Promise<{ status: "imported" | "already_imported" | "partial" }>,
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
    if (status === "partial") return "partial";
    if (status !== "imported" && status !== "already_imported") return "failed";
    clearLocalProfile(sub, storage);
    return status;
  } catch {
    return "failed";
  }
}

type Post = Parameters<typeof importLocalProfile>[1];

interface ImportRunnerOptions {
  retryDelayMs?: number;
  wait?: (ms: number) => Promise<void>;
  storage?: KeyStorage;
}

/**
 * Returns run(sub): imports at most once per session once an attempt settles; a failed or partial import is
 * retried once after retryDelayMs, then left for the next page load. Resolves null when this session already imported for sub.
 */
export function createImportRunner(
  post: Post,
  { retryDelayMs = 5000, wait = (ms) => new Promise((r) => setTimeout(r, ms)), storage }: ImportRunnerOptions = {},
): (sub: string) => Promise<ImportOutcome | null> {
  let settled: { sub: string; live: () => boolean } | null = null;
  let running: { sub: string; live: () => boolean; promise: Promise<ImportOutcome> } | null = null;

  return (sub) => {
    if (settled && settled.sub === sub && settled.live()) return Promise.resolve(null);
    if (running && running.sub === sub && running.live()) return running.promise;
    const live = sessionCheck();
    const attempt = () => importLocalProfile(sub, post, storage);
    const promise = (async () => {
      let outcome = await attempt();
      const unsettled = (o: ImportOutcome) => o === "failed" || o === "partial";
      if (unsettled(outcome) && live()) {
        await wait(retryDelayMs);
        if (live()) outcome = await attempt();
      }
      if (!unsettled(outcome) && live()) settled = { sub, live };
      return outcome;
    })().finally(() => {
      if (running?.promise === promise) running = null;
    });
    running = { sub, live, promise };
    return promise;
  };
}
