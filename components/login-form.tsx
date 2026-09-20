'use client';

import { GraduationCap, LoaderCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { SignOutButton } from '@/components/sign-out-button';

export function LoginForm({
  blockedEmail,
  googleEnabled,
}: {
  blockedEmail?: string;
  googleEnabled: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('email');
    setError('');
    const localResult = await fetch('/api/local-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (localResult.ok) {
      window.location.replace('/');
      return;
    }
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message || 'Could not sign in with those credentials.');
      setBusy(null);
      return;
    }
    window.location.replace('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_80px_rgba(23,59,115,0.14)]">
        <div className="bg-[var(--admin-blue)] px-8 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-black">EduNets</p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Admin console</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <h1 className="text-2xl font-black text-slate-900">Administrator sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use an existing EduNets account whose email is on the admin allowlist.</p>

          {blockedEmail ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-black">Access is not enabled</p>
              <p className="mt-1">{blockedEmail} is signed in but is not an administrator.</p>
              <div className="mt-3"><SignOutButton /></div>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-7 space-y-4">
                <label className="block text-sm font-bold text-slate-700">
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-[var(--admin-blue)] focus:ring-3 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-[var(--admin-blue)] focus:ring-3 focus:ring-blue-100"
                  />
                </label>
                {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-blue)] px-4 text-sm font-black text-white hover:bg-[var(--admin-blue-strong)] disabled:opacity-50"
                >
                  {busy === 'email' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Sign in
                </button>
              </form>
              {googleEnabled && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={async () => {
                      setBusy('google');
                      setError('');
                      const result = await authClient.signIn.social({
                        provider: 'google',
                        callbackURL: window.location.origin,
                      });
                      if (result?.error) {
                        setError(result.error.message || 'Could not start Google sign in.');
                        setBusy(null);
                      }
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy === 'google' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Continue with Google
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
