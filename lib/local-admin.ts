import 'server-only';

import { isAllowedAdmin } from '@/lib/admin-access';
import { env } from '@/lib/env';
import {
  createLocalAdminToken,
  credentialsMatch,
  verifyLocalAdminToken,
} from '@/lib/local-admin-token';

export const LOCAL_ADMIN_COOKIE = 'edunets-admin-local';

export function matchLocalAdmin(email: string, password: string) {
  return env.adminEmails.some((expectedEmail) => (
    credentialsMatch(email, password, expectedEmail, env.adminPassword)
  ));
}

export function issueLocalAdminToken(email: string) {
  return createLocalAdminToken(email.trim().toLowerCase(), env.authSecret);
}

export function getLocalAdminEmail(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === LOCAL_ADMIN_COOKIE)?.slice(1).join('=');
  const email = verifyLocalAdminToken(token, env.authSecret);
  return isAllowedAdmin(email, env.adminEmails) ? email : null;
}
