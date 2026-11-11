import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

beforeAll(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("sessionStorage", memoryStorage());
});

const ORIGIN = "https://illuminate.example.com";

function idToken(claims: Record<string, unknown>): string {
  const part = (v: unknown) => btoa(JSON.stringify(v)).replace(/=+$/, "");
  return `${part({ alg: "RS256" })}.${part({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.sig`;
}

describe("hosted sign-in", () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_COGNITO_DOMAIN", "https://auth.example.com");
    vi.stubEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID", "web-client");
    vi.stubGlobal("window", { location: { origin: ORIGIN, assign }, addEventListener: () => {} });
    assign.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal("window", undefined);
    vi.restoreAllMocks();
  });

  async function signIn(claims: Record<string, unknown> = { sub: "alice", email: "a@x.edu", name: "Alice" }) {
    const { authService } = await import("./authService");
    authService.logout();
    (authService as unknown as { redirecting: boolean }).redirecting = false;
    await authService.startHostedSignIn("/queries");
    const state = new URL(assign.mock.calls[0][0]).searchParams.get("state")!;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id_token: idToken(claims), refresh_token: "refresh" }), { status: 200 }));
    const result = await authService.completeHostedSignIn(new URLSearchParams({ code: "abc", state }));
    return { authService, result };
  }

  it("keeps the session in sessionStorage, not localStorage", async () => {
    const { authService, result } = await signIn();
    expect(result).toMatchObject({ returnTo: "/queries" });
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getUser()).toEqual({ id: "alice", name: "Alice", email: "a@x.edu" });
    expect(JSON.parse(sessionStorage.getItem("illuminate_auth")!).token).toBe(authService.getToken());
    expect(localStorage.getItem("illuminate_auth")).toBeNull();
  });

  it("ends the session after four hours", async () => {
    const { authService } = await signIn();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 4 * 60 * 60 * 1000 + 1);
    expect(authService.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem("illuminate_auth")).toBeNull();
  });

  it("counts platform system admins as admins", async () => {
    const { authService } = await signIn({ sub: "alice", "cognito:groups": ["illuminate-users", "platform-system-admins"] });
    expect(authService.isAdmin()).toBe(true);
  });

  it("signs out of the hosted UI and starts no sign-in afterwards", async () => {
    const { authService } = await signIn();
    assign.mockReset();
    authService.signOut();
    await authService.startHostedSignIn("/");
    expect(authService.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem("illuminate_auth")).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign.mock.calls[0][0]).toBe(
      `https://auth.example.com/logout?client_id=web-client&logout_uri=${encodeURIComponent(`${ORIGIN}/login`)}`);
  });

  it("starts the hosted sign-in once per page", async () => {
    const { authService } = await import("./authService");
    (authService as unknown as { redirecting: boolean }).redirecting = false;
    await authService.startHostedSignIn("/");
    await authService.startHostedSignIn("/");
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired ID token with the refresh token", async () => {
    const { authService } = await signIn({ sub: "alice", exp: Math.floor(Date.now() / 1000) - 10 });
    const fresh = idToken({ sub: "alice" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id_token: fresh }), { status: 200 }));
    expect(await authService.getValidToken()).toBe(fresh);
    expect(String(fetchMock.mock.lastCall![1]!.body)).toContain("grant_type=refresh_token");
  });
});

describe("no access", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  async function respond(status: number, body: unknown) {
    const { authService } = await import("./authService");
    vi.spyOn(authService, "getValidToken").mockResolvedValue("alice-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
    const listener = vi.fn();
    const off = authService.onNoAccess(listener);
    const resp = await authService.authedFetch("/api/v1/me");
    off();
    return { listener, resp };
  }

  it("tells listeners when the API answers 403 NO_ACCESS, and the body is still readable", async () => {
    const { listener, resp } = await respond(403, { detail: "You don't have access to Illuminate", code: "NO_ACCESS" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect((await resp.json()).code).toBe("NO_ACCESS");
  });

  it("ignores other 403s", async () => {
    const { listener } = await respond(403, { detail: "Your organization is not set up yet" });
    expect(listener).not.toHaveBeenCalled();
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
