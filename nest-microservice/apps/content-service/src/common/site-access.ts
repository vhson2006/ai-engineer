import { AuthUser, CONTENT_ROLES, SITE_GROUP_PREFIX } from '@app/common';

/**
 * The SITE rule of ADR 0025 (interim form, see SITE_GROUP_PREFIX): a user manages the sites whose
 * Keycloak group `/sites/<siteId>` (or a subgroup of it) is in the token; `content:admin` manages
 * every site. Roles say WHAT a user may do, this says WHERE.
 */
export function managesAllSites(user: AuthUser): boolean {
  return user.roles.includes(CONTENT_ROLES.ADMIN);
}

/** Site ids from the token's group paths: `/sites/nails` and `/sites/nails/editors` → `nails`. */
export function memberSiteIds(user: AuthUser): string[] {
  const ids = user.groups
    .filter((path) => path.startsWith(SITE_GROUP_PREFIX))
    .map((path) => path.slice(SITE_GROUP_PREFIX.length).split('/')[0])
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

export function canAccessSite(user: AuthUser, siteId: string): boolean {
  return managesAllSites(user) || memberSiteIds(user).includes(siteId);
}

/** Publishing (and changing what is live) needs content:publish, or content:admin. */
export function canPublish(user: AuthUser): boolean {
  return user.roles.includes(CONTENT_ROLES.PUBLISH) || managesAllSites(user);
}
