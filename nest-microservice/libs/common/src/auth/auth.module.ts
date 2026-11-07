import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import { AuthGuard } from './auth.guard';
import { AUTH_JWKS } from './auth.types';
import { JwtVerifier } from './jwt-verifier.service';

/**
 * Import once in a REST service's root module: every route then requires a valid Keycloak
 * access token (see AuthGuard). Needs the global ConfigModule with:
 *   AUTH_ISSUER        token `iss`, e.g. http://auth.localtest.me:8000/realms/nest-microservice
 *   AUTH_JWKS_URL      the realm's certs endpoint (public keys)
 *   AUTH_AUDIENCE      expected `aud`, e.g. deployments-api
 *   AUTH_ROLES_CLIENT  client whose roles are read from resource_access, e.g. deployments-api
 */
@Module({
  providers: [
    {
      provide: AUTH_JWKS,
      inject: [ConfigService],
      // Lazy: nothing is fetched until the first token is verified; then cached.
      useFactory: (config: ConfigService) =>
        createRemoteJWKSet(new URL(config.getOrThrow<string>('AUTH_JWKS_URL'))),
    },
    JwtVerifier,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [JwtVerifier],
})
export class AuthModule {}
