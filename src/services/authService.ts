"use client";

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from "amazon-cognito-identity-js";

interface AuthState {
  user: { id: string; name: string; email?: string } | null;
  isAuthenticated: boolean;
  token: string | null;
}

const STORAGE_KEY = "illuminate_auth";

class AuthService {
  private state: AuthState = { user: null, isAuthenticated: false, token: null };
  private userPool: CognitoUserPool | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      this.initUserPool();
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

  async login(username: string, password: string) {
    if (!this.userPool) throw new Error("Cognito not configured");

    return new Promise<AuthState["user"]>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: username, Pool: this.userPool! });
      cognitoUser.setAuthenticationFlowType("USER_PASSWORD_AUTH");
      const authDetails = new AuthenticationDetails({ Username: username, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const accessToken = session.getAccessToken().getJwtToken();
          const idPayload = session.getIdToken().payload;
          const user = {
            id: idPayload.sub as string,
            name: (idPayload.name || idPayload.email || username) as string,
            email: idPayload.email as string,
          };
          this.state = { user, isAuthenticated: true, token: accessToken };
          this.saveToStorage();
          resolve(user);
        },
        onFailure: (err) => reject(new Error(err.message || "Authentication failed")),
        newPasswordRequired: () => reject(new Error("Password change required. Please contact administrator.")),
      });
    });
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated && !!this.state.token;
  }

  getToken(): string | null {
    return this.state.token;
  }

  getUser() {
    return this.state.user;
  }

  logout() {
    if (this.userPool) {
      const cognitoUser = this.userPool.getCurrentUser();
      if (cognitoUser) cognitoUser.signOut();
    }
    this.state = { user: null, isAuthenticated: false, token: null };
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const authService = new AuthService();
