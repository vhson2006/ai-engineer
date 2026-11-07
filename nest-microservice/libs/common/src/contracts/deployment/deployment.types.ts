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
  /**
   * Incremented by every update; also sent as the ETag header ("<revision>"). To update, send it
   * back: `If-Match: "<revision>"`. 412 = someone changed it since: GET again and retry.
   */
  revision: number;
  createdAt: string;
  updatedAt: string;
}
