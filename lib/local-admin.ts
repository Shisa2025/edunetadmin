import 'server-only';

import { env } from '@/lib/env';
import {
  createLocalAdminToken,
  credentialsMatch,
  verifyLocalAdminToken,
} from '@/lib/local-admin-token';

export const LOCAL_ADMIN_COOKIE = 'edunets-admin-local';

export function localAdminEnabled() {
  return env.isDevelopment && Boolean(env.localAdminEmail && env.localAdminPassword);
}

export function matchLocalAdmin(email: string, password: string) {
  return localAdminEnabled()
    && credentialsMatch(email, password, env.localAdminEmail, env.localAdminPassword);
}

export function issueLocalAdminToken() {
  return createLocalAdminToken(env.localAdminEmail, env.authSecret);
}

export function getLocalAdminEmail(cookieHeader: string | null) {
  if (!localAdminEnabled() || !cookieHeader) return null;
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === LOCAL_ADMIN_COOKIE)?.slice(1).join('=');
  return verifyLocalAdminToken(token, env.localAdminEmail, env.authSecret);
}
