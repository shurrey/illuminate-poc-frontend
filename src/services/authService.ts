"use client";

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from "amazon-cognito-identity-js";

interface AuthState {
  user: { id: string; name: string; email?: string } | null;
  isAuthenticated: boolean;
  token: string | null;
  loginTimestamp: number | null;
}

const STORAGE_KEY = "illuminate_auth";
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

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

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      this.initUserPool();
      this.checkSessionExpiry();
    }
  }

  private initUserPool() {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    if (userPoolId && clientId) {
      this.userPool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) this.state = JSON.parse(stored);
    } catch {}
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  /** Force logout if the session is older than SESSION_MAX_AGE_MS. */
  private checkSessionExpiry() {
    if (!this.state.isAuthenticated || !this.state.loginTimestamp) return;
    if (Date.now() - this.state.loginTimestamp > SESSION_MAX_AGE_MS) {
      this.logout();
    }
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

    this.refreshPromise = new Promise<string | null>((resolve) => {
      if (!this.userPool) { resolve(null); return; }

      const cognitoUser = this.userPool.getCurrentUser();
      if (!cognitoUser) {
        this.logout();
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          this.logout();
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
    if (!this.isAuthenticated()) return null;

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
    localStorage.removeItem(STORAGE_KEY);

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
  }
}

export const authService = new AuthService();
