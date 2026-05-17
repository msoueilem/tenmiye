'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { tokenStore, decodeJwt } from '@/lib/api';
import { config } from '@/lib/config';

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

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    tokenStore.clear('member');
  }, []);

  const applyToken = useCallback((token: string) => {
    try {
      const payload = decodeJwt<MemberUser & { exp: number }>(token);
      setAccessToken(token);
      setUser({ userId: payload.userId, permissions: payload.permissions ?? [] });
      // Keep access token in localStorage so apiFetch can read it
      const refresh = tokenStore.getRefresh('member');
      if (refresh) tokenStore.set('member', token, refresh);
    } catch {
      clearSession();
    }
  }, [clearSession]);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const stored = tokenStore.getRefresh('member');
    if (!stored) return null;
    try {
      const res = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored }),
      });
      if (!res.ok) { clearSession(); return null; }
      const { access_token, refresh_token } = await res.json() as {
        access_token: string;
        refresh_token: string;
      };
      tokenStore.set('member', access_token, refresh_token);
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
      // If we have an access token already, apply it directly (avoids a network round-trip)
      const storedAccess = tokenStore.getAccess('member');
      if (storedAccess) {
        applyToken(storedAccess);
      } else {
        await refreshSession();
      }
      if (mounted) setLoading(false);
    }
    void init();
    return () => { mounted = false; };
  }, [refreshSession, applyToken]);

  const login = useCallback((token: string, refreshToken: string) => {
    tokenStore.set('member', token, refreshToken);
    applyToken(token);
  }, [applyToken]);

  const logout = useCallback(async () => {
    const stored = tokenStore.getRefresh('member');
    if (stored) {
      await fetch(`${config.apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored }),
      }).catch(() => {});
    }
    clearSession();
  }, [clearSession]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!accessToken) return refreshSession();
    try {
      const { exp } = decodeJwt<{ exp: number }>(accessToken);
      if (exp * 1000 - Date.now() < 60_000) return refreshSession();
    } catch {
      return refreshSession();
    }
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
