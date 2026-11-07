/**
 * Prisma CLI config for the deployment-service (migrate, generate, studio).
 * The running app connects in src/prisma/prisma.service.ts from the same DB_* variables.
 *
 * Paths below are relative to THIS file. Every script passes it explicitly:
 *   prisma <command> --config apps/deployment-service/prisma.config.ts
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Read with plain process.env (not env()) so `prisma generate` works without a database configured.
const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_USER = '',
  DB_PASSWORD = '',
  DB_NAME = '',
  // Managed Postgres (production) requires TLS: DB_SSLMODE=require. Unset locally.
  DB_SSLMODE = '',
} = process.env;

const url =
  `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}` +
  (DB_SSLMODE ? `?sslmode=${encodeURIComponent(DB_SSLMODE)}` : '');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
});
