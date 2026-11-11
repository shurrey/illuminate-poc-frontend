"use client";

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from "amazon-cognito-identity-js";
import { endSession, sessionCheck } from "@/lib/session";
import { clearAppStorage } from "@/lib/profileImport";
import {
  completeHostedSignIn, hostedConfig, hostedSignInUrl, hostedSignOutUrl, refreshHostedTokens, type CallbackResult,
} from "@/lib/hostedSignIn";

interface AuthState {
  user: { id: string; name: string; email?: string } | null;
  isAuthenticated: boolean;
  token: string | null;
  loginTimestamp: number | null;
  /** Hosted sign-in only; the email and password flow keeps its refresh token in the Cognito SDK's storage. */
  refreshToken?: string | null;
}

const STORAGE_KEY = "illuminate_auth";
/** Cognito group whose members may edit metric overlays; the API enforces the same group. */
export const ADMIN_GROUP = "illuminate-admins";
/** Platform system admins are Illuminate admins too (the API maps the group the same way). */
const PLATFORM_ADMIN_GROUP = "platform-system-admins";
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours
/** The API's error code for a valid token whose user lacks Illuminate access. */
export const NO_ACCESS = "NO_ACCESS";

/** Decode a JWT payload without verification (just to read exp). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/** Returns true if the token expires within the next 60 seconds. */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() / 1000 > payload.exp - 60;
}

class AuthService {
  private state: AuthState = { user: null, isAuthenticated: false, token: null, loginTimestamp: null };
  private userPool: CognitoUserPool | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private expiredListeners = new Set<() => void>();
  private noAccessListeners = new Set<() => void>();
  private redirecting = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      this.initUserPool();
      this.checkSessionExpiry();
      // Back from the hosted UI can restore this page from the back-forward cache, flag included.
      window.addEventListener("pageshow", (e) => {
        if (e.persisted) this.redirecting = false;
      });
    }
  }

  private initUserPool() {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    if (userPoolId && clientId) {
      this.userPool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId, Storage: sessionStorage });
    }
  }

  private loadFromStorage() {
    try {
      // Earlier builds kept the session in localStorage, where it outlived the tab.
      localStorage.removeItem(STORAGE_KEY);
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) this.state = JSON.parse(stored);
    } catch {}
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  /** True when the build signs in through the hosted UI rather than the email and password form. */
  isHosted(): boolean {
    return hostedConfig() !== null;
  }

  /** Sends the browser to the hosted UI, which returns at once while its session lasts. Runs once per page. */
  async startHostedSignIn(returnTo: string): Promise<void> {
    const config = hostedConfig();
    if (!config || this.redirecting) return;
    this.redirecting = true;
    window.location.assign(await hostedSignInUrl(config, returnTo));
  }

  /** Redeems the callback's code and starts the session; the result carries where to go next or what went wrong. */
  async completeHostedSignIn(params: URLSearchParams): Promise<CallbackResult> {
    const config = hostedConfig();
    if (!config) return { error: "Sign-in is not configured." };
    const result = await completeHostedSignIn(config, params);
    if ("error" in result) return result;
    const payload = decodeJwtPayload(result.idToken);
    if (!payload || typeof payload.sub !== "string") return { error: "Sign-in failed. Please try again." };
    const user = {
      id: payload.sub,
      name: String(payload.name || payload.email || payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
    this.state = { user, isAuthenticated: true, token: result.idToken, loginTimestamp: Date.now(), refreshToken: result.refreshToken };
    this.saveToStorage();
    return result;
  }

  /** Called when the API refuses the signed-in user because they lack Illuminate access. */
  onNoAccess(listener: () => void): () => void {
    this.noAccessListeners.add(listener);
    return () => { this.noAccessListeners.delete(listener); };
  }

  private async notifyIfNoAccess(resp: Response): Promise<void> {
    if (resp.status !== 403) return;
    try {
      const body = await resp.clone().json();
      if (body?.code === NO_ACCESS) this.noAccessListeners.forEach((l) => l());
    } catch {}
  }

  /** Force logout if the session is older than SESSION_MAX_AGE_MS; true when it was. */
  private checkSessionExpiry(): boolean {
    if (!this.state.isAuthenticated || !this.state.loginTimestamp) return false;
    if (Date.now() - this.state.loginTimestamp > SESSION_MAX_AGE_MS) {
      this.expireSession();
      return true;
    }
    return false;
  }

  /** Called with no arguments when a signed-in session ends without the user signing out. */
  onSessionExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => { this.expiredListeners.delete(listener); };
  }

  private expireSession() {
    const wasSignedIn = this.state.isAuthenticated;
    this.logout();
    if (wasSignedIn) this.expiredListeners.forEach((l) => l());
  }

  /**
   * fetch with the ID token; a 401 or a failed refresh ends the session and notifies listeners.
   * Throws without sending when the session ended while the token was obtained, so one user's request never carries another's token.
   */
  async authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const live = sessionCheck();
    const token = await this.getValidToken();
    if (!live()) throw new Error("The session ended before the request was sent");
    const headers = { ...(init.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const resp = await fetch(input, { ...init, headers });
    if (resp.status === 401 && token) this.expireSession();
    if (token) await this.notifyIfNoAccess(resp);
    return resp;
  }

  private updateToken(session: CognitoUserSession) {
    // Cache the ID token — backend reads tenant_id from its custom claims.
    const idToken = session.getIdToken().getJwtToken();
    this.state.token = idToken;
    this.saveToStorage();
  }

  /**
   * Refresh the access token using the SDK's built-in refresh token handling.
   * Returns the fresh token, or null if refresh fails (user must re-login).
   * Deduplicates concurrent refresh calls.
   */
  private refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    const hosted = hostedConfig();
    const hostedRefresh = this.state.refreshToken;
    if (hosted && hostedRefresh) {
      this.refreshPromise = refreshHostedTokens(hosted, hostedRefresh).then((idToken) => {
        if (!idToken) {
          this.expireSession();
          return null;
        }
        this.state.token = idToken;
        this.saveToStorage();
        return idToken;
      }).finally(() => {
        this.refreshPromise = null;
      });
      return this.refreshPromise;
    }

    this.refreshPromise = new Promise<string | null>((resolve) => {
      if (!this.userPool) { resolve(null); return; }

      const cognitoUser = this.userPool.getCurrentUser();
      if (!cognitoUser) {
        this.expireSession();
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          this.expireSession();
          resolve(null);
        } else {
          this.updateToken(session);
          // Return the ID token (not the access token) so the backend can
          // read Cognito custom attributes like `custom:tenant_id`.
          resolve(session.getIdToken().getJwtToken());
        }
      });
    }).finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  async login(username: string, password: string) {
    if (!this.userPool) throw new Error("Cognito not configured");

    return new Promise<AuthState["user"]>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: username, Pool: this.userPool! });
      cognitoUser.setAuthenticationFlowType("USER_PASSWORD_AUTH");
      const authDetails = new AuthenticationDetails({ Username: username, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession) => {
          // Persist the ID token (not access). The ID token carries Cognito
          // user attributes (`custom:tenant_id`) that the backend needs.
          const idToken = session.getIdToken().getJwtToken();
          const idPayload = session.getIdToken().payload;
          const user = {
            id: idPayload.sub as string,
            name: (idPayload.name || idPayload.email || username) as string,
            email: idPayload.email as string,
          };
          this.state = { user, isAuthenticated: true, token: idToken, loginTimestamp: Date.now() };
          this.saveToStorage();
          resolve(user);
        },
        onFailure: (err) => reject(new Error(err.message || "Authentication failed")),
        newPasswordRequired: () => reject(new Error("Password change required. Please contact administrator.")),
      });
    });
  }

  /** Read from the current ID token's cognito:groups claim, so it can't go stale in storage. */
  isAdmin(): boolean {
    const payload = this.state.token ? decodeJwtPayload(this.state.token) : null;
    const groups = payload?.["cognito:groups"];
    return Array.isArray(groups) && (groups.includes(ADMIN_GROUP) || groups.includes(PLATFORM_ADMIN_GROUP));
  }

  isAuthenticated(): boolean {
    if (!this.state.isAuthenticated || !this.state.token) return false;
    if (this.state.loginTimestamp && Date.now() - this.state.loginTimestamp > SESSION_MAX_AGE_MS) {
      this.logout();
      return false;
    }
    return true;
  }

  /**
   * Get a valid access token. Automatically refreshes if expired.
   * Returns null if not authenticated, session expired, or refresh fails.
   */
  async getValidToken(): Promise<string | null> {
    if (this.checkSessionExpiry() || !this.isAuthenticated()) return null;

    if (!isTokenExpired(this.state.token!)) {
      return this.state.token;
    }

    return this.refreshToken();
  }

  /** Synchronous token access — returns the cached token without refresh check. */
  getToken(): string | null {
    return this.state.token;
  }

  getUser() {
    return this.state.user;
  }

  logout() {
    // Sign out of Cognito SDK (clears its internal localStorage tokens)
    if (this.userPool) {
      const cognitoUser = this.userPool.getCurrentUser();
      if (cognitoUser) cognitoUser.signOut();
    }

    // Clear our auth state
    this.state = { user: null, isAuthenticated: false, token: null, loginTimestamp: null };
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Also clear any Cognito SDK localStorage keys to prevent silent re-auth
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    if (clientId) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`CognitoIdentityServiceProvider.${clientId}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
    clearAppStorage();
    endSession();
  }

  /** Ends the session; with hosted sign-in, also the hosted UI's, so the next sign-in to any product asks for a password. */
  signOut() {
    this.logout();
    const config = hostedConfig();
    if (!config) return;
    // Holds off the sign-in redirect the signed-out page would otherwise start.
    this.redirecting = true;
    window.location.assign(hostedSignOutUrl(config));
  }
}

export const authService = new AuthService();
