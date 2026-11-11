import 'server-only';
import { apiFetch } from './fetch';
import type { Paginated } from './types';

/** Response contract of deployment-service (mirrors libs/common in nest-microservice). */
export type DeploymentStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface Deployment {
  id: string;
  name: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The API's maximum page size (MAX_PAGE_SIZE in libs/common). */
export const MAX_PAGE_SIZE = 100;

export function listDeployments(params: { page: number; search?: string; limit?: number }) {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(params.limit ?? 10)));
  return apiFetch<Paginated<Deployment>>('/api/deployments', {
    query: { page: params.page, limit, search: params.search },
  });
}

/** Fields a user may set when creating a deployment (CreateDeploymentDto in libs/common). */
export interface CreateDeploymentInput {
  name: string;
  version: string;
  environment?: string;
  description?: string;
}

/**
 * POST /api/deployments (roles deployment:write / deployment:admin; the owner is the token's user).
 * Not retried (a create): callers wrap it in `once()` against double submits.
 */
export function createDeployment(input: CreateDeploymentInput) {
  return apiFetch<Deployment>('/api/deployments', {
    method: 'POST',
    // Field by field: nothing else from the caller reaches the API.
    body: {
      name: input.name,
      version: input.version,
      ...(input.environment ? { environment: input.environment } : {}),
      ...(input.description ? { description: input.description } : {}),
    },
  });
}
