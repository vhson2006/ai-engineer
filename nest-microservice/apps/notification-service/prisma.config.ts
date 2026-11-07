/**
 * Prisma CLI config for the notification-service (migrate, generate).
 * The running app connects in src/prisma/prisma.service.ts from the same NOTIFICATION_DB_* variables.
 * Its own database ("notification"): a service owns its tables (ADR 0001); here only the inbox.
 *
 *   prisma <command> --config apps/notification-service/prisma.config.ts
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Read with plain process.env (not env()) so `prisma generate` works without a database configured.
const {
  NOTIFICATION_DB_HOST = 'localhost',
  NOTIFICATION_DB_PORT = '5432',
  NOTIFICATION_DB_USER = '',
  NOTIFICATION_DB_PASSWORD = '',
  NOTIFICATION_DB_NAME = '',
  NOTIFICATION_DB_SSLMODE = '',
} = process.env;

const url =
  `postgresql://${encodeURIComponent(NOTIFICATION_DB_USER)}:${encodeURIComponent(NOTIFICATION_DB_PASSWORD)}` +
  `@${NOTIFICATION_DB_HOST}:${NOTIFICATION_DB_PORT}/${NOTIFICATION_DB_NAME}` +
  (NOTIFICATION_DB_SSLMODE ? `?sslmode=${encodeURIComponent(NOTIFICATION_DB_SSLMODE)}` : '');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
});
