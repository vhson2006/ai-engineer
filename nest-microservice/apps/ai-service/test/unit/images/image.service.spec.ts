import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import {
  IMAGE_GENERATION_EVENTS,
  InMemoryObjectStorage,
  OBJECT_STORAGE,
  OutboxRelay,
  type ImageGenerationRequestedEvent,
} from '@app/common';
import { optimizeImage } from '../../../src/images/image-optimizer';
import { ImageService } from '../../../src/images/image.service';
import { FakeImageProvider } from '../../../src/images/providers/fake-image.provider';
import { IMAGE_PROVIDER, type ImageProvider } from '../../../src/images/providers/image-provider';
import { PrismaService } from '../../../src/prisma/prisma.module';
import { ProviderRefusedError } from '../../../src/translation/providers/translation-provider';

describe('[image.service] (unit)', () => {
  const prisma = {
    inboxMessage: { findUnique: jest.fn(), createMany: jest.fn() },
    aiUsage: { createMany: jest.fn() },
    outboxMessage: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const outbox = { poke: jest.fn() };
  const fake = new FakeImageProvider();
  const provider: jest.Mocked<ImageProvider> = { name: 'test', generate: jest.fn() };
  let storage: InMemoryObjectStorage;
  let service: ImageService;

  const A = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
  const B = '5b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const event: ImageGenerationRequestedEvent = {
    jobId: '0b30bc39-b265-47bb-91e3-5a3d2a254935',
    requester: 'content-service',
    siteId: 'laundry',
    prompt: 'A bright laundromat',
    aspectRatio: '16:9',
    targets: [
      { mediaId: A, keyPrefix: `media/laundry/${A}/` },
      { mediaId: B, keyPrefix: `media/laundry/${B}/` },
    ],
  };
  const delivery = {
    id: 'msg-1',
    subject: IMAGE_GENERATION_EVENTS.REQUESTED,
    attempt: 1,
    last: false,
  };
  const written = () =>
    (
      prisma.outboxMessage.create.mock.calls as [
        { data: { subject: string; payload: Record<string, unknown> } },
      ][]
    ).map(([arg]) => arg.data);

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.inboxMessage.findUnique.mockResolvedValue(null);
    prisma.inboxMessage.createMany.mockResolvedValue({ count: 1 });
    storage = new InMemoryObjectStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ImageService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: IMAGE_PROVIDER, useValue: provider },
        { provide: OBJECT_STORAGE, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(ImageService);
  });

  it('generates one image per target, writes WebP sizes under its prefix, and reports them', async () => {
    provider.generate.mockImplementation((r) => fake.generate(r));
    await service.generate(event, delivery);

    expect(provider.generate).toHaveBeenCalledTimes(2);
    expect([...storage.objects.keys()].sort()).toEqual(
      [A, B]
        .flatMap((id) => [640, 1280, 1376].map((w) => `public:media/laundry/${id}/${w}.webp`))
        .sort(),
    );
    const [completed] = written();
    expect(completed.subject).toBe(IMAGE_GENERATION_EVENTS.COMPLETED);
    expect(completed.payload).toMatchObject({
      jobId: event.jobId,
      provider: 'test',
      images: [
        {
          mediaId: A,
          contentType: 'image/webp',
          variants: [{ width: 640, height: 357 }, { width: 1280 }, { width: 1376, height: 768 }],
        },
        { mediaId: B },
      ],
    });
    expect(prisma.aiUsage.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it('keeps the images made when another one fails (each is paid for): a partial result', async () => {
    provider.generate
      .mockImplementationOnce((r) => fake.generate(r))
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 503 }));
    await service.generate(event, delivery);
    expect(written()[0].payload.images).toEqual([expect.objectContaining({ mediaId: A })]);
    const [[usage]] = prisma.aiUsage.createMany.mock.calls as [[{ data: { outcome: string }[] }]];
    expect(usage.data.map((u) => u.outcome)).toEqual(['ok', 'failed']);
  });

  it('nothing made: retried while transient, failed when refused or on the last attempt', async () => {
    provider.generate.mockRejectedValue(Object.assign(new Error('down'), { status: 503 }));
    await expect(service.generate(event, delivery)).rejects.toThrow('down');
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();

    await service.generate(event, { ...delivery, last: true });
    expect(written()[0]).toMatchObject({
      subject: IMAGE_GENERATION_EVENTS.FAILED,
      payload: { reason: 'provider_unavailable' },
    });

    prisma.outboxMessage.create.mockClear();
    provider.generate.mockRejectedValue(new ProviderRefusedError('no image (failed)'));
    await service.generate(event, delivery);
    expect(written()[0]).toMatchObject({
      subject: IMAGE_GENERATION_EVENTS.FAILED,
      payload: { reason: 'provider_refused' },
    });
  });

  it('never writes outside the site media area, and skips a duplicate delivery', async () => {
    provider.generate.mockImplementation((r) => fake.generate(r));
    await service.generate(
      { ...event, targets: [{ mediaId: A, keyPrefix: `media/wine/${A}/` }] },
      delivery,
    );
    expect(storage.objects.size).toBe(0);
    expect(written()[0]).toMatchObject({ subject: IMAGE_GENERATION_EVENTS.FAILED });

    prisma.inboxMessage.findUnique.mockResolvedValue({ messageId: 'msg-1' });
    provider.generate.mockClear();
    await service.generate(event, delivery);
    expect(provider.generate).not.toHaveBeenCalled();
  });
});

describe('[image-optimizer] (unit)', () => {
  it('makes WebP sizes no wider than the picture, without metadata', async () => {
    const png = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: '#13883a' },
    })
      .withMetadata({ exif: { IFD0: { Copyright: 'x' } } })
      .png()
      .toBuffer();
    const variants = await optimizeImage(png);
    expect(variants.map((v) => [v.width, v.height])).toEqual([
      [640, 640],
      [1024, 1024],
    ]);
    const meta = await sharp(variants[1].data).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });
});
