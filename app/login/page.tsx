import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { isAllowedAdmin } from '@/lib/admin-access';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { getLocalAdminEmail } from '@/lib/local-admin';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const requestHeaders = await headers();
  if (getLocalAdminEmail(requestHeaders.get('cookie'))) redirect('/');
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session && isAllowedAdmin(session.user.email, env.adminEmails)) redirect('/');
  return <LoginForm blockedEmail={session?.user.email} />;
}
