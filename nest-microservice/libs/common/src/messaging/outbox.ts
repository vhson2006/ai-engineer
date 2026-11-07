import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { headers as natsHeaders, type JetStreamClient } from 'nats';
import { outboxPublished, outboxPublishFailures } from '../observability/metrics';

/**
 * Transactional OUTBOX (ADR 0007), producer side of at-least-once delivery.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const row = await tx.deployment.create(...);
 *     await addToOutbox(tx, DEPLOYMENT_EVENTS.CREATED, event);   // SAME transaction
 *   });
 *   relay.poke();                                                // publish now, not at the next poll
 *
 * The message is committed together with the data, or not at all: no event for data that was
 * rolled back, and no data without its event (a crash after commit only delays the publish).
 * `OutboxRelay` then publishes every unpublished row to JetStream with `Nats-Msg-Id` = row id, and
 * marks it published after the PubAck. A crash between PubAck and the mark republishes the row:
 * JetStream stores it once (duplicate window), and consumers dedupe on the same id (inbox).
 *
 * Table `outbox_messages` in the service's OWN database (Prisma model `OutboxMessage`, see
 * deployment-service/prisma/schema.prisma for the reference definition).
 */

/** What addToOutbox needs from a Prisma transaction client (structural: each service has its own client). */
export interface OutboxWriter {
  outboxMessage: {
    create(args: { data: { id: string; subject: string; payload: object } }): Promise<unknown>;
  };
}

/** Writes a message in the caller's transaction. Returns its id (= message id end to end). */
export async function addToOutbox(
  tx: OutboxWriter,
  subject: string,
  payload: object,
): Promise<string> {
  const id = randomUUID();
  await tx.outboxMessage.create({ data: { id, subject, payload } });
  return id;
}

export interface OutboxRow {
  id: string;
  subject: string;
  payload: unknown;
  attempts: number;
}

/**
 * Database access of the relay, implemented per service with its Prisma client.
 * `claimBatch` must lock the rows it returns (`FOR UPDATE SKIP LOCKED` inside a transaction), so
 * several replicas never publish the same row at the same time, and call `publish` for them
 * before committing.
 */
export interface OutboxStore {
  /** Locks up to `limit` unpublished rows (oldest first), lets `publish` handle them, records the result. */
  claimBatch(
    limit: number,
    publish: (
      rows: OutboxRow[],
    ) => Promise<{ published: string[]; failed?: { id: string; error: string } }>,
  ): Promise<number>;
  /** Deletes published rows older than `before` (keeps the table small). */
  deletePublishedBefore(before: Date): Promise<number>;
}

/** Header carrying the message id; JetStream dedupes on it. Consumers read the same header. */
export const MESSAGE_ID_HEADER = 'Nats-Msg-Id';

export interface OutboxRelayOptions {
  /** Poll interval when idle (a poke() publishes immediately anyway). */
  pollMs?: number;
  batchSize?: number;
  /** Published rows are deleted after this long. */
  retentionMs?: number;
}

/**
 * Publishes the outbox to JetStream. Order is kept: rows are published oldest first and a batch
 * stops at the first failure (retried at the next poll, with `attempts` / `last_error` recorded).
 * Safe with several replicas (row locks). Start it on bootstrap, stop it on shutdown.
 */
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private again = false;
  private stopped = true;
  private lastCleanup = 0;
  private readonly pollMs: number;
  private readonly batchSize: number;
  private readonly retentionMs: number;

  constructor(
    private readonly store: OutboxStore,
    private readonly js: Pick<JetStreamClient, 'publish'>,
    options: OutboxRelayOptions = {},
  ) {
    this.pollMs = options.pollMs ?? 1000;
    this.batchSize = options.batchSize ?? 100;
    this.retentionMs = options.retentionMs ?? 7 * 24 * 3600 * 1000;
  }

  start(): void {
    this.stopped = false;
    this.schedule(0);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    while (this.running) await new Promise((r) => setTimeout(r, 20));
  }

  /** Something was just committed: publish now instead of at the next poll. */
  poke(): void {
    if (this.stopped) return;
    if (this.running) this.again = true;
    else this.schedule(0);
  }

  /** One pass: publishes every pending row (batch after batch). Returns how many were published. */
  async runOnce(): Promise<number> {
    let total = 0;
    for (;;) {
      let failedBatch = false;
      const count = await this.store.claimBatch(this.batchSize, async (rows) => {
        const published: string[] = [];
        for (const row of rows) {
          try {
            const h = natsHeaders();
            h.set(MESSAGE_ID_HEADER, row.id);
            await this.js.publish(row.subject, JSON.stringify(row.payload), {
              msgID: row.id,
              headers: h,
            });
            published.push(row.id);
            outboxPublished.inc({ subject: row.subject });
          } catch (error) {
            failedBatch = true;
            outboxPublishFailures.inc({ subject: row.subject });
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Publishing ${row.subject} (${row.id}) failed, will retry: ${message}`,
            );
            return { published, failed: { id: row.id, error: message } }; // keep the order
          }
        }
        return { published };
      });
      total += count;
      if (failedBatch || count < this.batchSize) return total;
    }
  }

  private schedule(ms: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = true;
    let delay = this.pollMs;
    try {
      await this.runOnce();
      if (Date.now() - this.lastCleanup > 3600_000) {
        this.lastCleanup = Date.now();
        await this.store.deletePublishedBefore(new Date(Date.now() - this.retentionMs));
      }
    } catch (error) {
      // Database down: try again later, with a longer pause.
      delay = Math.max(this.pollMs, 5000);
      this.logger.warn(
        `Outbox pass failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
    if (this.again) {
      this.again = false;
      delay = 0;
    }
    if (!this.stopped) this.schedule(delay);
  }
}
