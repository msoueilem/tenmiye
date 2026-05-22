import { config } from './config';

// ─── Token storage ────────────────────────────────────────────────────────────

const KEYS = {
  member: { access: 'member_access_token', refresh: 'member_refresh_token' },
  admin: { access: 'admin_access_token', refresh: 'admin_refresh_token' },
} as const;

export type TokenType = keyof typeof KEYS;

export const tokenStore = {
  getAccess(type: TokenType): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEYS[type].access);
  },
  getRefresh(type: TokenType): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEYS[type].refresh);
  },
  set(type: TokenType, access: string, refresh: string): void {
    localStorage.setItem(KEYS[type].access, access);
    localStorage.setItem(KEYS[type].refresh, refresh);
    
    // Clear the opposite token type to ensure only one active session
    const otherType: TokenType = type === 'admin' ? 'member' : 'admin';
    localStorage.removeItem(KEYS[otherType].access);
    localStorage.removeItem(KEYS[otherType].refresh);
  },
  clear(type: TokenType): void {
    localStorage.removeItem(KEYS[type].access);
    localStorage.removeItem(KEYS[type].refresh);
  },
};

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'Session expired — please sign in again');
    this.name = 'UnauthorizedError';
  }
}

// ─── JWT decode (client-side only — no verification, just payload reading) ───

export function decodeJwt<T = Record<string, unknown>>(token: string): T {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64)) as T;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

export async function apiFetch<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: {
    body?: unknown;
    formData?: FormData;
    tokenType?: TokenType;
  } = {},
): Promise<T> {
  const { body, formData, tokenType } = options;

  const makeHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const makeBody = (): BodyInit | undefined => {
    if (formData) return formData;
    if (body !== undefined) return JSON.stringify(body);
    return undefined;
  };

  const token = tokenType ? tokenStore.getAccess(tokenType) : null;

  let res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: makeHeaders(token),
    body: makeBody(),
  });

  // Auto-refresh on 401
  if (res.status === 401 && tokenType) {
    const refreshToken = tokenStore.getRefresh(tokenType);
    if (refreshToken) {
      const refreshRes = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json() as { access_token: string; refresh_token: string };
        tokenStore.set(tokenType, data.access_token, data.refresh_token);

        // Retry with new token
        res = await fetch(`${config.apiUrl}${path}`, {
          method,
          headers: makeHeaders(data.access_token),
          body: makeBody(),
        });
      } else {
        tokenStore.clear(tokenType);
        throw new UnauthorizedError();
      }
    } else {
      tokenStore.clear(tokenType);
      throw new UnauthorizedError();
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' })) as {
      message?: string | string[];
    };
    const msg = Array.isArray(err.message) ? err.message[0] : (err.message ?? 'Request failed');
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return null as T;
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}
