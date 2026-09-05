"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  leftoverGoalCents: number;
  currency: string;
  salaryCents: number;
  onboarded: boolean;
  avatar: string;
  createdAt: string;
};

type ProfilePatch = {
  displayName?: string;
  leftoverGoalCents?: number;
  currency?: string;
  salaryCents?: number;
  avatar?: string;
};

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirm: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  completeOnboard: (payload: {
    currency: string;
    salary: string;
    leftoverGoal: string;
    opening: string;
    displayName?: string;
    rent?: string;
    light?: string;
    water?: string;
    internet?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(response: Response) {
  const text = await response.clone().text();
  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error || "Could not continue";
  } catch {
    if (response.status === 404 || /<html/i.test(text)) {
      return "Could not reach ShreeVault. Check your connection and try again.";
    }
    return "Could not continue";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const data = (await response.json()) as { user?: AuthUser | null };
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setReady(true);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password: password.trim() }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const register = useCallback(async (username: string, password: string, confirm: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password: password.trim(), confirm: confirm.trim() }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  }, []);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const completeOnboard = useCallback(async (payload: {
    currency: string;
    salary: string;
    leftoverGoal: string;
    opening: string;
    displayName?: string;
    rent?: string;
    light?: string;
    water?: string;
    internet?: string;
  }) => {
    const response = await fetch("/api/auth/onboard", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({ ready, user, login, register, logout, updateProfile, completeOnboard }),
    [ready, user, login, register, logout, updateProfile, completeOnboard]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
