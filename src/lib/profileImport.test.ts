import { describe, expect, it, vi } from "vitest";
import {
  clearAppStorage, clearLocalProfile, collectLocalProfile, createImportRunner, dropUnownedProfileKeys, importLocalProfile,
} from "./profileImport";
import { endSession } from "./session";

function memoryStorage(entries: Record<string, string> = {}) {
  const store = new Map(Object.entries(entries));
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

const card = { id: "custom-1", label: "Mine", isBuiltIn: false, enabled: true };
const query = { id: "q1", name: "Saved", prompt: "", description: "", contract: { metrics: ["m"] } };
const prefs = { favorites: ["r1"], recentReports: [], readNotifications: ["n1"], visibleWidgets: ["ai"] };

describe("collectLocalProfile", () => {
  it("reads the signed-in user's keys and the shared preferences", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2:alice": JSON.stringify([card]),
      "illuminate-queries-v2:alice": JSON.stringify([query]),
      "illuminate-user": JSON.stringify(prefs),
    });
    expect(collectLocalProfile("alice", storage)).toEqual({ cards: [card], queries: [query], prefs });
  });

  it("never reads the bare keys, whose owner is unknown", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2": JSON.stringify([card]),
      "illuminate-queries-v2": JSON.stringify([query]),
    });
    expect(collectLocalProfile("alice", storage)).toBeNull();
  });

  it("never reads another user's keys", () => {
    const storage = memoryStorage({ "illuminate-queries-v2:bob": JSON.stringify([query]) });
    expect(collectLocalProfile("alice", storage)).toBeNull();
  });

  it("treats unreadable or non-list values as empty", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2:alice": "{not json",
      "illuminate-queries-v2:alice": JSON.stringify({ not: "a list" }),
      "illuminate-user": "[]",
    });
    expect(collectLocalProfile("alice", storage)).toBeNull();
  });

  it("sends only the known preference lists", () => {
    const storage = memoryStorage({ "illuminate-user": JSON.stringify({ favorites: ["r1"], other: 1, visibleWidgets: "ai" }) });
    expect(collectLocalProfile("alice", storage)).toEqual({ cards: [], queries: [], prefs: { favorites: ["r1"] } });
  });

  it("returns null when the storage cannot be read", () => {
    const storage = { ...memoryStorage(), getItem: () => { throw new Error("blocked"); } };
    expect(collectLocalProfile("alice", storage)).toBeNull();
  });
});

describe("clearLocalProfile", () => {
  it("removes the user's keys and the shared preferences, and nothing else", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2:alice": "[]",
      "illuminate-queries-v2:alice": "[]",
      "illuminate-user": "{}",
      "illuminate-queries-v2:bob": "[]",
      illuminate_auth: "{}",
    });
    clearLocalProfile("alice", storage);
    expect([...storage.store.keys()].sort()).toEqual(["illuminate-queries-v2:bob", "illuminate_auth"]);
  });
});

describe("dropUnownedProfileKeys", () => {
  it("deletes the bare keys without touching per-user ones", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2": "[]",
      "illuminate-queries-v2": "[]",
      "illuminate-queries-v2:alice": "[]",
    });
    dropUnownedProfileKeys(storage);
    expect([...storage.store.keys()]).toEqual(["illuminate-queries-v2:alice"]);
  });
});

describe("clearAppStorage", () => {
  it("removes illuminate- keys but keeps per-user legacy cards and queries, the auth state and other apps' keys", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2:alice": "[]",
      "illuminate-queries-v2:bob": "[]",
      "illuminate-queries-v2": "[]",
      "illuminate-dashboard-cards-v2": "[]",
      "illuminate-user": "{}",
      "illuminate-sidebar": "open",
      illuminate_auth: "{}",
      "CognitoIdentityServiceProvider.x": "t",
    });
    clearAppStorage(storage);
    expect([...storage.store.keys()].sort()).toEqual([
      "CognitoIdentityServiceProvider.x", "illuminate-dashboard-cards-v2:alice", "illuminate-queries-v2:bob", "illuminate_auth",
    ]);
  });
});

describe("importLocalProfile", () => {
  const saved = () => memoryStorage({
    "illuminate-dashboard-cards-v2": "[]",
    "illuminate-queries-v2:alice": JSON.stringify([query]),
    "illuminate-user": JSON.stringify(prefs),
  });

  it("posts the user's items once and clears them after the import", async () => {
    const storage = saved();
    const post = vi.fn().mockResolvedValue({ status: "imported", cards: 0, queries: 1, skipped: [] });
    expect(await importLocalProfile("alice", post, storage)).toBe("imported");
    expect(post).toHaveBeenCalledWith({ cards: [], queries: [query], prefs });
    expect(storage.store.size).toBe(0);
  });

  it("clears them when the server already imported", async () => {
    const storage = saved();
    expect(await importLocalProfile("alice", async () => ({ status: "already_imported" as const }), storage)).toBe("already_imported");
    expect(storage.store.size).toBe(0);
  });

  it("keeps them when the import fails, but still drops the bare keys", async () => {
    const storage = saved();
    expect(await importLocalProfile("alice", async () => { throw new Error("down"); }, storage)).toBe("failed");
    expect([...storage.store.keys()].sort()).toEqual(["illuminate-queries-v2:alice", "illuminate-user"]);
  });

  it("keeps the keys when the server imported only part of them", async () => {
    const storage = saved();
    const post = vi.fn().mockResolvedValue({ status: "partial", cards: 0, queries: 0, skipped: [] });
    expect(await importLocalProfile("alice", post, storage)).toBe("partial");
    expect([...storage.store.keys()].sort()).toEqual(["illuminate-queries-v2:alice", "illuminate-user"]);
  });

  it("a failed import keeps the keys through sign-out, and a later run imports them", async () => {
    const storage = saved();
    expect(await importLocalProfile("alice", async () => { throw new Error("down"); }, storage)).toBe("failed");
    clearAppStorage(storage);
    const post = vi.fn().mockResolvedValue({ status: "imported" });
    expect(await importLocalProfile("alice", post, storage)).toBe("imported");
    expect(post).toHaveBeenCalledWith({ cards: [], queries: [query], prefs: null });
    expect(storage.store.size).toBe(0);
  });

  it("posts nothing when there is nothing to import", async () => {
    const storage = memoryStorage({ "illuminate-queries-v2": JSON.stringify([query]) });
    const post = vi.fn();
    expect(await importLocalProfile("alice", post, storage)).toBe("nothing");
    expect(post).not.toHaveBeenCalled();
    expect(storage.store.size).toBe(0);
  });
});

describe("createImportRunner", () => {
  const saved = () => memoryStorage({ "illuminate-queries-v2:alice": JSON.stringify([query]) });
  const down = () => Promise.reject(new Error("down"));
  const ok = () => Promise.resolve({ status: "imported" as const });

  it("retries a failed import once after the delay", async () => {
    const storage = saved();
    const post = vi.fn().mockImplementationOnce(down).mockImplementationOnce(ok);
    const wait = vi.fn().mockResolvedValue(undefined);
    const run = createImportRunner(post, { storage, wait, retryDelayMs: 5000 });
    expect(await run("alice")).toBe("imported");
    expect(post).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(5000);
    expect(storage.store.size).toBe(0);
  });

  it("gives up after one retry and leaves the keys for the next load", async () => {
    const storage = saved();
    const post = vi.fn().mockImplementation(down);
    const run = createImportRunner(post, { storage, wait: async () => {} });
    expect(await run("alice")).toBe("failed");
    expect(post).toHaveBeenCalledTimes(2);
    expect(storage.store.has("illuminate-queries-v2:alice")).toBe(true);

    const nextLoad = createImportRunner(vi.fn().mockImplementation(ok), { storage, wait: async () => {} });
    expect(await nextLoad("alice")).toBe("imported");
    expect(storage.store.size).toBe(0);
  });

  it("treats a partial import like a failure: retried, and not settled for the session", async () => {
    const storage = saved();
    const partial = () => Promise.resolve({ status: "partial" as const });
    const post = vi.fn().mockImplementation(partial);
    const run = createImportRunner(post, { storage, wait: async () => {} });
    expect(await run("alice")).toBe("partial");
    expect(post).toHaveBeenCalledTimes(2);
    expect(storage.store.has("illuminate-queries-v2:alice")).toBe(true);
    post.mockImplementation(ok);
    expect(await run("alice")).toBe("imported");
    expect(storage.store.size).toBe(0);
  });

  it("does not retry once the session has ended", async () => {
    const storage = saved();
    const post = vi.fn().mockImplementation(down);
    const run = createImportRunner(post, { storage, wait: async () => { endSession(); } });
    expect(await run("alice")).toBe("failed");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("runs once per session after it succeeds, and shares a run already in flight", async () => {
    const storage = saved();
    const post = vi.fn().mockImplementation(ok);
    const run = createImportRunner(post, { storage, wait: async () => {} });
    const [first, second] = await Promise.all([run("alice"), run("alice")]);
    expect([first, second]).toEqual(["imported", "imported"]);
    expect(await run("alice")).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);

    endSession();
    expect(await run("alice")).toBe("nothing");
  });
});
