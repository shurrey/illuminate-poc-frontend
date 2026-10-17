import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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

  it("removes the app's keys but keeps each user's unimported legacy cards and queries", async () => {
    const { authService } = await import("./authService");
    localStorage.setItem("illuminate-queries-v2:alice", "[]");
    localStorage.setItem("illuminate-dashboard-cards-v2:alice", "[]");
    localStorage.setItem("illuminate-user", "{}");
    localStorage.setItem("illuminate-sidebar", "open");
    localStorage.setItem("unrelated", "kept");

    authService.logout();

    expect(localStorage.getItem("illuminate-queries-v2:alice")).toBe("[]");
    expect(localStorage.getItem("illuminate-dashboard-cards-v2:alice")).toBe("[]");
    expect(localStorage.getItem("illuminate-user")).toBeNull();
    expect(localStorage.getItem("illuminate-sidebar")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("kept");
  });
});

describe("authService.authedFetch", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("sends the request with the token when the session is unchanged", async () => {
    const { authService } = await import("./authService");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    vi.spyOn(authService, "getValidToken").mockResolvedValue("alice-token");

    const resp = await authService.authedFetch("/api/x", { method: "POST", headers: { "Content-Type": "application/json" } });

    expect(resp.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("/api/x", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer alice-token" },
    });
  });

  it("never sends a request with a token from a session that began after the request was made", async () => {
    const { authService } = await import("./authService");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    // Alice signs out and Bob signs in while the token is being refreshed.
    vi.spyOn(authService, "getValidToken").mockImplementation(async () => {
      authService.logout();
      return "bob-token";
    });

    await expect(authService.authedFetch("/api/x", { method: "PUT" })).rejects.toThrow(/session/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
