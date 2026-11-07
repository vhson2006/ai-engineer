// Loaded FIRST by main.ts: tracing must start before http, express, pg and pino are required
// (ADR 0023). Import tracing directly, never the '@app/common' barrel (it would load pino first).
import { config } from 'dotenv';
import { startTracing } from '@app/common/observability/tracing';

config(); // local dev: OTEL_* from .env (the ConfigModule reads .env only later). No-op in the cluster.
startTracing('deployment-service');
