import { DEPLOYMENT_EVENTS, PermanentMessageError, type JetStreamHandle } from '@app/common';
import type { PrismaService } from '../prisma/prisma.module';
import { CONSUMER, NotificationsConsumer } from './notifications.consumer';
import type { NotificationsService } from './notifications.service';

describe('[notifications.consumer] (unit)', () => {
  const seen = new Set<string>();
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inboxMessage: {
          createMany: ({ data }: { data: { consumer: string; messageId: string }[] }) => {
            const key = `${data[0].consumer}/${data[0].messageId}`;
            if (seen.has(key)) return Promise.resolve({ count: 0 });
            seen.add(key);
            return Promise.resolve({ count: 1 });
          },
        },
      }),
  } as unknown as PrismaService;
  const notifications = { deploymentCreated: jest.fn(), statusChanged: jest.fn() };
  const consumer = new NotificationsConsumer(
    {} as JetStreamHandle,
    prisma,
    notifications as unknown as NotificationsService,
  );

  const created = {
    id: '8f14e45f-ceea-4e7a-9b1e-1a2b3c4d5e6f',
    name: 'checkout-api',
    version: '1.4.0',
    environment: 'production',
    occurredAt: '2026-11-06T10:00:00.000Z',
  };
  const incoming = (id: string, data: unknown) => ({
    id,
    subject: DEPLOYMENT_EVENTS.CREATED,
    data,
    deliveryCount: 1,
  });

  beforeEach(() => {
    seen.clear();
    jest.resetAllMocks();
    notifications.deploymentCreated.mockResolvedValue(undefined);
  });

  it('processes a valid event once, records it in the inbox under this consumer', async () => {
    await consumer.handlers[DEPLOYMENT_EVENTS.CREATED](incoming('m-1', created));
    expect(notifications.deploymentCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.id, name: 'checkout-api' }),
    );
    expect(seen.has(`${CONSUMER}/m-1`)).toBe(true);
  });

  it('a redelivered message (same id) is skipped: at-least-once delivery, effect once', async () => {
    await consumer.handlers[DEPLOYMENT_EVENTS.CREATED](incoming('m-2', created));
    await consumer.handlers[DEPLOYMENT_EVENTS.CREATED](incoming('m-2', created));
    expect(notifications.deploymentCreated).toHaveBeenCalledTimes(1);
  });

  it('an invalid payload is a permanent error (DLQ, no retry) and is not recorded', async () => {
    await expect(
      consumer.handlers[DEPLOYMENT_EVENTS.CREATED](
        incoming('m-3', { ...created, id: 'not-a-uuid' }),
      ),
    ).rejects.toBeInstanceOf(PermanentMessageError);
    expect(notifications.deploymentCreated).not.toHaveBeenCalled();
    expect(seen.size).toBe(0);
  });

  it('a failing side effect propagates (→ nak and redelivery by the consumer)', async () => {
    notifications.deploymentCreated.mockRejectedValueOnce(new Error('SMTP timeout'));
    await expect(
      consumer.handlers[DEPLOYMENT_EVENTS.CREATED](incoming('m-4', created)),
    ).rejects.toThrow('SMTP timeout');
  });
});
