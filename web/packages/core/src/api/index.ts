/**
 * Our API (KrakenD → nest-microservice), server side only. Import from '@web/core/api':
 *   fetch.ts        apiFetch: the one way to call the API (token, retries, errors)
 *   client.ts       the HTTP client behind it (unit tested)
 *   types.ts        shapes shared by every resource (Paginated)
 *   <resource>.ts   typed helpers + response types per API resource (deployments, files, content)
 */
export * from './fetch';
export * from './site-fetch';
export * from './types';
export * from './content';
export * from './deployments';
export * from './files';
export * from './studio';
export * from './ai-articles';
