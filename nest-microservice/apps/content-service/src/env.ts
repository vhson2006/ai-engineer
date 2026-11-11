// Loaded by main.ts right after instrument.ts, BEFORE the app module (ConfigModule validates env
// when the module is imported). In dev every service reads the same .env, whose AUTH_AUDIENCE is
// deployment-service's (deployments-api). content-service always verifies tokens for ITS OWN API:
// CONTENT_AUTH_AUDIENCE (default content-api) is both the expected `aud` and the roles client.
import { config } from 'dotenv';

config();
const audience = process.env.CONTENT_AUTH_AUDIENCE || 'content-api';
process.env.AUTH_AUDIENCE = audience;
process.env.AUTH_ROLES_CLIENT = audience;
