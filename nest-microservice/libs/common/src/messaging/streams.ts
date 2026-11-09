import { JetStreamManager, nanos, RetentionPolicy, StorageType, type StreamConfig } from 'nats';

/**
 * JetStream streams of the system (ADR 0007, ownership and budget: ADR 0024).
 *
 * ONE owner: the `nats-setup` app (`ensureStreams`), run before the services (k8s: Job
 * `nats-setup`; dev: `npm run nats:setup`, part of `start:dev`). Services never create or change a
 * stream: they wait for them (`waitForStreams`) and only create their OWN durable consumer.
 *
 * ONE shared `EVENTS` stream for every service: a new consumer is a durable consumer on it (no
 * storage reserved), not a new stream. JetStream reserves each stream's `max_bytes` up front, so
 * Σ max_bytes × num_replicas must fit `max_file_store` (k8s/components/nats/configmap.yaml), which
 * must fit the PVC: `streams.spec.ts` reads both and fails when it doesn't.
 *
 *   EVENTS  every fact a service publishes (subjects `events.<resource>.<past-tense-verb>`),
 *           kept 7 days: a consumer that was down catches up, a new consumer can replay.
 *   DLQ     messages a consumer gave up on (`dlq.<consumer>.<original subject>`), kept 30 days
 *           for inspection / replay by hand.
 *
 * Request/reply (`@MessagePattern`) subjects must stay OUTSIDE every stream (use `rpc.*`): a
 * stream would answer the request with its own PubAck.
 */
export const EVENTS_STREAM = 'EVENTS';
export const DLQ_STREAM = 'DLQ';

const DAY_MS = 24 * 3600 * 1000;

export const STREAM_CONFIGS: Partial<StreamConfig>[] = [
  {
    name: EVENTS_STREAM,
    subjects: ['events.>'],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    max_age: nanos(7 * DAY_MS),
    max_bytes: 500 * 1024 * 1024,
    // Same Nats-Msg-Id within this window → stored once (the outbox relay may publish twice).
    duplicate_window: nanos(10 * 60 * 1000),
    num_replicas: 1, // prod: 3 with a 3-node NATS cluster
  },
  {
    name: DLQ_STREAM,
    subjects: ['dlq.>'],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    max_age: nanos(30 * DAY_MS),
    max_bytes: 100 * 1024 * 1024,
    duplicate_window: nanos(10 * 60 * 1000),
    num_replicas: 1,
  },
];

/**
 * Creates missing streams and brings existing ones to the config above. Called by `nats-setup`
 * only. Idempotent, and safe if two runs overlap (a Job retry, two syncs, dev + a stray run):
 *
 * - Lost race on create: two processes both see "not found" and both `add`. NATS checks the
 *   storage reservation BEFORE noticing the stream already exists, so the loser gets
 *   "insufficient storage resources available" (10047), not "already exists". So on any `add`
 *   error we look again: if the stream exists now, someone else created it and we carry on.
 * - Update only when something differs: no write (and no reservation check) on a normal restart.
 */
export async function ensureStreams(jsm: Pick<JetStreamManager, 'streams'>): Promise<void> {
  for (const config of STREAM_CONFIGS) {
    await ensureStream(jsm, config);
  }
}

async function ensureStream(
  jsm: Pick<JetStreamManager, 'streams'>,
  config: Partial<StreamConfig>,
): Promise<void> {
  const name = config.name as string;
  let current = await currentConfig(jsm, name);
  if (!current) {
    try {
      await jsm.streams.add(config);
      return;
    } catch (error) {
      current = await currentConfig(jsm, name).catch(() => undefined);
      if (!current) throw error; // a real failure, not a lost race
    }
  }
  if (differs(current, config)) await jsm.streams.update(name, config);
}

async function currentConfig(
  jsm: Pick<JetStreamManager, 'streams'>,
  name: string,
): Promise<StreamConfig | undefined> {
  try {
    return (await jsm.streams.info(name)).config;
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

/**
 * Service side: waits until every stream exists (the setup Job may still be running, NATS may be
 * restarting), then returns. Never creates or changes a stream. Throws after `timeoutMs`, so the
 * pod restarts and says why instead of running without streams.
 */
export async function waitForStreams(
  jsm: Pick<JetStreamManager, 'streams'>,
  {
    timeoutMs = 120_000,
    intervalMs = 2_000,
    onWait,
  }: { timeoutMs?: number; intervalMs?: number; onWait?: (missing: string[]) => void } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const missing: string[] = [];
    for (const config of STREAM_CONFIGS) {
      const name = config.name as string;
      if (!(await currentConfig(jsm, name))) missing.push(name);
    }
    if (!missing.length) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `JetStream streams missing: ${missing.join(', ')}. They are created by nats-setup ` +
          '(k8s: Job nats-setup; dev: npm run nats:setup), never by the services (ADR 0024).',
      );
    }
    onWait?.(missing);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** Bytes JetStream reserves on disk for file streams: Σ max_bytes × num_replicas. */
export function reservedFileBytes(configs: Partial<StreamConfig>[] = STREAM_CONFIGS): number {
  return configs
    .filter((c) => c.storage === StorageType.File)
    .reduce((sum, c) => sum + (c.max_bytes ?? 0) * (c.num_replicas ?? 1), 0);
}

/** True when a field we set has another value on the server (fields we don't set are ignored). */
export function differs(current: StreamConfig, wanted: Partial<StreamConfig>): boolean {
  return Object.entries(wanted).some(
    ([key, value]) => JSON.stringify(current[key as keyof StreamConfig]) !== JSON.stringify(value),
  );
}

export function isNotFound(error: unknown): boolean {
  const e = error as { code?: string; api_error?: { err_code?: number }; message?: string };
  return (
    e?.code === '404' ||
    e?.api_error?.err_code === 10059 || // stream not found
    e?.api_error?.err_code === 10014 || // consumer not found
    /not found/i.test(e?.message ?? '')
  );
}
