/**
 * Client roles of `content-api` in Keycloak (k8s/overlays/<env>/keycloak/realm-nest-microservice.json).
 * KrakenD checks them per endpoint (k8s/base/krakend/config/krakend.tmpl); content-service checks
 * them again with @Roles() and then applies the SITE rule (ADR 0025, see SITE_GROUP_PREFIX):
 *   READ     list and read the content of your sites (drafts included)
 *   WRITE    create and edit DRAFT articles and categories of your sites
 *   PUBLISH  publish, schedule, unpublish; edit or delete articles that are not drafts
 *   ADMIN    every site; create and edit the sites themselves
 */
export const CONTENT_ROLES = {
  READ: 'content:read',
  WRITE: 'content:write',
  PUBLISH: 'content:publish',
  ADMIN: 'content:admin',
} as const;

/**
 * A user manages the sites whose Keycloak group they belong to: `/sites/<siteId>` (or a subgroup
 * `/sites/<siteId>/<anything>`), from the token's `groups` claim. Interim rule until the per-site
 * roles of ADR 0028 are decided: the content roles apply to every site the user belongs to.
 */
export const SITE_GROUP_PREFIX = '/sites/';
