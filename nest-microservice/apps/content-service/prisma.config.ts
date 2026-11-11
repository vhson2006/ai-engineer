/**
 * Prisma CLI config for the content-service (migrate, generate).
 * The running app connects in src/prisma/prisma.service.ts from the same CONTENT_DB_* variables.
 * Its own database ("content"): articles, categories, sites and the outbox (ADR 0026).
 *
 *   prisma <command> --config apps/content-service/prisma.config.ts
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Read with plain process.env (not env()) so `prisma generate` works without a database configured.
const {
  CONTENT_DB_HOST = 'localhost',
  CONTENT_DB_PORT = '5432',
  CONTENT_DB_USER = '',
  CONTENT_DB_PASSWORD = '',
  CONTENT_DB_NAME = '',
  CONTENT_DB_SSLMODE = '',
} = process.env;

const url =
  `postgresql://${encodeURIComponent(CONTENT_DB_USER)}:${encodeURIComponent(CONTENT_DB_PASSWORD)}` +
  `@${CONTENT_DB_HOST}:${CONTENT_DB_PORT}/${CONTENT_DB_NAME}` +
  (CONTENT_DB_SSLMODE ? `?sslmode=${encodeURIComponent(CONTENT_DB_SSLMODE)}` : '');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
});
