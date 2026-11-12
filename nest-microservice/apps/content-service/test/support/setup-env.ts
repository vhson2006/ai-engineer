// Runs before each integration test file is imported. ConfigModule validates env at import time,
// so these must be set here, not inside the test. Nothing connects: Prisma and NATS are mocked.
process.env.NATS_URL = 'nats://localhost:4222';
process.env.LOG_LEVEL = 'silent';
process.env.CONTENT_PORT = '0';
process.env.CONTENT_DB_HOST = 'localhost';
process.env.CONTENT_DB_PORT = '5432';
process.env.CONTENT_DB_USER = 'test';
process.env.CONTENT_DB_PASSWORD = 'test';
process.env.CONTENT_DB_NAME = 'test';
// The integration tests sign its own tokens and overrides AUTH_JWKS with a local key set.
process.env.AUTH_ISSUER = 'http://keycloak.test/realms/test';
process.env.AUTH_JWKS_URL = 'http://keycloak.test/realms/test/protocol/openid-connect/certs';
process.env.AUTH_AUDIENCE = 'content-api';
process.env.AUTH_ROLES_CLIENT = 'content-api';
// Object storage (media library): never reached, OBJECT_STORAGE is an InMemoryObjectStorage.
process.env.STORAGE_PROVIDER = 'custom';
process.env.STORAGE_REGION = 'us-east-1';
process.env.STORAGE_ENDPOINT = 'http://storage.test';
process.env.STORAGE_ACCESS_KEY_ID = 'test';
process.env.STORAGE_SECRET_ACCESS_KEY = 'test';
process.env.STORAGE_PUBLIC_BUCKET = 'public';
process.env.STORAGE_PRIVATE_BUCKET = 'private';
process.env.STORAGE_PUBLIC_BASE_URL = 'https://cdn.test';
