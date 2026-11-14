/**
 * Client roles of `deployments-api` in Keycloak (k8s/base/keycloak/realm.json).
 * KrakenD checks them per endpoint (k8s/base/krakend/config/krakend.tmpl); the service checks them again
 * with @Roles() and applies the ownership rule:
 *   READ  list and read deployments
 *   WRITE create deployments; update / delete the ones YOU created
 *   ADMIN update / delete anyone's deployment
 */
export const DEPLOYMENT_ROLES = {
  READ: 'deployment:read',
  WRITE: 'deployment:write',
  ADMIN: 'deployment:admin',
} as const;
