import 'server-only';
import { getServiceToken, renewServiceToken } from '../auth/service-token';
import { createApiClient, type ApiRequestOptions, type ApiResult } from './client';

let request: ReturnType<typeof createApiClient> | undefined;

/**
 * Calls our API (KrakenD) as a PUBLIC SITE (its service account, ADR 0032), from the server only.
 * For what the site shows every visitor (published articles…), never for a user's own data:
 * that is apiFetch with the user's session. Same retries, timeouts and errors as apiFetch.
 */
export function siteApiFetch<T>(path: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
  const baseUrl = process.env.API_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('Missing environment variable API_URL (see .env.example)');
  request ??= createApiClient({
    baseUrl,
    getToken: getServiceToken,
    renewToken: renewServiceToken,
  });
  return request<T>(path, options);
}
