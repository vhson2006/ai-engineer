import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getSite, listCategories, listSites } from '@web/core/api';
import { isSiteId } from './site-id';

/**
 * The sites of the signed-in user, ONCE per request (the sidebar, the overview and the page share
 * it). The API filters them (ADR 0028): a site admin gets theirs, a superadmin every site.
 */
export const mySites = cache(() => listSites());

/**
 * The site of a /sites/[siteId]/... page, or the 404 page: an unknown site and a site the user
 * doesn't belong to look the same (the API answers 404 for both).
 */
export const siteOr404 = cache(async (siteId: string) => {
  if (!isSiteId(siteId)) notFound();
  const result = await getSite(siteId);
  if (!result.ok && (result.status === 404 || result.status === 403)) notFound();
  return result;
});

export const siteCategories = cache((siteId: string) => listCategories(siteId));
