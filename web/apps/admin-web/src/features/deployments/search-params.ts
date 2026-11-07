import { createLoader, parseAsInteger, parseAsString } from 'nuqs/server';

/**
 * The deployments list state lives in the URL (?search=…&page=…): shareable, survives a reload,
 * read on the server by the page (loadDeploymentsParams) and updated by the toolbar (useQueryStates).
 */
export const deploymentsParams = {
  search: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

export const loadDeploymentsParams = createLoader(deploymentsParams);
