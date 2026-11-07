import 'server-only';
import { serverEnv } from '../server/env';
import { getAccessToken, renewAccessToken } from '../auth/session';
import { createApiClient, type ApiRequestOptions, type ApiResult } from './client';

export type { ApiRequestOptions, ApiResult, FieldError, ProblemDetails } from './client';

let request: ReturnType<typeof createApiClient> | undefined;

/**
 * Calls our API (KrakenD) with the signed-in user's token, from the server only. Retries,
 * timeouts, 401 → token renewal and Problem Details parsing: see lib/api/client.ts.
 *
 *   const result = await apiFetch<Deployment>(`/api/deployments/${id}`);
 *   if (!result.ok) { result.status, result.code, result.message, result.requestId }
 */
export function apiFetch<T>(path: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
  request ??= createApiClient({
    baseUrl: serverEnv().apiUrl,
    getToken: getAccessToken,
    renewToken: renewAccessToken,
  });
  return request<T>(path, options);
}
