import { describe, expect, it } from 'vitest';
import { hasClientRole, isSuperadmin, memberSiteIds } from './roles';

describe('roles', () => {
  const user = {
    clientRoles: { 'admin-web': ['admin'], 'content-api': ['content:read', 'content:write'] },
    groups: ['/site-admins', '/sites/nails', '/sites/wine', '/sites/a/b', '/sites/'],
  };

  it('reads client roles, roles with a colon included', () => {
    expect(hasClientRole(user, 'admin-web:admin')).toBe(true);
    expect(hasClientRole(user, 'content-api:content:write')).toBe(true);
    expect(hasClientRole(user, 'content-api:content:admin')).toBe(false);
    expect(hasClientRole(user, 'admin')).toBe(false);
    expect(hasClientRole(null, 'admin-web:admin')).toBe(false);
  });

  it('superadmin only with admin-web:superadmin', () => {
    expect(isSuperadmin(user)).toBe(false);
    expect(isSuperadmin({ clientRoles: { 'admin-web': ['admin', 'superadmin'] } })).toBe(true);
    expect(isSuperadmin({})).toBe(false); // a session from before the change
  });

  it('site ids from /sites/<id> groups only', () => {
    expect(memberSiteIds(user)).toEqual(['nails', 'wine']);
    expect(memberSiteIds(undefined)).toEqual([]);
  });
});
