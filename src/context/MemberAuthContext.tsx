'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { config } from '@/lib/config';

const REFRESH_KEY = 'member_refresh_token';

export interface MemberUser {
  userId: string;
  permissions: string[];
}

interface MemberAuthState {
  user: MemberUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const MemberAuthContext = createContext<MemberAuthState | null>(null);

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<MemberUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token: string) => {
    const payload = JSON.parse(atob(token.split('.')[1])) as MemberUser & { exp: number };
    setAccessToken(token);
    setUser({ userId: payload.userId, permissions: payload.permissions ?? [] });
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(REFRESH_KEY);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) return null;
    try {
      const res = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored }),
      });
      if (!res.ok) { clearSession(); return null; }
      const { access_token, refresh_token } = await res.json() as { access_token: string; refresh_token: string };
      localStorage.setItem(REFRESH_KEY, refresh_token);
      applyToken(access_token);
      return access_token;
    } catch {
      clearSession();
      return null;
    }
  }, [applyToken, clearSession]);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      await refreshSession();
      if (mounted) setLoading(false);
    }
    void init();
    return () => { mounted = false; };
  }, [refreshSession]);

  const login = useCallback((token: string, refreshToken: string) => {
    localStorage.setItem(REFRESH_KEY, refreshToken);
    applyToken(token);
  }, [applyToken]);

  const logout = useCallback(async () => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (stored) {
      await fetch(`${config.apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored }),
      }).catch(() => {});
    }
    clearSession();
  }, [clearSession]);

  // Returns a valid access token, refreshing if the current one is within 60s of expiry
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!accessToken) return refreshSession();
    const { exp } = JSON.parse(atob(accessToken.split('.')[1])) as { exp: number };
    if (exp * 1000 - Date.now() < 60_000) return refreshSession();
    return accessToken;
  }, [accessToken, refreshSession]);

  return (
    <MemberAuthContext.Provider value={{ user, accessToken, loading, login, logout, getAccessToken }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error('useMemberAuth must be used inside MemberAuthProvider');
  return ctx;
}
