import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWTPayload, jwtVerify, JWTVerifyGetKey } from 'jose';
import { AUTH_JWKS, AuthUser } from './auth.types';

interface KeycloakClaims extends JWTPayload {
  preferred_username?: string;
  email?: string;
  resource_access?: Record<string, { roles?: string[] }>;
  groups?: unknown;
}

/**
 * Verifies Keycloak access tokens LOCALLY: RS256 signature with the realm's public keys (JWKS,
 * fetched once and cached by jose, refetched when Keycloak rotates keys), plus iss, aud and exp.
 * No secret and no call to Keycloak per request.
 */
@Injectable()
export class JwtVerifier {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly rolesClient: string;

  constructor(
    @Inject(AUTH_JWKS) private readonly jwks: JWTVerifyGetKey,
    config: ConfigService,
  ) {
    this.issuer = config.getOrThrow<string>('AUTH_ISSUER');
    this.audience = config.getOrThrow<string>('AUTH_AUDIENCE');
    this.rolesClient = config.getOrThrow<string>('AUTH_ROLES_CLIENT');
  }

  /** Throws (any jose error) when the token is invalid, expired or not for this API. */
  async verify(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify<KeycloakClaims>(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ['RS256'], // never accept "none" or HMAC tokens
      clockTolerance: 5, // seconds, for small clock drift between Keycloak and this host
    });

    if (!payload.sub) {
      throw new Error('token has no sub');
    }

    const roles = payload.resource_access?.[this.rolesClient]?.roles;
    return {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: strings(roles),
      groups: strings(payload.groups),
    };
  }
}

/** The string items of a claim that should be a string array; anything else is ignored. */
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
