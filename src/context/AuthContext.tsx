"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "@/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; name: string; email?: string } | null;
  login: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function LoginPage({ onLogin, error, loading }: {
  onLogin: (u: string, p: string) => void;
  error: string | null;
  loading: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#f5f6f8]">
      <div className="max-w-sm w-full px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: "#1a1a2e", fontFamily: "Poppins, sans-serif" }}
            >
              Bb
            </div>
            <span className="text-2xl" style={{ fontFamily: "Poppins, sans-serif", color: "#1a1a2e" }}>
              <span className="font-bold">Blackboard</span>{" "}
              <span className="font-normal opacity-60">Illuminate</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent disabled:bg-gray-50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent disabled:bg-gray-50"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setUser(authService.getUser());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const u = await authService.login(username, password);
      setUser(u);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signOut, isLoading, error }}>
      {/* Always render children so the router stays mounted and knows the URL */}
      {children}

      {/* Overlay login/loading on top when not authenticated */}
      {isLoading && !isAuthenticated && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#f5f6f8]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" />
        </div>
      )}
      {!isLoading && !isAuthenticated && (
        <LoginPage onLogin={login} error={error} loading={isLoading} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
