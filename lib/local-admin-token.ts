import { createHmac, timingSafeEqual } from 'node:crypto';

const EIGHT_HOURS_SECONDS = 8 * 60 * 60;

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function equal(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function credentialsMatch(
  email: string,
  password: string,
  expectedEmail: string,
  expectedPassword: string,
) {
  return equal(email.trim().toLowerCase(), expectedEmail) && equal(password, expectedPassword);
}

export function createLocalAdminToken(email: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    email: email.toLowerCase(),
    expiresAt: Math.floor(now / 1000) + EIGHT_HOURS_SECONDS,
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyLocalAdminToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  if (!token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !equal(signature, sign(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: unknown;
      expiresAt?: unknown;
    };
    if (typeof data.email !== 'string'
      || typeof data.expiresAt !== 'number'
      || data.expiresAt <= Math.floor(now / 1000)) return null;
    return data.email;
  } catch {
    return null;
  }
}
