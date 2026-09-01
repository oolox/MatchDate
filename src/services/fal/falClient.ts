export function getFalApiKey(): string {
  const key = String(import.meta.env.VITE_FAL_KEY ?? '').trim();
  if (!key) {
    throw new Error('Missing VITE_FAL_KEY. Add it to your .env file.');
  }
  return key;
}

export function getFalHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Key ${getFalApiKey()}`,
  };
}

export function formatFalHttpError(status: number, body?: string): string {
  const detail = body?.trim();
  return detail
    ? `fal API error (${status}): ${detail}`
    : `fal API error (${status})`;
}

/** Authenticated fetch against fal; throws on non-OK responses. */
export async function falFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(getFalHeaders());
  const extra = init.headers;
  if (extra) {
    const extraHeaders = new Headers(extra);
    extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(formatFalHttpError(response.status, errorBody));
  }

  return response;
}
