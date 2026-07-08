// Centralizes all process.env access for the frontend.
// NEXT_PUBLIC_* vars are inlined at build time for client components.

// Server Components can reach the API over the internal network via
// API_INTERNAL_URL (e.g. http://backend:8080/api in Docker). The browser
// always uses the public NEXT_PUBLIC_API_URL, which is inlined at build time.
function resolveApiUrl(): string {
  if (typeof window === 'undefined' && process.env.API_INTERNAL_URL) {
    return process.env.API_INTERNAL_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
}

export const config = {
  apiUrl: resolveApiUrl(),
} as const;
