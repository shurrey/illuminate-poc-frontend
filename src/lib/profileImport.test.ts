import { describe, expect, it, vi } from "vitest";
import {
  clearAppStorage, clearLocalProfile, collectLocalProfile, dropUnownedProfileKeys, importLocalProfile,
} from "./profileImport";

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
  it("removes every illuminate- key and keeps the auth state and other apps' keys", () => {
    const storage = memoryStorage({
      "illuminate-dashboard-cards-v2:alice": "[]",
      "illuminate-queries-v2": "[]",
      "illuminate-user": "{}",
      illuminate_auth: "{}",
      "CognitoIdentityServiceProvider.x": "t",
    });
    clearAppStorage(storage);
    expect([...storage.store.keys()].sort()).toEqual(["CognitoIdentityServiceProvider.x", "illuminate_auth"]);
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

  it("posts nothing when there is nothing to import", async () => {
    const storage = memoryStorage({ "illuminate-queries-v2": JSON.stringify([query]) });
    const post = vi.fn();
    expect(await importLocalProfile("alice", post, storage)).toBe("nothing");
    expect(post).not.toHaveBeenCalled();
    expect(storage.store.size).toBe(0);
  });
});
