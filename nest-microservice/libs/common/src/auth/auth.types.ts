/** The caller, taken from a verified Keycloak access token. Read it with `@CurrentUser()`. */
export interface AuthUser {
  /** Keycloak user id (`sub`). Store THIS to reference a user, never the username or email. */
  id: string;
  username?: string;
  email?: string;
  /** Client roles of the API (`resource_access.<AUTH_ROLES_CLIENT>.roles`). */
  roles: string[];
}

/** DI token of the JWKS key resolver. Tests override it with a local key set. */
export const AUTH_JWKS = 'AUTH_JWKS';
