/**
 * Hosted sign-in: the authorization-code flow with PKCE (S256) against the pool's hosted UI.
 * The state, verifier and return path live in sessionStorage for the round trip only.
 */
const PENDING = "illuminate_sign_in";
const SCOPES = "openid email profile";

export interface HostedConfig {
  /** Bare https origin of the hosted UI, no trailing slash. */
  domain: string;
  clientId: string;
}

interface Pending {
  state: string;
  verifier: string;
  returnTo: string;
}

export interface HostedTokens {
  idToken: string;
  refreshToken: string | null;
}

export type CallbackResult = (HostedTokens & { returnTo: string }) | { error: string };

export const HOSTED_MESSAGES = {
  stale: "That sign-in has expired or isn't valid. Sign in again.",
  failed: "Sign-in failed. Please try again.",
} as const;

/** The hosted UI settings from the build, or null when the build keeps the email and password form. */
export function hostedConfig(): HostedConfig | null {
  const domain = (process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "").replace(/\/+$/, "");
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
  return domain && clientId ? { domain, clientId } : null;
}

const redirectUri = () => `${window.location.origin}/auth/callback`;

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(bytes: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** A same-origin path, so the callback can't be used to send someone to another site. */
function safeReturnTo(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/";
}

/** The hosted UI's authorize URL; records the state and verifier it was built with. */
export async function hostedSignInUrl(config: HostedConfig, returnTo: string): Promise<string> {
  const pending: Pending = { state: randomString(16), verifier: randomString(32), returnTo: safeReturnTo(returnTo) };
  sessionStorage.setItem(PENDING, JSON.stringify(pending));
  const query = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state: pending.state,
    code_challenge: await challengeFor(pending.verifier),
    code_challenge_method: "S256",
  });
  return `${config.domain}/oauth2/authorize?${query}`;
}

function takePending(): Pending | null {
  const raw = sessionStorage.getItem(PENDING);
  sessionStorage.removeItem(PENDING);
  try {
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value.state === "string" && typeof value.verifier === "string" ? value : null;
  } catch {
    return null;
  }
}

async function redeem(config: HostedConfig, form: Record<string, string>): Promise<HostedTokens | null> {
  const response = await fetch(`${config.domain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, ...form }),
  });
  const body = response.ok ? await response.json() : null;
  if (typeof body?.id_token !== "string") return null;
  return { idToken: body.id_token, refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null };
}

/** Checks `state` and redeems the code. The pending record is removed first, so a verifier is used once. */
export async function completeHostedSignIn(config: HostedConfig, params: URLSearchParams): Promise<CallbackResult> {
  const pending = takePending();
  const code = params.get("code");
  if (params.get("error")) return { error: HOSTED_MESSAGES.failed };
  if (!pending || !code || params.get("state") !== pending.state) return { error: HOSTED_MESSAGES.stale };
  try {
    const tokens = await redeem(config, {
      grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: pending.verifier,
    });
    if (!tokens) return { error: HOSTED_MESSAGES.failed };
    return { ...tokens, returnTo: safeReturnTo(pending.returnTo) };
  } catch {
    return { error: HOSTED_MESSAGES.failed };
  }
}

/** A fresh ID token from the refresh token; null when it is refused or unreachable. Never throws. */
export async function refreshHostedTokens(config: HostedConfig, refreshToken: string): Promise<string | null> {
  try {
    return (await redeem(config, { grant_type: "refresh_token", refresh_token: refreshToken }))?.idToken ?? null;
  } catch {
    return null;
  }
}

/** The hosted UI's sign-out, which ends its session too, so the next sign-in to any product asks for a password. */
export function hostedSignOutUrl(config: HostedConfig): string {
  sessionStorage.removeItem(PENDING);
  const query = new URLSearchParams({ client_id: config.clientId, logout_uri: `${window.location.origin}/login` });
  return `${config.domain}/logout?${query}`;
}
