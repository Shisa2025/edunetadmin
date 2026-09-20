'use client';

type ErrorPayload = { error?: { code?: string; message?: string } };

export class AdminApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers, credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null) as ErrorPayload | null;
  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? `Request failed (${response.status}).`,
    );
  }
  return payload as T;
}
