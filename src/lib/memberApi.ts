import { config } from './config';

export async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json() as { message?: string | string[] };
    const m = json.message;
    return Array.isArray(m) ? m[0] : (m ?? fallback);
  } catch {
    return fallback;
  }
}

export async function memberFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
