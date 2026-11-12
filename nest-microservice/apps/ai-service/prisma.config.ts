/**
 * Prisma CLI config for the ai-service (migrate, generate).
 * The running app connects in src/prisma/prisma.module.ts from the same AI_DB_* variables.
 * Its own database ("ai"): inbox, outbox and the usage ledger (ADR 0036).
 *
 *   prisma <command> --config apps/ai-service/prisma.config.ts
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Read with plain process.env (not env()) so `prisma generate` works without a database configured.
const {
  AI_DB_HOST = 'localhost',
  AI_DB_PORT = '5432',
  AI_DB_USER = '',
  AI_DB_PASSWORD = '',
  AI_DB_NAME = '',
  AI_DB_SSLMODE = '',
} = process.env;

const url =
  `postgresql://${encodeURIComponent(AI_DB_USER)}:${encodeURIComponent(AI_DB_PASSWORD)}` +
  `@${AI_DB_HOST}:${AI_DB_PORT}/${AI_DB_NAME}` +
  (AI_DB_SSLMODE ? `?sslmode=${encodeURIComponent(AI_DB_SSLMODE)}` : '');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
});
