import { createServer } from 'node:http';
import { AckPolicy, connect, DeliverPolicy, headers, nanos, type JetStreamClient, type JsMsg } from 'nats';
import pino from 'pino';
import { loadConfig } from './config';
import { DURABLE, EVENTS_STREAM, MESSAGE_ID_HEADER, VIDEO_RENDER_EVENTS } from './events';
import { Renderer } from './renderer';
import { ClipStorage } from './storage';
import { describe, processRender, type RenderPort, type StoragePort } from './worker';

/**
 * render-worker (ADR 0039): one durable JetStream consumer on `events.video-render.requested`,
 * ONE render at a time (CPU-bound; scale with replicas, which share the durable consumer). For each
 * message: render → upload → publish the answer (Nats-Msg-Id, deduplicated) → ack. A crash before
 * the ack redelivers the request: the render runs again and writes the same key. HTTP only for
 * /health. JSON logs (pino); never keys, tokens or signed URLs.
 */
const config = loadConfig();
const log = pino({ level: config.LOG_LEVEL, base: { service: 'render-worker' } });

let ready = false;
let stopping = false;

interface Deps {
  js: JetStreamClient;
  renderer: RenderPort;
  storage: StoragePort;
  assetOrigins: string[];
}

async function main() {
  const health = createServer((req, res) => {
    const ok = req.url === '/health' && ready && !stopping;
    res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: ok ? 'ok' : 'unavailable' }));
  });
  health.listen(config.RENDER_WORKER_PORT);

  const renderer = new Renderer(config.RENDER_CONCURRENCY, config.RENDER_IGNORE_CERT_ERRORS);
  log.info('preparing the browser and bundling the compositions');
  await renderer.start();

  // Reconnect forever: a NATS restart must never stop the worker for good.
  const nc = await connect({
    servers: config.NATS_URL,
    name: 'render-worker',
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
  });
  const jsm = await nc.jetstreamManager();
  const consumerConfig = {
    durable_name: DURABLE,
    ack_policy: AckPolicy.Explicit,
    // On first creation, new requests only: never render a backlog nobody waits for any more.
    deliver_policy: DeliverPolicy.New,
    filter_subject: VIDEO_RENDER_EVENTS.REQUESTED,
    ack_wait: nanos(config.RENDER_ACK_WAIT_MS),
    max_deliver: 3,
    max_ack_pending: 1,
  };
  try {
    await jsm.consumers.info(EVENTS_STREAM, DURABLE);
    // The deliver policy can't change after creation: update everything else.
    const updatable: Partial<typeof consumerConfig> = { ...consumerConfig };
    delete updatable.deliver_policy;
    await jsm.consumers.update(EVENTS_STREAM, DURABLE, updatable);
  } catch {
    await jsm.consumers.add(EVENTS_STREAM, consumerConfig);
  }

  const deps: Deps = {
    js: nc.jetstream(),
    renderer,
    storage: new ClipStorage(config),
    assetOrigins: [new URL(config.STORAGE_PUBLIC_BASE_URL).href],
  };
  const consumer = await deps.js.consumers.get(EVENTS_STREAM, DURABLE);
  const messages = await consumer.consume({ max_messages: 1 });
  ready = true;
  log.info({ stream: EVENTS_STREAM, durable: DURABLE }, 'waiting for render requests');

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    log.info('stopping after the current render');
    messages.stop();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  for await (const msg of messages) {
    await handle(msg, deps);
    if (stopping) break;
  }
  await nc.drain();
  health.close();
  log.info('stopped');
}

async function handle(msg: JsMsg, deps: Deps): Promise<void> {
  const id = msg.headers?.get(MESSAGE_ID_HEADER) || `${msg.info.stream}:${msg.seq}`;
  const msgLog = log.child({ messageId: id, attempt: msg.info.deliveryCount });
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(msg.data));
  } catch {
    msgLog.warn('not JSON: dropped');
    msg.term('not JSON');
    return;
  }
  // A render takes longer than the ack wait: tell JetStream we are still on it.
  let lastWorking = Date.now();
  const keepAlive = () => {
    if (Date.now() - lastWorking > 30_000) {
      msg.working();
      lastWorking = Date.now();
    }
  };
  try {
    const answer = await processRender(data, { ...deps, log: msgLog, onProgress: keepAlive });
    if (answer) {
      const h = headers();
      h.set(MESSAGE_ID_HEADER, answer.id);
      // Same id on a retry: JetStream drops the duplicate, the requester's inbox does the rest.
      await deps.js.publish(answer.subject, JSON.stringify(answer.payload), { msgID: answer.id, headers: h });
    }
    msg.ack();
  } catch (error) {
    // Upload or publish failed: again later (the render runs again, same key).
    msgLog.error({ err: describe(error) }, 'answer not delivered: retrying');
    msg.nak(30_000);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    log.fatal({ err: describe(error) }, 'render-worker crashed');
    process.exit(1);
  });
