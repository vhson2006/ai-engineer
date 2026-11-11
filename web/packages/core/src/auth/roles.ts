/**
 * Reading roles and groups of a session user, for DISPLAY only (which menu items, which buttons).
 * The API decides every access again from the token (ADR 0002): never skip a call because of this.
 * No 'server-only': pure functions on SessionUser data.
 */
export interface RoleHolder {
  clientRoles?: Record<string, string[]>;
  groups?: string[];
}

/** `client:role`, e.g. `admin-web:superadmin` (split at the FIRST colon: content roles have one). */
export function hasClientRole(user: RoleHolder | null | undefined, clientRole: string): boolean {
  const i = clientRole.indexOf(':');
  if (i <= 0 || !user?.clientRoles) return false;
  return (user.clientRoles[clientRole.slice(0, i)] ?? []).includes(clientRole.slice(i + 1));
}

/** Manages every site and the system pages of admin-web (ADR 0030). */
export function isSuperadmin(user: RoleHolder | null | undefined): boolean {
  return hasClientRole(user, 'admin-web:superadmin');
}

/** Ids of the sites the user belongs to (groups `/sites/<id>`, ADR 0028). */
export function memberSiteIds(user: RoleHolder | null | undefined): string[] {
  return (user?.groups ?? [])
    .filter((g) => g.startsWith('/sites/') && g.length > '/sites/'.length && !g.slice(7).includes('/'))
    .map((g) => g.slice('/sites/'.length));
}
