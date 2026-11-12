import { Test } from '@nestjs/testing';
import {
  IMAGE_GENERATION_EVENTS,
  JETSTREAM,
  PermanentMessageError,
  TRANSLATION_EVENTS,
  type IncomingMessage,
} from '@app/common';
import { createPrismaMock } from '../../support/prisma-mock';
import { AiResultsConsumer } from '../../../src/ai-results/ai-results.consumer';
import { MediaGenerationService } from '../../../src/media/media-generation.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { TranslationJobsService } from '../../../src/translations/translation-jobs.service';

describe('[ai-results.consumer] (unit)', () => {
  let consumer: AiResultsConsumer;
  const prisma = createPrismaMock();
  const images = { complete: jest.fn(), fail: jest.fn() };
  const translations = { complete: jest.fn(), fail: jest.fn() };
  const failed = {
    jobId: '0b30bc39-b265-47bb-91e3-5a3d2a254935',
    requester: 'content-service',
    siteId: 'nails',
    reason: 'provider_refused',
  };
  const message = (subject: string, data: unknown, id = 'msg-1') =>
    ({ id, subject, data, deliveryCount: 1 }) as unknown as IncomingMessage;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.inboxMessage.createMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiResultsConsumer,
        { provide: JETSTREAM, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: MediaGenerationService, useValue: images },
        { provide: TranslationJobsService, useValue: translations },
      ],
    }).compile();
    consumer = moduleRef.get(AiResultsConsumer);
  });

  it('routes image answers to the media library, once (inbox)', async () => {
    const handler = consumer.handlers[IMAGE_GENERATION_EVENTS.FAILED];
    await handler(message(IMAGE_GENERATION_EVENTS.FAILED, failed));
    expect(images.fail).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ reason: 'provider_refused' }),
    );

    prisma.inboxMessage.createMany.mockResolvedValue({ count: 0 }); // already processed
    await handler(message(IMAGE_GENERATION_EVENTS.FAILED, failed));
    expect(images.fail).toHaveBeenCalledTimes(1);
    expect(consumer.handlers[TRANSLATION_EVENTS.COMPLETED]).toBeDefined();
  });

  it("ignores another requester's answers, and sends an invalid one to the DLQ", async () => {
    const handler = consumer.handlers[IMAGE_GENERATION_EVENTS.COMPLETED];
    await handler(
      message(IMAGE_GENERATION_EVENTS.COMPLETED, {
        ...failed,
        requester: 'other-service',
        images: [],
        provider: 'fake',
        model: 'fake',
      }),
    );
    expect(images.complete).not.toHaveBeenCalled();
    expect(prisma.inboxMessage.createMany).not.toHaveBeenCalled();

    await expect(
      handler(message(IMAGE_GENERATION_EVENTS.COMPLETED, { ...failed, images: 'nope' })),
    ).rejects.toThrow(PermanentMessageError);
  });
});
