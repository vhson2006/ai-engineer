import { Injectable, Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
  JETSTREAM,
  JetStreamModule,
  OutboxRelay,
  type JetStreamHandle,
  type OutboxRow,
  type OutboxStore,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';

/**
 * The outbox of this service (ADR 0007): rows of `outbox_messages`, written by services with
 * `addToOutbox(tx, …)` inside their transactions, published to JetStream by the relay.
 */
@Injectable()
export class PrismaOutboxStore implements OutboxStore {
  constructor(private readonly prisma: PrismaService) {}

  claimBatch(
    limit: number,
    publish: (
      rows: OutboxRow[],
    ) => Promise<{ published: string[]; failed?: { id: string; error: string } }>,
  ): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        // Locked until commit; another replica skips them (no double publish in parallel).
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, subject, payload, attempts FROM outbox_messages
          WHERE published_at IS NULL
          ORDER BY created_at, id
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED`;
        if (!rows.length) return 0;
        const { published, failed } = await publish(rows);
        if (published.length) {
          await tx.outboxMessage.updateMany({
            where: { id: { in: published } },
            data: { publishedAt: new Date() },
          });
        }
        if (failed) {
          await tx.outboxMessage.update({
            where: { id: failed.id },
            data: { attempts: { increment: 1 }, lastError: failed.error.slice(0, 500) },
          });
        }
        return published.length;
      },
      { timeout: 30_000 }, // publishing a batch: PubAcks are fast, a NATS reconnect isn't
    );
  }

  async deletePublishedBefore(before: Date): Promise<number> {
    const { count } = await this.prisma.outboxMessage.deleteMany({
      where: { publishedAt: { lt: before } },
    });
    return count;
  }
}

/** Starts / stops the relay with the app. Inject OutboxRelay to `poke()` it after a commit. */
@Injectable()
class OutboxRelayLifecycle implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(private readonly relay: OutboxRelay) {}
  onApplicationBootstrap(): void {
    this.relay.start();
  }
  onApplicationShutdown(): Promise<void> {
    return this.relay.stop();
  }
}

@Module({
  imports: [JetStreamModule.forRoot('ai-service')],
  providers: [
    PrismaOutboxStore,
    {
      provide: OutboxRelay,
      inject: [PrismaOutboxStore, JETSTREAM],
      useFactory: (store: PrismaOutboxStore, jetstream: JetStreamHandle) =>
        new OutboxRelay(store, jetstream.js),
    },
    OutboxRelayLifecycle,
  ],
  // JetStreamModule too: the consumers of this service share its connection (one per service).
  exports: [OutboxRelay, JetStreamModule],
})
export class OutboxModule {}
