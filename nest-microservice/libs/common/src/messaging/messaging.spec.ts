import type { JsMsg } from 'nats';
import { headers as natsHeaders } from 'nats';
import { consumerMessages, outboxPublished, outboxPublishFailures } from '../observability/metrics';
import { JetStreamConsumer, PermanentMessageError } from './consumer';
import { handleOnce, type InboxTx } from './inbox';
import type { JetStreamHandle } from './jetstream.module';
import {
  addToOutbox,
  MESSAGE_ID_HEADER,
  OutboxRelay,
  type OutboxRow,
  type OutboxStore,
} from './outbox';

describe('[messaging] outbox', () => {
  it('addToOutbox writes the message in the given transaction and returns its id', async () => {
    const tx = { outboxMessage: { create: jest.fn() } };
    const id = await addToOutbox(tx, 'events.thing.created', { a: 1 });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(tx.outboxMessage.create).toHaveBeenCalledWith({
      data: { id, subject: 'events.thing.created', payload: { a: 1 } },
    });
  });

  /** In-memory store with the same contract as the Prisma one. */
  function memoryStore(rows: OutboxRow[]) {
    const published = new Set<string>();
    const failures: Record<string, string> = {};
    const store: OutboxStore = {
      claimBatch: async (limit, publish) => {
        const batch = rows.filter((r) => !published.has(r.id)).slice(0, limit);
        if (!batch.length) return 0;
        const result = await publish(batch);
        result.published.forEach((id) => published.add(id));
        if (result.failed) failures[result.failed.id] = result.failed.error;
        return result.published.length;
      },
      deletePublishedBefore: () => Promise.resolve(0),
    };
    return { store, published, failures };
  }
  const row = (id: string): OutboxRow => ({
    id,
    subject: `events.x.${id}`,
    payload: { id },
    attempts: 0,
  });

  it('publishes every pending row in order, with Nats-Msg-Id = row id', async () => {
    const { store, published } = memoryStore([row('a'), row('b'), row('c')]);
    const js = { publish: jest.fn().mockResolvedValue({ seq: 1, duplicate: false }) };

    const count = await new OutboxRelay(store, js, { batchSize: 2 }).runOnce();

    expect(count).toBe(3);
    expect([...published]).toEqual(['a', 'b', 'c']);
    expect(js.publish.mock.calls.map((c) => c[0])).toEqual([
      'events.x.a',
      'events.x.b',
      'events.x.c',
    ]);
    const [, data, opts] = js.publish.mock.calls[0];
    expect(JSON.parse(data)).toEqual({ id: 'a' });
    expect(opts.msgID).toBe('a');
    expect((opts.headers as { get(k: string): string }).get(MESSAGE_ID_HEADER)).toBe('a');
  });

  it('stops at the first failure (order kept), records it, and retries it on the next pass', async () => {
    const { store, published, failures } = memoryStore([row('a'), row('b'), row('c')]);
    const js = {
      publish: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('503 No Responders'))
        .mockResolvedValue({}),
    };
    const relay = new OutboxRelay(store, js);

    expect(await relay.runOnce()).toBe(1);
    expect([...published]).toEqual(['a']);
    expect(failures).toEqual({ b: '503 No Responders' });
    expect(await relay.runOnce()).toBe(2); // b then c: nothing lost, still in order
    expect([...published]).toEqual(['a', 'b', 'c']);
  });

  it('counts published rows and failed attempts by subject', async () => {
    outboxPublished.reset();
    outboxPublishFailures.reset();
    const { store } = memoryStore([row('a'), row('b')]);
    const js = {
      publish: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('down')),
    };

    await new OutboxRelay(store, js).runOnce();

    const values = async (c: typeof outboxPublished) =>
      (await c.get()).values.map((v) => [v.labels.subject, v.value]);
    expect(await values(outboxPublished)).toEqual([['events.x.a', 1]]);
    expect(await values(outboxPublishFailures)).toEqual([['events.x.b', 1]]);
  });
});

describe('[messaging] inbox', () => {
  function memoryDb() {
    const seen = new Set<string>();
    const tx: InboxTx = {
      inboxMessage: {
        createMany: ({ data }) => {
          const key = `${data[0].consumer}/${data[0].messageId}`;
          if (seen.has(key)) return Promise.resolve({ count: 0 });
          seen.add(key);
          return Promise.resolve({ count: 1 });
        },
      },
    };
    // A failing `work` must roll the inbox row back too (one transaction).
    const db = {
      $transaction: async <R>(fn: (t: InboxTx) => Promise<R>): Promise<R> => {
        const before = new Set(seen);
        try {
          return await fn(tx);
        } catch (error) {
          seen.clear();
          before.forEach((k) => seen.add(k));
          throw error;
        }
      },
    };
    return { db, seen };
  }

  it('runs the work once per (consumer, message id); a redelivery is skipped', async () => {
    const { db } = memoryDb();
    const work = jest.fn().mockResolvedValue(undefined);

    expect(await handleOnce(db, 'notification', 'm-1', 'events.x', work)).toBe(true);
    expect(await handleOnce(db, 'notification', 'm-1', 'events.x', work)).toBe(false);
    expect(work).toHaveBeenCalledTimes(1);
    // another consumer of the same message is independent
    expect(await handleOnce(db, 'audit', 'm-1', 'events.x', work)).toBe(true);
  });

  it('a failed work rolls the inbox row back: the redelivery processes it again', async () => {
    const { db, seen } = memoryDb();
    const work = jest
      .fn()
      .mockRejectedValueOnce(new Error('SMTP timeout'))
      .mockResolvedValue(undefined);

    await expect(handleOnce(db, 'notification', 'm-2', 'events.x', work)).rejects.toThrow(
      'SMTP timeout',
    );
    expect(seen.size).toBe(0);
    expect(await handleOnce(db, 'notification', 'm-2', 'events.x', work)).toBe(true);
    expect(work).toHaveBeenCalledTimes(2);
  });
});

describe('[messaging] JetStreamConsumer.handle', () => {
  const js = { publish: jest.fn() };
  const handle = { nc: {}, js, jsm: {} } as unknown as JetStreamHandle;

  function message(subject: string, data: unknown, deliveryCount = 1) {
    const h = natsHeaders();
    h.set(MESSAGE_ID_HEADER, 'msg-1');
    return {
      subject,
      seq: 7,
      data: new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data)),
      headers: h,
      info: { stream: 'EVENTS', deliveryCount },
      ack: jest.fn(),
      nak: jest.fn(),
      term: jest.fn(),
    } as unknown as JsMsg & { ack: jest.Mock; nak: jest.Mock; term: jest.Mock };
  }

  beforeEach(() => {
    js.publish.mockReset().mockResolvedValue({});
  });

  const consumer = (handler: jest.Mock, maxDeliver = 3) =>
    new JetStreamConsumer(handle, {
      durable: 'notification',
      handlers: { 'events.x': handler },
      maxDeliver,
      backoffMs: [1000, 5000],
    });

  it('success → ack, with the message id from Nats-Msg-Id and the parsed payload', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const msg = message('events.x', { a: 1 });
    expect(await consumer(handler).handle(msg)).toBe('ack');
    expect(handler).toHaveBeenCalledWith({
      id: 'msg-1',
      subject: 'events.x',
      data: { a: 1 },
      deliveryCount: 1,
    });
    expect(msg.ack).toHaveBeenCalled();
  });

  it('temporary failure → nak with backoff (redelivered), not acked', async () => {
    const msg = message('events.x', {}, 2);
    expect(await consumer(jest.fn().mockRejectedValue(new Error('db down'))).handle(msg)).toBe(
      'nak',
    );
    expect(msg.nak).toHaveBeenCalledWith(5000);
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it('last attempt failed → copied to the DLQ with the reason, then term', async () => {
    const msg = message('events.x', {}, 3);
    expect(await consumer(jest.fn().mockRejectedValue(new Error('db down'))).handle(msg)).toBe(
      'dlq',
    );
    const [subject, , opts] = js.publish.mock.calls[0];
    expect(subject).toBe('dlq.notification.events.x');
    expect(opts.msgID).toBe('msg-1:notification');
    expect((opts.headers as { get(k: string): string }).get('Dlq-Reason')).toMatch(
      /gave up after 3 attempts: Error: db down/,
    );
    expect(msg.term).toHaveBeenCalled();
  });

  it('permanent error / invalid JSON / unknown subject → DLQ at once, no retry', async () => {
    const bad = message('events.x', {});
    expect(
      await consumer(
        jest.fn().mockRejectedValue(new PermanentMessageError('invalid payload')),
      ).handle(bad),
    ).toBe('dlq');
    expect(await consumer(jest.fn()).handle(message('events.x', '{not json'))).toBe('dlq');
    expect(await consumer(jest.fn()).handle(message('events.unknown', {}))).toBe('dlq');
    expect(js.publish).toHaveBeenCalledTimes(3);
  });

  it('DLQ unavailable → nak (redelivered later), never lost', async () => {
    js.publish.mockRejectedValue(new Error('no responders'));
    const msg = message('events.x', {}, 3);
    expect(await consumer(jest.fn().mockRejectedValue(new Error('x'))).handle(msg)).toBe('nak');
    expect(msg.term).not.toHaveBeenCalled();
    expect(msg.nak).toHaveBeenCalledWith(60_000);
  });

  it('counts each delivery by outcome (ack / retry / dlq) for dashboards and alerts', async () => {
    consumerMessages.reset();
    await consumer(jest.fn().mockResolvedValue(undefined)).handle(message('events.x', {}));
    await consumer(jest.fn().mockRejectedValue(new Error('x'))).handle(message('events.x', {}, 1));
    await consumer(jest.fn().mockRejectedValue(new Error('x'))).handle(message('events.x', {}, 3));

    const counts = (await consumerMessages.get()).values.map((v) => [v.labels.outcome, v.value]);
    expect(counts).toEqual(
      expect.arrayContaining([
        ['ack', 1],
        ['retry', 1],
        ['dlq', 1],
      ]),
    );
  });
});
