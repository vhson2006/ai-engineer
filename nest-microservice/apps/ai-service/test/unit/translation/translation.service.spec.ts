import { Test } from '@nestjs/testing';
import { OutboxRelay, TRANSLATION_EVENTS, type TranslationRequestedEvent } from '@app/common';
import { PrismaService } from '../../../src/prisma/prisma.module';
import { FakeTranslationProvider } from '../../../src/translation/providers/fake.provider';
import {
  ProviderRefusedError,
  TRANSLATION_PROVIDER,
  type TranslationProvider,
} from '../../../src/translation/providers/translation-provider';
import { CONSUMER, TranslationService } from '../../../src/translation/translation.service';

describe('[translation.service] (unit)', () => {
  const prisma = {
    inboxMessage: { findUnique: jest.fn(), createMany: jest.fn() },
    aiUsage: { create: jest.fn() },
    outboxMessage: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const outbox = { poke: jest.fn() };
  const provider: jest.Mocked<TranslationProvider> = { name: 'test', translate: jest.fn() };
  let service: TranslationService;

  const event: TranslationRequestedEvent = {
    jobId: '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f',
    requester: 'content-service',
    siteId: 'laundry',
    sourceLocale: 'vi',
    targetLocale: 'en',
    kind: 'article',
    segments: ['Xin chào', '<strong>Giá</strong> 35.000 ₫'],
  };
  const delivery = { id: 'msg-1', subject: TRANSLATION_EVENTS.REQUESTED, attempt: 1, last: false };
  const written = () =>
    (
      prisma.outboxMessage.create.mock.calls as [{ data: { subject: string; payload: object } }][]
    ).map(([arg]) => arg.data);

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.inboxMessage.findUnique.mockResolvedValue(null);
    prisma.inboxMessage.createMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: TRANSLATION_PROVIDER, useValue: provider },
      ],
    }).compile();
    service = moduleRef.get(TranslationService);
  });

  it('translates, records the usage and publishes completed once (inbox + outbox, one transaction)', async () => {
    provider.translate.mockResolvedValue({
      segments: ['Hello', '<strong>Price</strong> 35.000 ₫'],
      model: 'm',
      inputTokens: 10,
      outputTokens: 12,
    });
    await service.translate(event, delivery);

    expect(provider.translate).toHaveBeenCalledWith(
      expect.objectContaining({ sourceLocale: 'vi', targetLocale: 'en', glossary: [] }),
    );
    expect(prisma.inboxMessage.createMany).toHaveBeenCalledWith({
      data: [{ consumer: CONSUMER, messageId: 'msg-1', subject: TRANSLATION_EVENTS.REQUESTED }],
      skipDuplicates: true,
    });
    expect(prisma.aiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcome: 'ok',
        inputTokens: 10,
        outputTokens: 12,
        siteId: 'laundry',
      }),
    });
    expect(written()).toEqual([
      expect.objectContaining({
        subject: TRANSLATION_EVENTS.COMPLETED,
        payload: expect.objectContaining({
          jobId: event.jobId,
          segments: ['Hello', '<strong>Price</strong> 35.000 ₫'],
          provider: 'test',
        }),
      }),
    ]);
    expect(outbox.poke).toHaveBeenCalled();
  });

  it('skips a message already processed, without calling the provider', async () => {
    prisma.inboxMessage.findUnique.mockResolvedValue({ messageId: 'msg-1' });
    await service.translate(event, delivery);
    expect(provider.translate).not.toHaveBeenCalled();
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
  });

  it('a transient error is thrown (retried), nothing written', async () => {
    provider.translate.mockRejectedValue(Object.assign(new Error('busy'), { status: 503 }));
    await expect(service.translate(event, delivery)).rejects.toThrow('busy');
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
  });

  it('on the last attempt a transient error becomes failed (provider_unavailable)', async () => {
    provider.translate.mockRejectedValue(new Error('timeout'));
    await service.translate(event, { ...delivery, last: true, attempt: 5 });
    expect(written()).toEqual([
      expect.objectContaining({
        subject: TRANSLATION_EVENTS.FAILED,
        payload: expect.objectContaining({ reason: 'provider_unavailable', attempts: 5 }),
      }),
    ]);
    expect(prisma.aiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ outcome: 'failed' }),
    });
  });

  it('a refusal fails at once with its reason', async () => {
    provider.translate.mockRejectedValue(
      new ProviderRefusedError('3 segments for 2', 'invalid_output'),
    );
    await service.translate(event, delivery);
    expect(written()[0]).toMatchObject({
      subject: TRANSLATION_EVENTS.FAILED,
      payload: { reason: 'invalid_output', detail: 'ProviderRefusedError: 3 segments for 2' },
    });
  });
});

describe('[fake.provider] (unit)', () => {
  it('prefixes the text with the target locale, after leading tags, and keeps the count', async () => {
    const result = await new FakeTranslationProvider().translate({
      sourceLocale: 'vi',
      targetLocale: 'en',
      kind: 'article',
      glossary: [],
      segments: ['Xin chào', '<strong>Giá</strong> rẻ'],
    });
    expect(result.segments).toEqual(['[EN] Xin chào', '<strong>[EN] Giá</strong> rẻ']);
  });
});
