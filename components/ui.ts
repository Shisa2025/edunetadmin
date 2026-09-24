export const fieldClass = 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[var(--admin-blue)] focus:ring-3 focus:ring-blue-100 disabled:bg-slate-100';
export const primaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--admin-blue)] px-4 text-sm font-black text-white hover:bg-[var(--admin-blue-strong)] disabled:cursor-not-allowed disabled:opacity-45';
export const secondaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45';
export const dangerButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45';

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}
