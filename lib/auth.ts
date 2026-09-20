import 'server-only';

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth';

import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { accounts, sessions, users, verifications } from '@/lib/schema';

export const auth = betterAuth({
  appName: 'EduNets Admin',
  baseURL: env.authUrl,
  basePath: '/api/auth',
  secret: env.authSecret,
  trustedOrigins: [env.authUrl],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      disableDefaultScope: true,
      scope: ['openid', 'email', 'profile'],
      disableImplicitSignUp: true,
      disableSignUp: true,
      mapProfileToUser: (profile) => {
        if (profile.email_verified !== true) {
          throw new APIError('UNAUTHORIZED', { message: 'Google could not verify this email address.' });
        }
        return {};
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      requireLocalEmailVerified: true,
      allowDifferentEmails: false,
      updateUserInfoOnLink: false,
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    cookiePrefix: 'edunets-admin',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.authUrl.startsWith('https://'),
      path: '/',
    },
  },
});
