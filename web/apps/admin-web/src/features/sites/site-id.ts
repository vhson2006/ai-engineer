/** Site ids are slugs (content-service SiteDto): checked before they go into an API path. */
const SITE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSiteId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 50 && SITE_ID.test(value);
}
