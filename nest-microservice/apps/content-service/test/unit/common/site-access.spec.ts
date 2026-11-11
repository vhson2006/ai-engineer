import { AuthUser, CONTENT_ROLES } from '@app/common';
import { canAccessSite, canPublish, memberSiteIds } from '../../../src/common/site-access';

const user = (roles: string[], groups: string[] = []): AuthUser => ({ id: 'u1', roles, groups });

describe('[site-access] (unit)', () => {
  it('reads site ids from /sites/<id> groups and their subgroups, once each', () => {
    const editor = user(
      [CONTENT_ROLES.READ],
      ['/sites/nails', '/sites/nails/editors', '/sites/wine/x', '/admins', '/sites/'],
    );
    expect(memberSiteIds(editor).sort()).toEqual(['nails', 'wine']);
  });

  it('lets members into their sites only, and content:admin everywhere', () => {
    const member = user([CONTENT_ROLES.READ], ['/sites/nails']);
    expect(canAccessSite(member, 'nails')).toBe(true);
    expect(canAccessSite(member, 'wine')).toBe(false);
    // A prefix is not membership: /sites/nails does not grant "nails-2".
    expect(canAccessSite(member, 'nails-2')).toBe(false);
    expect(canAccessSite(user([CONTENT_ROLES.ADMIN]), 'wine')).toBe(true);
  });

  it('publishing needs content:publish or content:admin', () => {
    expect(canPublish(user([CONTENT_ROLES.WRITE]))).toBe(false);
    expect(canPublish(user([CONTENT_ROLES.PUBLISH]))).toBe(true);
    expect(canPublish(user([CONTENT_ROLES.ADMIN]))).toBe(true);
  });
});
