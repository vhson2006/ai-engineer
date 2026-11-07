/**
 * Connection options shared by every NATS connection (ClientProxy and consumers).
 *
 * The nats.js defaults give up after 10 reconnect attempts, 2 s apart: ~20 s. After that the
 * connection is closed FOR GOOD while the process keeps running (and /health keeps answering
 * 200): a consumer silently stops receiving events, a publisher fails every emit. A NATS restart
 * (rollout, node replacement, JetStream recovering its streams) or a dev port-forward restart
 * easily takes longer. So:
 *
 * - reconnect forever, with jitter so N replicas don't reconnect in lockstep;
 * - waitOnFirstConnect: at startup, keep trying instead of crashing when NATS isn't up yet;
 * - a connection name, visible in NATS monitoring (/connz) to tell services apart.
 */
export function natsConnectionOptions(url: string, name: string) {
  return {
    servers: [url],
    name,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2_000,
    reconnectJitter: 500,
    waitOnFirstConnect: true,
  };
}
