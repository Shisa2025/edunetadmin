'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/local-auth/logout', { method: 'POST' });
        await authClient.signOut();
        window.location.replace('/login');
      }}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {compact ? null : busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
