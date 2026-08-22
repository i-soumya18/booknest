"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchApi, getAccessToken, setAccessToken } from "@/lib/api/client";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state on mount by attempting refresh
  useEffect(() => {
    async function initAuth() {
      try {
        const data = await fetchApi<{ user: User; tokens: { access_token: string } }>(
          "/api/v1/auth/refresh",
          { method: "POST", skipAuthRefresh: true }
        );
        setAccessToken(data.tokens.access_token);
        setUser(data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await fetchApi<{ user: User; tokens: { access_token: string } }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    setAccessToken(data.tokens.access_token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, name: string) => {

    const data = await fetchApi<{ user: User; tokens: { access_token: string } }>(
      "/api/v1/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }
    );
    setAccessToken(data.tokens.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetchApi("/api/v1/auth/logout", { method: "POST", skipAuthRefresh: true });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
