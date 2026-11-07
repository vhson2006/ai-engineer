/**
 * INBOX (ADR 0007), consumer side of at-least-once delivery: the idempotent-consumer variant.
 * JetStream delivers a message AT LEAST once (redelivery after a crash before ack, a republish by
 * the producer's outbox relay...). The inbox makes its EFFECT happen once:
 *
 *   const done = await handleOnce(prisma, 'notification', messageId, subject, async (tx) => {
 *     ...work on THIS service's database, with tx...
 *   });
 *   // false → already processed earlier: just ack
 *
 * The id is recorded in `inbox_messages` in the SAME transaction as the work: both commit, or
 * neither (the message is then redelivered and processed again). Only ids are kept (not payloads):
 * JetStream already stores, redelivers and dead-letters the messages.
 *
 * Exactly-once applies to this database only. Side effects outside it (an email, an HTTP call)
 * can still happen twice if the process dies after them and before the commit: give them their
 * own idempotency key (provider-side) or accept the rare duplicate.
 */

/** What handleOnce needs from the service's Prisma client (structural: each service has its own). */
export interface InboxDb<Tx> {
  $transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
}
export interface InboxTx {
  inboxMessage: {
    createMany(args: {
      data: { consumer: string; messageId: string; subject: string }[];
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
  };
}

/** Runs `work` once per (consumer, messageId). Returns false for a duplicate (nothing done). */
export async function handleOnce<Tx extends InboxTx>(
  db: InboxDb<Tx>,
  consumer: string,
  messageId: string,
  subject: string,
  work: (tx: Tx) => Promise<void>,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.inboxMessage.createMany({
      data: [{ consumer, messageId, subject }],
      skipDuplicates: true, // INSERT ... ON CONFLICT DO NOTHING on the (consumer, message_id) key
    });
    if (count === 0) return false;
    await work(tx);
    return true;
  });
}
