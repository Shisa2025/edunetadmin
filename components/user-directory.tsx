'use client';

import { LoaderCircle, Search, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';

import { errorMessage, fieldClass, secondaryButton } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import type { UserSummary } from '@/lib/admin-types';

export function UserDirectory({ version, onEdit }: { version: number; onEdit: (userId: string) => void }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiRequest<{ users: UserSummary[] }>(`/api/admin/users?q=${encodeURIComponent(query.trim())}`)
        .then((result) => { if (active) { setUsers(result.users); setError(''); } })
        .catch((requestError) => { if (active) setError(errorMessage(requestError)); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, version]);

  return (
    <section className="rounded-3xl border border-white bg-white/75 p-5 shadow-[0_12px_40px_rgba(23,59,115,0.07)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">All schools</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">User directory</h2>
          <p className="mt-1 text-sm text-slate-500">Find any account to edit its profile, school, role, or password.</p>
        </div>
        <label className="relative block w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or ID…" aria-label="Search all users" className={`${fieldClass} w-full pl-9`} />
          {loading && <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-5 max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        {users?.map((user) => (
          <div key={user.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-slate-900">{user.name}</p>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
            <div className="min-w-0 text-sm sm:w-64 sm:text-right">
              <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-black capitalize ${user.role === 'teacher' ? 'bg-blue-100 text-[var(--admin-blue)]' : user.role === 'student' ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                {user.role ?? 'No profile'}
              </span>
              <span className="text-slate-600">{user.schoolName ?? ''}</span>
            </div>
            <button type="button" onClick={() => onEdit(user.id)} className={secondaryButton}>
              <UserCog className="h-4 w-4" /> Edit
            </button>
          </div>
        ))}
        {users?.length === 0 && <p className="p-6 text-center text-sm font-semibold text-slate-500">No users match this search.</p>}
      </div>
      {users?.length === 50 && <p className="mt-2 text-xs text-slate-500">Showing the first 50 matches. Refine the search to narrow it down.</p>}
    </section>
  );
}
