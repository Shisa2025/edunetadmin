export function isAllowedAdmin(email: string | null | undefined, allowlist: readonly string[]): boolean {
  return Boolean(email && allowlist.includes(email.trim().toLowerCase()));
}
