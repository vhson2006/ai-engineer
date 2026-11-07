import { JetStreamManager, nanos, RetentionPolicy, StorageType, type StreamConfig } from 'nats';

/**
 * JetStream streams of the system (ADR 0007). Created/updated by the apps at startup
 * (`ensureStreams`), so a fresh cluster needs no manual step.
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

/** Creates missing streams and brings existing ones to the config above. Idempotent. */
export async function ensureStreams(jsm: JetStreamManager): Promise<void> {
  for (const config of STREAM_CONFIGS) {
    const name = config.name as string;
    try {
      await jsm.streams.info(name);
      await jsm.streams.update(name, config);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      await jsm.streams.add(config);
    }
  }
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
