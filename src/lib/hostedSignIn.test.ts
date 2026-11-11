import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  challengeFor, completeHostedSignIn, HOSTED_MESSAGES, hostedConfig, hostedSignInUrl, hostedSignOutUrl,
  refreshHostedTokens,
} from "./hostedSignIn";

const CONFIG = { domain: "https://auth.example.com", clientId: "web-client" };
const ORIGIN = "https://illuminate.example.com";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.stubGlobal("window", { location: { origin: ORIGIN } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Starts a sign-in and returns the query the hosted UI would receive. */
async function authorize(returnTo = "/queries") {
  return new URL(await hostedSignInUrl(CONFIG, returnTo)).searchParams;
}

function fakeTokenEndpoint(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("hostedConfig", () => {
  it("is null without a domain, so the build keeps the email and password form", () => {
    vi.stubEnv("NEXT_PUBLIC_COGNITO_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID", "web-client");
    expect(hostedConfig()).toBeNull();
  });

  it("drops a trailing slash from the domain", () => {
    vi.stubEnv("NEXT_PUBLIC_COGNITO_DOMAIN", "https://auth.example.com/");
    vi.stubEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID", "web-client");
    expect(hostedConfig()).toEqual(CONFIG);
  });
});

describe("hostedSignInUrl", () => {
  it("asks for a code with an S256 challenge of the stored verifier", async () => {
    const url = new URL(await hostedSignInUrl(CONFIG, "/"));
    const q = url.searchParams;
    expect(url.origin + url.pathname).toBe("https://auth.example.com/oauth2/authorize");
    expect(Object.fromEntries(q)).toMatchObject({
      response_type: "code", client_id: "web-client", redirect_uri: `${ORIGIN}/auth/callback`,
      scope: "openid email profile", code_challenge_method: "S256",
    });
    const pending = JSON.parse(sessionStorage.getItem("illuminate_sign_in")!);
    expect(pending.state).toBe(q.get("state"));
    expect(q.get("code_challenge")).toBe(await challengeFor(pending.verifier));
    expect(pending.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("uses a new state and verifier each time", async () => {
    const first = (await authorize()).get("state");
    expect((await authorize()).get("state")).not.toBe(first);
  });
});

describe("completeHostedSignIn", () => {
  it("redeems the code with the verifier and returns where the user was going", async () => {
    const q = await authorize("/queries?tab=mine");
    const verifier = JSON.parse(sessionStorage.getItem("illuminate_sign_in")!).verifier;
    const fetchMock = fakeTokenEndpoint({ id_token: "id.jwt", refresh_token: "refresh" });

    const result = await completeHostedSignIn(CONFIG, new URLSearchParams({ code: "abc", state: q.get("state")! }));

    expect(result).toEqual({ idToken: "id.jwt", refreshToken: "refresh", returnTo: "/queries?tab=mine" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://auth.example.com/oauth2/token");
    expect(Object.fromEntries(new URLSearchParams(String(init!.body)))).toEqual({
      client_id: "web-client", grant_type: "authorization_code", code: "abc",
      redirect_uri: `${ORIGIN}/auth/callback`, code_verifier: verifier,
    });
  });

  it("refuses a mismatched state without calling the token endpoint", async () => {
    await authorize();
    const fetchMock = fakeTokenEndpoint({ id_token: "id.jwt" });
    const result = await completeHostedSignIn(CONFIG, new URLSearchParams({ code: "abc", state: "forged" }));
    expect(result).toEqual({ error: HOSTED_MESSAGES.stale });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a missing state", async () => {
    await authorize();
    const fetchMock = fakeTokenEndpoint({ id_token: "id.jwt" });
    expect(await completeHostedSignIn(CONFIG, new URLSearchParams({ code: "abc" }))).toEqual({ error: HOSTED_MESSAGES.stale });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the verifier once, so a replayed callback is refused", async () => {
    const params = new URLSearchParams({ code: "abc", state: (await authorize()).get("state")! });
    const fetchMock = fakeTokenEndpoint({ id_token: "id.jwt" });
    expect(await completeHostedSignIn(CONFIG, params)).toMatchObject({ idToken: "id.jwt" });
    expect(await completeHostedSignIn(CONFIG, params)).toEqual({ error: HOSTED_MESSAGES.stale });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("illuminate_sign_in")).toBeNull();
  });

  it("drops the verifier when the hosted UI returns an error", async () => {
    const state = (await authorize()).get("state")!;
    expect(await completeHostedSignIn(CONFIG, new URLSearchParams({ error: "access_denied", state })))
      .toEqual({ error: HOSTED_MESSAGES.failed });
    expect(sessionStorage.getItem("illuminate_sign_in")).toBeNull();
  });

  it("fails when the token endpoint refuses the code", async () => {
    const state = (await authorize()).get("state")!;
    fakeTokenEndpoint({ error: "invalid_grant" }, 400);
    expect(await completeHostedSignIn(CONFIG, new URLSearchParams({ code: "abc", state })))
      .toEqual({ error: HOSTED_MESSAGES.failed });
  });

  it.each(["https://evil.example.com/", "//evil.example.com", "/\\evil.example.com"])(
    "returns to / instead of the off-site path %s",
    async (returnTo) => {
      const state = (await authorize(returnTo)).get("state")!;
      fakeTokenEndpoint({ id_token: "id.jwt" });
      expect(await completeHostedSignIn(CONFIG, new URLSearchParams({ code: "abc", state })))
        .toMatchObject({ returnTo: "/" });
    },
  );
});

describe("refreshHostedTokens", () => {
  it("returns the new ID token", async () => {
    const fetchMock = fakeTokenEndpoint({ id_token: "fresh.jwt" });
    expect(await refreshHostedTokens(CONFIG, "refresh")).toBe("fresh.jwt");
    expect(Object.fromEntries(new URLSearchParams(String(fetchMock.mock.calls[0][1]!.body)))).toEqual({
      client_id: "web-client", grant_type: "refresh_token", refresh_token: "refresh",
    });
  });

  it("returns null when the endpoint is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    expect(await refreshHostedTokens(CONFIG, "refresh")).toBeNull();
  });
});

describe("hostedSignOutUrl", () => {
  it("ends the hosted UI session and returns to /login", async () => {
    await authorize();
    const url = new URL(hostedSignOutUrl(CONFIG));
    expect(url.origin + url.pathname).toBe("https://auth.example.com/logout");
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: "web-client", logout_uri: `${ORIGIN}/login` });
    expect(sessionStorage.getItem("illuminate_sign_in")).toBeNull();
  });
});
