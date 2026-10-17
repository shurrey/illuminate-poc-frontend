import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  });
});

describe("authService.logout", () => {
  it("ends the session, so per-session caches are cleared", async () => {
    const { onSessionEnd, sessionCheck } = await import("@/lib/session");
    const { authService } = await import("./authService");
    const { reportResults } = await import("@/reports/resultCache");
    const reset = vi.fn();
    const off = onSessionEnd(reset);
    const live = sessionCheck();
    reportResults.set("alice", "k", Promise.resolve("roster"));

    authService.logout();

    expect(reset).toHaveBeenCalledTimes(1);
    expect(live()).toBe(false);
    expect(reportResults.get("alice", "k")).toBeUndefined();
    off();
  });

  it("removes the app's saved profile keys from the browser", async () => {
    const { authService } = await import("./authService");
    localStorage.setItem("illuminate-queries-v2:alice", "[]");
    localStorage.setItem("illuminate-user", "{}");
    localStorage.setItem("unrelated", "kept");

    authService.logout();

    expect(localStorage.getItem("illuminate-queries-v2:alice")).toBeNull();
    expect(localStorage.getItem("illuminate-user")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("kept");
  });
});
