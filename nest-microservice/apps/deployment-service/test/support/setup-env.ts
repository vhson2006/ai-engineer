// Runs before each integration test file is imported. ConfigModule validates env at import time,
// so these must be set here, not inside the test. Nothing connects: Prisma and NATS are mocked.
process.env.NATS_URL = 'nats://localhost:4222';
process.env.LOG_LEVEL = 'silent'; // the access log is covered by unit tests
process.env.DEPLOYMENT_PORT = '0';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
// The integration tests sign its own tokens and overrides AUTH_JWKS with a local key set.
process.env.AUTH_ISSUER = 'http://keycloak.test/realms/test';
process.env.AUTH_JWKS_URL = 'http://keycloak.test/realms/test/protocol/openid-connect/certs';
process.env.AUTH_AUDIENCE = 'deployments-api';
process.env.AUTH_ROLES_CLIENT = 'deployments-api';
// Object storage: the integration test overrides OBJECT_STORAGE with InMemoryObjectStorage.
process.env.STORAGE_PROVIDER = 'custom';
process.env.STORAGE_REGION = 'us-east-1';
process.env.STORAGE_ENDPOINT = 'http://storage.test';
process.env.STORAGE_ACCESS_KEY_ID = 'test';
process.env.STORAGE_SECRET_ACCESS_KEY = 'test';
process.env.STORAGE_PUBLIC_BUCKET = 'test-public';
process.env.STORAGE_PRIVATE_BUCKET = 'test-private';
process.env.STORAGE_PUBLIC_BASE_URL = 'http://storage.test/test-public';
