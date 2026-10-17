import { describe, expect, it, vi } from "vitest";
import { endSession } from "./session";
import {
  ProfileStore, addRecent, begin, confirm, discard, layoutOf, markRead, moved, settled, shown,
  toggleFavorite, toggled,
} from "./profileStore";

class Conflict extends Error {}
const isConflict = (e: unknown) => e instanceof Conflict;
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe("optimistic state", () => {
  const add = (n: number) => (s: number[]) => [...s, n];

  it("shows pending changes over the confirmed state", () => {
    const o = begin(begin(settled([1]), { id: 1, apply: add(2) }), { id: 2, apply: add(3) });
    expect(shown(o)).toEqual([1, 2, 3]);
    expect(o.base).toEqual([1]);
  });

  it("discarding one change rolls back only that change", () => {
    const o = begin(begin(settled([1]), { id: 1, apply: add(2) }), { id: 2, apply: add(3) });
    expect(shown(discard(o, 1))).toEqual([1, 3]);
  });

  it("confirming replaces the base and keeps the other pending changes", () => {
    const o = begin(begin(settled([1]), { id: 1, apply: add(2) }), { id: 2, apply: add(3) });
    const next = confirm(o, 1, [1, 2, 9]);
    expect(next.base).toEqual([1, 2, 9]);
    expect(shown(next)).toEqual([1, 2, 9, 3]);
  });
});

describe("card reducers", () => {
  const cards = [{ id: "a", enabled: true }, { id: "b", enabled: false }, { id: "c" }];

  it("toggles one card's enabled state", () => {
    expect(toggled(cards, "b").map((c) => c.enabled)).toEqual([true, true, undefined]);
    expect(toggled(cards, "c")[2].enabled).toBe(false);
  });

  it("moves a card and leaves the ends alone", () => {
    expect(moved(cards, "b", "up").map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(moved(cards, "a", "up")).toBe(cards);
    expect(moved(cards, "c", "down")).toBe(cards);
  });

  it("derives the layout and passes the server's hidden list through", () => {
    expect(layoutOf(cards, ["x"])).toEqual({ order: ["a", "b", "c"], disabled: ["b"], hidden: ["x"] });
  });

  it("toggling or moving leaves the hidden list as the server sent it", () => {
    expect(layoutOf(moved(toggled(cards, "a"), "c", "up"), ["x"]))
      .toEqual({ order: ["a", "c", "b"], disabled: ["a", "b"], hidden: ["x"] });
  });
});

describe("preference reducers", () => {
  const prefs = { favorites: ["r1"], recentReports: ["a", "b", "c", "d", "e"], readNotifications: ["n1"], visibleWidgets: [], version: 3 };

  it("toggles a favorite", () => {
    expect(toggleFavorite(prefs, "r1").favorites).toEqual([]);
    expect(toggleFavorite(prefs, "r2").favorites).toEqual(["r1", "r2"]);
  });

  it("keeps the five most recent reports, newest first", () => {
    expect(addRecent(prefs, "c").recentReports).toEqual(["c", "a", "b", "d", "e"]);
    expect(addRecent(prefs, "f").recentReports).toEqual(["f", "a", "b", "c", "d"]);
  });

  it("marks notifications read once each", () => {
    expect(markRead(prefs, ["n1", "n2", "n2"]).readNotifications).toEqual(["n1", "n2"]);
  });
});

describe("ProfileStore", () => {
  it("loads, exposing loading and the loaded value", async () => {
    const store = new ProfileStore([0], async () => [1], isConflict);
    expect(store.snapshot()).toMatchObject({ value: [0], loading: true, loaded: false });
    expect(await store.load()).toBe(true);
    expect(store.snapshot()).toMatchObject({ value: [1], loading: false, loaded: true, error: null });
  });

  it("records a load failure", async () => {
    const store = new ProfileStore([0], async () => { throw new Error("down"); }, isConflict);
    expect(await store.load()).toBe(false);
    expect(store.snapshot()).toMatchObject({ value: [0], loading: false, loaded: false, error: "down" });
  });

  it("shows a change at once and confirms it with the server's answer", async () => {
    const store = new ProfileStore<number[]>([], async () => [1], isConflict);
    await store.load();
    const reply = deferred<number[]>();
    const done = store.mutate({ apply: (s) => [...s, 2], send: () => reply.promise, merge: (_, r) => r });
    expect(store.snapshot().value).toEqual([1, 2]);
    reply.resolve([1, 2, 7]);
    expect(await done).toBe(true);
    expect(store.snapshot().value).toEqual([1, 2, 7]);
  });

  it("rolls back a failed change and reports the error", async () => {
    const store = new ProfileStore<number[]>([], async () => [1], isConflict);
    await store.load();
    const ok = await store.mutate({
      apply: (s) => [...s, 2], send: async () => { throw new Error("You can have at most 100 custom cards"); }, merge: (_, r) => r,
    });
    expect(ok).toBe(false);
    expect(store.snapshot()).toMatchObject({ value: [1], error: "You can have at most 100 custom cards" });
  });

  it("on a conflict reloads and retries once against the fresh state", async () => {
    const load = vi.fn().mockResolvedValueOnce({ n: 1, version: 1 }).mockResolvedValueOnce({ n: 5, version: 2 });
    const store = new ProfileStore({ n: 0, version: 0 }, load, isConflict);
    await store.load();
    const sent: { n: number; version: number }[] = [];
    const send = vi.fn(async (next: { n: number; version: number }) => {
      sent.push(next);
      if (sent.length === 1) throw new Conflict("changed elsewhere");
      return { ...next, version: next.version + 1 };
    });
    const ok = await store.mutate({ apply: (s) => ({ ...s, n: s.n + 1 }), send, merge: (_, r) => r });
    expect(ok).toBe(true);
    expect(sent).toEqual([{ n: 2, version: 1 }, { n: 6, version: 2 }]);
    expect(store.snapshot().value).toEqual({ n: 6, version: 3 });
  });

  it("gives up after one retry", async () => {
    const store = new ProfileStore([0], async () => [1], isConflict);
    await store.load();
    const send = vi.fn(async () => { throw new Conflict("changed elsewhere"); });
    expect(await store.mutate({ apply: (s) => [...s, 2], send, merge: (_, r) => r })).toBe(false);
    expect(send).toHaveBeenCalledTimes(2);
    expect(store.snapshot()).toMatchObject({ value: [1], error: "changed elsewhere" });
  });

  it("runs changes one at a time, each against the state the previous one confirmed", async () => {
    const store = new ProfileStore<number[]>([], async () => [], isConflict);
    await store.load();
    const seen: number[][] = [];
    const change = (n: number) => ({
      apply: (s: number[]) => [...s, n],
      send: async (next: number[]) => { seen.push(next); return next; },
      merge: (_: number[], r: number[]) => r,
    });
    await Promise.all([store.mutate(change(1)), store.mutate(change(2))]);
    expect(seen).toEqual([[1], [1, 2]]);
  });

  it("ignores a result that arrives after the session ended", async () => {
    const store = new ProfileStore<number[]>([], async () => [1], isConflict);
    await store.load();
    const reply = deferred<number[]>();
    const done = store.mutate({ apply: (s) => [...s, 2], send: () => reply.promise, merge: (_, r) => r });
    endSession();
    store.reset();
    reply.resolve([1, 2, "leaked" as unknown as number]);
    expect(await done).toBe(false);
    expect(store.snapshot()).toMatchObject({ value: [], loaded: false, error: null });
  });

  it("ignores a load that finishes after the session ended", async () => {
    const reply = deferred<number[]>();
    const store = new ProfileStore<number[]>([], () => reply.promise, isConflict);
    const done = store.load();
    endSession();
    store.reset();
    reply.resolve([42]);
    expect(await done).toBe(false);
    expect(store.snapshot().value).toEqual([]);
  });

  it("notifies subscribers of changes", async () => {
    const store = new ProfileStore([0], async () => [1], isConflict);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    await store.load();
    expect(listener).toHaveBeenCalled();
    off();
  });
});
