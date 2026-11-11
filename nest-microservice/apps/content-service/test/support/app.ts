import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUTH_JWKS, JETSTREAM, OutboxRelay } from '@app/common';
import { createLocalJWKSet, exportJWK, generateKeyPair, KeyLike, SignJWT } from 'jose';
import { ContentServiceModule } from '../../src/content-service.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { configureApp } from '../../src/setup';
import { createPrismaMock, PrismaMock } from './prisma-mock';

/**
 * Integration tests: the real content-service HTTP pipeline (prefix, AuthGuard, roles, site rule, validation,
 * problem details) with Prisma and NATS mocked. Tokens are REAL RS256 JWTs signed with a key pair
 * generated here; the service verifies them with the matching public key (AUTH_JWKS overridden),
 * exactly like Keycloak tokens for the content-api audience (roles + `groups`).
 */
export interface TestApp {
  app: INestApplication;
  prisma: PrismaMock;
  outbox: { poke: jest.Mock; start: jest.Mock; stop: jest.Mock };
  /** `Bearer <token>` for a caller with these content-api roles and group paths. */
  bearer(caller: TokenCaller): Promise<string>;
}

export interface TokenCaller {
  sub: string;
  roles: string[];
  groups: string[];
}

export async function createTestApp(): Promise<TestApp> {
  const kid = 'test-key';
  const pair = await generateKeyPair('RS256');
  const signingKey: KeyLike = pair.privateKey;
  const publicJwk = { ...(await exportJWK(pair.publicKey)), kid, alg: 'RS256' };
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn(), start: jest.fn(), stop: jest.fn() };
  const jetstream = { nc: { drain: jest.fn() }, js: { publish: jest.fn() }, jsm: {} };

  const moduleRef = await Test.createTestingModule({ imports: [ContentServiceModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(JETSTREAM)
    .useValue(jetstream)
    .overrideProvider(OutboxRelay)
    .useValue(outbox)
    .overrideProvider(AUTH_JWKS)
    .useValue(createLocalJWKSet({ keys: [publicJwk] }))
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const audience = process.env.AUTH_AUDIENCE!;
  const bearer = async (caller: TokenCaller) =>
    `Bearer ${await new SignJWT({
      preferred_username: caller.sub,
      resource_access: { [audience]: { roles: caller.roles } },
      groups: caller.groups,
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setSubject(caller.sub)
      .setIssuer(process.env.AUTH_ISSUER!)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(signingKey)}`;

  return { app, prisma, outbox, bearer };
}

/** The fixture callers as token claims (`sub` = AuthUser id). */
export function asToken(user: { id: string; roles: string[]; groups: string[] }): TokenCaller {
  return { sub: user.id, roles: user.roles, groups: user.groups };
}
