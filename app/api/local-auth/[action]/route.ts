import { cookies } from 'next/headers';
import { z } from 'zod';

import { env } from '@/lib/env';
import {
  issueLocalAdminToken,
  LOCAL_ADMIN_COOKIE,
  matchLocalAdmin,
} from '@/lib/local-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  password: z.string().min(1).max(256),
});

type Context = { params: Promise<{ action: string }> };

export async function POST(request: Request, context: Context) {
  if (request.headers.get('origin') !== env.authUrl) {
    return Response.json({ error: { message: 'Request origin is not allowed.' } }, { status: 403 });
  }
  const { action } = await context.params;
  const cookieStore = await cookies();

  if (action === 'logout') {
    cookieStore.delete(LOCAL_ADMIN_COOKIE);
    return Response.json({ ok: true });
  }
  if (action !== 'login') return Response.json({ error: { message: 'Route not found.' } }, { status: 404 });

  const input = loginSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !matchLocalAdmin(input.data.email, input.data.password)) {
    return Response.json({ error: { message: 'Invalid email or password.' } }, { status: 401 });
  }
  cookieStore.set({
    name: LOCAL_ADMIN_COOKIE,
    value: issueLocalAdminToken(input.data.email),
    httpOnly: true,
    sameSite: 'lax',
    secure: env.authUrl.startsWith('https://'),
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return Response.json({ ok: true });
}
