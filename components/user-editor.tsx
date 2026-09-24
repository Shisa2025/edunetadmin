'use client';

import { KeyRound, LoaderCircle, LogOut, Save, TriangleAlert, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import { dangerButton, errorMessage, fieldClass, primaryButton, secondaryButton } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import type { School, UserDetail, UserRole } from '@/lib/admin-types';

type Draft = {
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  signupReferralCode: string;
  hasProfile: boolean;
  role: UserRole;
  schoolId: string;
  onboardingCompleted: boolean;
};

function toDraft(detail: UserDetail): Draft {
  return {
    name: detail.user.name,
    email: detail.user.email,
    emailVerified: detail.user.emailVerified,
    image: detail.user.image ?? '',
    signupReferralCode: detail.user.signupReferralCode ?? '',
    hasProfile: Boolean(detail.profile),
    role: detail.profile?.role ?? 'student',
    schoolId: detail.profile?.schoolId ?? '',
    onboardingCompleted: detail.profile?.onboardingCompleted ?? false,
  };
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

const labelClass = 'block text-sm font-bold text-slate-700';
const sectionClass = 'rounded-2xl border border-slate-200 bg-white p-4';
const sectionTitle = 'text-xs font-black uppercase tracking-[0.15em] text-cyan-600';

export function UserEditor({ userId, schools, onClose, onSaved }: {
  userId: string;
  schools: School[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<'' | 'profile' | 'password' | 'sessions'>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeSessions, setRevokeSessions] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest<UserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`)
      .then((result) => { if (active) { setDetail(result); setDraft(toDraft(result)); } })
      .catch((requestError) => { if (active) setLoadError(errorMessage(requestError)); });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape' && !busy) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current && { ...current, [key]: value });
  }

  async function run(kind: 'profile' | 'password' | 'sessions', request: () => Promise<UserDetail>, message: string) {
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      const result = await request();
      setDetail(result);
      setDraft(toDraft(result));
      setNotice(message);
      await onSaved(message);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy('');
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    void run('profile', () => apiRequest<UserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: draft.name,
        email: draft.email,
        emailVerified: draft.emailVerified,
        image: draft.image,
        signupReferralCode: draft.signupReferralCode,
        profile: draft.hasProfile
          ? { role: draft.role, schoolId: draft.schoolId, onboardingCompleted: draft.onboardingCompleted }
          : null,
      }),
    }), `Saved ${draft.name.trim()}'s profile.`);
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run('password', async () => {
      const result = await apiRequest<UserDetail>(`/api/admin/users/${encodeURIComponent(userId)}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password, revokeSessions }),
      });
      setPassword('');
      setConfirmPassword('');
      return result;
    }, `Set a new password for ${detail?.user.name ?? 'this user'}.`);
  }

  function signOutEverywhere() {
    void run('sessions', () => apiRequest<UserDetail>(`/api/admin/users/${encodeURIComponent(userId)}/sessions`, {
      method: 'DELETE',
    }), `Signed ${detail?.user.name ?? 'this user'} out of every device.`);
  }

  const assignmentsWillReset = Boolean(detail?.profile && draft?.hasProfile
    && (draft.role !== detail.profile.role || draft.schoolId !== detail.profile.schoolId)
    && (detail.classAssignment || detail.teachingScopeCount > 0));
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="user-editor-title" className="w-full max-w-3xl rounded-3xl bg-slate-50 shadow-2xl">
        <header className="flex items-start gap-3 rounded-t-3xl bg-[var(--admin-blue)] px-5 py-4 text-white sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Edit user</p>
            <h2 id="user-editor-title" className="mt-1 truncate text-xl font-black">{detail?.user.name ?? 'Loading…'}</h2>
            {detail && <p className="truncate text-xs text-blue-100">ID {detail.user.id}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(busy)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-4 sm:p-6">
          {loadError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{loadError}</p>}
          {!detail && !loadError && <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-[var(--admin-blue)]" /></div>}
          {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

          {detail && draft && (
            <>
              <form onSubmit={saveProfile} className="space-y-4">
                <section className={sectionClass}>
                  <p className={sectionTitle}>Account</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Name
                      <input required maxLength={120} value={draft.name} onChange={(event) => update('name', event.target.value)} className={`${fieldClass} mt-1 w-full`} />
                    </label>
                    <label className={labelClass}>Email
                      <input required type="email" maxLength={320} value={draft.email} onChange={(event) => update('email', event.target.value)} className={`${fieldClass} mt-1 w-full`} />
                    </label>
                    <label className={labelClass}>Image URL
                      <input maxLength={2048} value={draft.image} onChange={(event) => update('image', event.target.value)} placeholder="None" className={`${fieldClass} mt-1 w-full`} />
                    </label>
                    <label className={labelClass}>Signup referral code
                      <input maxLength={64} value={draft.signupReferralCode} onChange={(event) => update('signupReferralCode', event.target.value)} placeholder="None" className={`${fieldClass} mt-1 w-full`} />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={draft.emailVerified} onChange={(event) => update('emailVerified', event.target.checked)} className="h-4 w-4 accent-[var(--admin-blue)]" />
                    Email verified
                  </label>
                  {draft.email.trim().toLowerCase() !== detail.user.email.toLowerCase() && detail.signInMethods.some(({ providerId }) => providerId === 'google') && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">This user signs in with Google. Google sign-in is tied to their Google account, not to this email field.</p>
                  )}
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={sectionTitle}>School profile</p>
                    {!detail.profile && (
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={draft.hasProfile} onChange={(event) => update('hasProfile', event.target.checked)} className="h-4 w-4 accent-[var(--admin-blue)]" />
                        Create profile
                      </label>
                    )}
                  </div>
                  {!draft.hasProfile ? (
                    <p className="mt-2 text-sm text-slate-500">This user has no school profile yet, so they have no role or school.</p>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className={labelClass}>Role
                          <select value={draft.role} onChange={(event) => update('role', event.target.value as UserRole)} className={`${fieldClass} mt-1 w-full`}>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                          </select>
                        </label>
                        <label className={labelClass}>School
                          <select required value={draft.schoolId} onChange={(event) => update('schoolId', event.target.value)} className={`${fieldClass} mt-1 w-full`}>
                            <option value="" disabled>Select a school…</option>
                            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={draft.onboardingCompleted} onChange={(event) => update('onboardingCompleted', event.target.checked)} className="h-4 w-4 accent-[var(--admin-blue)]" />
                        Onboarding completed
                        {detail.profile?.onboardingCompletedAt && <span className="text-xs font-normal text-slate-500">({formatDate(detail.profile.onboardingCompletedAt)})</span>}
                      </label>
                      <p className="mt-3 text-sm text-slate-600">
                        {detail.profile?.role === 'teacher'
                          ? `${detail.teachingScopeCount} teaching assignment${detail.teachingScopeCount === 1 ? '' : 's'}`
                          : `Class: ${detail.classAssignment?.className ?? 'Unassigned'}`}
                      </p>
                      {assignmentsWillReset && (
                        <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                          Changing the role or school removes this user&apos;s current Class and teaching assignments. Reassign them at the new school afterwards.
                        </p>
                      )}
                    </>
                  )}
                </section>

                <div className="flex justify-end">
                  <button type="submit" disabled={Boolean(busy) || (draft.hasProfile && !draft.schoolId)} className={primaryButton}>
                    {busy === 'profile' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
                  </button>
                </div>
              </form>

              <form onSubmit={savePassword} className={sectionClass}>
                <p className={sectionTitle}>Password</p>
                <p className="mt-1 text-sm text-slate-500">
                  {detail.hasPassword ? 'Replace this user\'s email/password login.' : 'This user has no password yet. Setting one lets them sign in with email and password.'}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>New password
                    <input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldClass} mt-1 w-full`} />
                  </label>
                  <label className={labelClass}>Confirm password
                    <input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${fieldClass} mt-1 w-full`} />
                  </label>
                </div>
                {passwordMismatch && <p className="mt-2 text-sm font-semibold text-red-700">Passwords do not match.</p>}
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={revokeSessions} onChange={(event) => setRevokeSessions(event.target.checked)} className="h-4 w-4 accent-[var(--admin-blue)]" />
                    Sign the user out of every device
                  </label>
                  <button type="submit" disabled={Boolean(busy) || password.length < 8 || password !== confirmPassword} className={primaryButton}>
                    {busy === 'password' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Set password
                  </button>
                </div>
              </form>

              <section className={sectionClass}>
                <p className={sectionTitle}>Sign-in &amp; sessions</p>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="font-bold text-slate-500">Sign-in methods</dt><dd className="text-slate-800">{detail.signInMethods.map(({ providerId }) => providerId === 'credential' ? 'Email & password' : providerId).join(', ') || 'None'}</dd></div>
                  <div><dt className="font-bold text-slate-500">Active sessions</dt><dd className="text-slate-800">{detail.activeSessions}</dd></div>
                  <div><dt className="font-bold text-slate-500">Created</dt><dd className="text-slate-800">{formatDate(detail.user.createdAt)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Last updated</dt><dd className="text-slate-800">{formatDate(detail.user.updatedAt)}</dd></div>
                </dl>
                <div className="mt-4 flex justify-end">
                  <button type="button" disabled={Boolean(busy) || detail.activeSessions === 0} onClick={signOutEverywhere} className={dangerButton}>
                    {busy === 'sessions' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out everywhere
                  </button>
                </div>
              </section>

              <div className="flex justify-end">
                <button type="button" onClick={onClose} disabled={Boolean(busy)} className={secondaryButton}>Done</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
