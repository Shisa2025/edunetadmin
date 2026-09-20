import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminDashboard } from '@/components/admin-dashboard';
import { isAllowedAdmin } from '@/lib/admin-access';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { getLocalAdminEmail } from '@/lib/local-admin';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const requestHeaders = await headers();
  const localEmail = getLocalAdminEmail(requestHeaders.get('cookie'));
  if (localEmail) return <AdminDashboard adminName="Local Administrator" adminEmail={localEmail} />;
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect('/login');
  if (!isAllowedAdmin(session.user.email, env.adminEmails)) redirect('/login');
  return <AdminDashboard adminName={session.user.name} adminEmail={session.user.email} />;
}
