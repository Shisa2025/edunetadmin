import 'server-only';

import { z } from 'zod';

const environment = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  BETTER_AUTH_URL: z.url().default('http://localhost:3001'),
  BETTER_AUTH_SECRET: z.string().min(32),
  ADMIN_EMAILS: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
}).refine(
  (value) => Boolean(value.GOOGLE_CLIENT_ID) === Boolean(value.GOOGLE_CLIENT_SECRET),
  { path: ['GOOGLE_CLIENT_SECRET'], message: 'Google client ID and secret must be set together.' },
).parse(process.env);

export const env = Object.freeze({
  databaseUrl: environment.DATABASE_URL,
  databasePoolMax: environment.DATABASE_POOL_MAX,
  authUrl: new URL(environment.BETTER_AUTH_URL).origin,
  authSecret: environment.BETTER_AUTH_SECRET,
  adminEmails: [...new Set(environment.ADMIN_EMAILS
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean))],
  adminPassword: environment.ADMIN_PASSWORD,
  googleClientId: environment.GOOGLE_CLIENT_ID,
  googleClientSecret: environment.GOOGLE_CLIENT_SECRET,
  googleEnabled: Boolean(environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET),
});
