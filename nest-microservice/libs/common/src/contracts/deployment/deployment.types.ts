export const DEPLOYMENT_STATUSES = ['pending', 'running', 'succeeded', 'failed'] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

/**
 * What the deployment-service returns over the wire.
 * Dates are ISO strings: JSON has no Date type, so make that explicit in the contract.
 */
export interface DeploymentResponse {
  id: string;
  name: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  description: string | null;
  /** Keycloak user id (`sub`) of the creator; null for rows created before authentication. */
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
