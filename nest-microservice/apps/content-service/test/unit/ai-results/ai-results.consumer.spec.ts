import { Test } from '@nestjs/testing';
import {
  IMAGE_GENERATION_EVENTS,
  JETSTREAM,
  PermanentMessageError,
  SPEECH_EVENTS,
  TRANSLATION_EVENTS,
  VIDEO_RENDER_EVENTS,
  type IncomingMessage,
} from '@app/common';
import { createPrismaMock } from '../../support/prisma-mock';
import { AiResultsConsumer } from '../../../src/ai-results/ai-results.consumer';
import { MediaGenerationService } from '../../../src/media/media-generation.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ProjectsService } from '../../../src/studio/projects.service';
import { TranslationJobsService } from '../../../src/translations/translation-jobs.service';

describe('[ai-results.consumer] (unit)', () => {
  let consumer: AiResultsConsumer;
  const prisma = createPrismaMock();
  const images = { complete: jest.fn(), fail: jest.fn() };
  const translations = { complete: jest.fn(), fail: jest.fn() };
  const studio = {
    scriptWritten: jest.fn(),
    scriptFailed: jest.fn(),
    voiceReady: jest.fn(),
    voiceFailed: jest.fn(),
    rendered: jest.fn(),
    renderFailed: jest.fn(),
  };
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
        { provide: ProjectsService, useValue: studio },
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

  it('routes the studio answers: voice (requester checked) and render (no requester)', async () => {
    await consumer.handlers[SPEECH_EVENTS.FAILED](message(SPEECH_EVENTS.FAILED, failed));
    expect(studio.voiceFailed).toHaveBeenCalledWith(prisma, expect.objectContaining(failed));
    await consumer.handlers[SPEECH_EVENTS.FAILED](
      message(SPEECH_EVENTS.FAILED, { ...failed, requester: 'other' }, 'msg-2'),
    );
    expect(studio.voiceFailed).toHaveBeenCalledTimes(1);

    const renderFailed = {
      renderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      siteId: 'nails',
      reason: 'render_failed',
    };
    await consumer.handlers[VIDEO_RENDER_EVENTS.FAILED](
      message(VIDEO_RENDER_EVENTS.FAILED, renderFailed, 'msg-3'),
    );
    expect(studio.renderFailed).toHaveBeenCalledWith(prisma, expect.objectContaining(renderFailed));
    await expect(
      consumer.handlers[VIDEO_RENDER_EVENTS.COMPLETED](
        message(VIDEO_RENDER_EVENTS.COMPLETED, { renderId: 'x' }, 'msg-4'),
      ),
    ).rejects.toBeInstanceOf(PermanentMessageError);
  });
});
