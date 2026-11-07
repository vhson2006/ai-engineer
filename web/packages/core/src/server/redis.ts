import 'server-only';
import Redis from 'ioredis';
import { serverEnv } from './env';

/**
 * One Redis connection per server process, as the ACL user in REDIS_URL
 * (redis://web:<password>@host:6379). That user may only GET/SET/DEL/GETDEL/INCR/EXPIRE/PING keys
 * under web:* (see k8s/components/local-data/redis/users.acl at the repo root).
 *
 * Resilience: a Redis restart (rollout, ACL change, failover) must never hang a request nor leave
 * the app broken until it restarts.
 * - Commands fail after COMMAND_TIMEOUT_MS instead of waiting in the offline queue forever.
 *   Callers turn a failure into a friendly answer (login → "session store unavailable", rate
 *   limit → fail open, session → signed out / "unavailable").
 * - Half-open connection: ioredis can reconnect while the new Redis isn't ready yet (through a
 *   port-forward or a load balancer) and end up "ready" on a socket that never answers; it only
 *   reconnects on a CLOSED socket, and neither a command timeout nor disconnect(true) closes it.
 *   So a health check PINGs every HEALTH_CHECK_MS and, when PING times out, retires the client:
 *   the next redis() call creates a fresh one (verified: recovers within ~5 s of Redis answering).
 */
const COMMAND_TIMEOUT_MS = 2_000;
const HEALTH_CHECK_MS = 5_000;

// Kept on globalThis so dev hot reloads don't leak sockets. The version replaces a client created
// with older options (it would otherwise survive every hot reload until `next dev` restarts).
const CLIENT_VERSION = 4;
const globalForRedis = globalThis as unknown as { redis?: Redis; redisVersion?: number };

export function redis(): Redis {
  if (globalForRedis.redis && globalForRedis.redisVersion === CLIENT_VERSION) return globalForRedis.redis;
  if (globalForRedis.redis) retire(globalForRedis.redis);
  globalForRedis.redis = createClient();
  globalForRedis.redisVersion = CLIENT_VERSION;
  return globalForRedis.redis;
}

function createClient(): Redis {
  const client = new Redis(serverEnv().redisUrl, {
    // The ready check runs INFO, which the least-privilege "web" user isn't allowed to run.
    enableReadyCheck: false,
    connectTimeout: 3_000,
    commandTimeout: COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2_000), // never gives up
  });

  let down = false;
  client.on('error', (error) => {
    if (down) return; // one line per outage, not one per retry
    down = true;
    console.error(`[redis] connection error, reconnecting: ${error.message || error.name}`);
  });
  client.on('ready', () => {
    if (down) console.warn('[redis] reconnected');
    down = false;
  });

  const health = setInterval(() => {
    if (client.status !== 'ready') return; // reconnecting by itself
    client.ping().catch(() => {
      console.warn('[redis] no answer to PING (half-open connection), replacing the client');
      clearInterval(health);
      if (globalForRedis.redis === client) globalForRedis.redis = undefined;
      retire(client);
    });
  }, HEALTH_CHECK_MS);
  health.unref();
  healthChecks.set(client, health);
  return client;
}

const healthChecks = new WeakMap<Redis, NodeJS.Timeout>();

function retire(client: Redis): void {
  clearInterval(healthChecks.get(client));
  client.disconnect();
  client.stream?.destroy(); // don't wait for a FIN the other side will never send
}
