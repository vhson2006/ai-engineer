import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseErrors } from '@app/common';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Public messages for this database's unique constraints (DB names from @@unique(map: ...)).
 * Anything not listed answers 409 "Resource already exists".
 */
const UNIQUE_MESSAGES: Record<string, string> = {
  pk_sites: 'A site with this id already exists',
  uq_categories_site_key: 'A category with this key already exists on this site',
  uq_category_translations_site_locale_slug:
    'A category of this site already uses this slug in this language',
  uq_article_translations_site_locale_slug:
    'An article of this site already uses this slug in this language',
};

/**
 * The service's ONLY database access. Inject it into services:
 *   this.prisma.article.findMany(...)
 *
 * It's a PrismaClient extended with `databaseErrors()` (libs/common/src/database): every failed
 * call throws a DatabaseError (unique → 409, not found → 404, DB down → 503...), mapped to HTTP by
 * the global exception filter. So services NEVER try/catch database errors.
 *
 * Abstract class = DI token + type; the instance comes from createPrismaClient (prisma.module.ts).
 * Same CONTENT_DB_* variables as the CLI config (../../prisma.config.ts). Keep the two in sync.
 */
export abstract class PrismaService extends PrismaClient {}

export function createPrismaClient(config: ConfigService): PrismaService {
  const client = new PrismaClient({
    adapter: new PrismaPg({
      host: config.getOrThrow<string>('CONTENT_DB_HOST'),
      port: config.getOrThrow<number>('CONTENT_DB_PORT'),
      user: config.getOrThrow<string>('CONTENT_DB_USER'),
      password: config.getOrThrow<string>('CONTENT_DB_PASSWORD'),
      database: config.getOrThrow<string>('CONTENT_DB_NAME'),
      // Fail a request quickly (503) instead of hanging when no connection can be opened.
      connectionTimeoutMillis: 5000,
    }),
  });
  // A query-only extension keeps the client's API and types unchanged.
  return client.$extends(
    databaseErrors({ uniqueMessages: UNIQUE_MESSAGES }),
  ) as unknown as PrismaService;
}
