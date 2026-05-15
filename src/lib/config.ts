// Centralizes all process.env access for the frontend.
// NEXT_PUBLIC_* vars are inlined at build time for client components.

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
} as const;
