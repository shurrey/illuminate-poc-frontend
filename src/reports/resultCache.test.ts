import { describe, expect, it } from "vitest";
import { createResultCache } from "./resultCache";

describe("createResultCache", () => {
  it("keeps one user's results from another user", () => {
    const cache = createResultCache();
    cache.set("alice", "k", Promise.resolve("roster"));
    expect(cache.get("bob", "k")).toBeUndefined();
    expect(cache.get("alice", "k")).toBeDefined();
  });

  it("forgets everything when cleared", () => {
    const cache = createResultCache();
    cache.set("alice", "k", Promise.resolve(1));
    cache.clear();
    expect(cache.get("alice", "k")).toBeUndefined();
  });

  it("evicts a failed result so it can be retried", async () => {
    const cache = createResultCache();
    const failing = Promise.reject(new Error("boom"));
    cache.set("alice", "k", failing);
    await failing.catch(() => undefined);
    await Promise.resolve();
    expect(cache.get("alice", "k")).toBeUndefined();
  });
});
