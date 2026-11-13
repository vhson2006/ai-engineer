import { Test } from '@nestjs/testing';
import {
  InMemoryObjectStorage,
  OBJECT_STORAGE,
  OutboxRelay,
  SPEECH_EVENTS,
  type SpeechRequestedEvent,
} from '@app/common';
import { PrismaService } from '../../../src/prisma/prisma.module';
import { FakeSpeechProvider } from '../../../src/speech/providers/fake-speech.provider';
import {
  SPEECH_PROVIDER,
  type SpeechProvider,
} from '../../../src/speech/providers/speech-provider';
import { SpeechService } from '../../../src/speech/speech.service';
import { isWav, pcmToWav, wavDurationMs } from '../../../src/speech/wav';
import { ProviderRefusedError } from '../../../src/translation/providers/translation-provider';

describe('[speech.service] (unit)', () => {
  const prisma = {
    inboxMessage: { findUnique: jest.fn(), createMany: jest.fn() },
    aiUsage: { create: jest.fn(), createMany: jest.fn() },
    outboxMessage: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const outbox = { poke: jest.fn() };
  const fake = new FakeSpeechProvider();
  const provider: jest.Mocked<SpeechProvider> = { name: 'test', speak: jest.fn() };
  let storage: InMemoryObjectStorage;
  let service: SpeechService;

  const PROJECT = '2c9d6f2a-4b1e-4c3d-9a8b-7f6e5d4c3b2a';
  const JOB = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
  const event: SpeechRequestedEvent = {
    jobId: JOB,
    requester: 'content-service',
    siteId: 'laundry',
    language: 'vi',
    keyPrefix: `studio/laundry/${PROJECT}/voice/${JOB}/`,
    lines: [
      { id: 'hook', text: 'Giặt sấy chỉ ba mươi lăm nghìn', voice: 'Kore' },
      { id: 'cta', text: 'Gọi cho tiệm nhé', voice: 'Kore' },
    ],
  };
  const delivery = { id: 'msg-1', subject: SPEECH_EVENTS.REQUESTED, attempt: 1, last: false };
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
    provider.speak.mockImplementation((request) => fake.speak(request));
    storage = new InMemoryObjectStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SpeechService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: SPEECH_PROVIDER, useValue: provider },
        { provide: OBJECT_STORAGE, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(SpeechService);
  });

  it('writes one WAV per line under the prefix and answers keys and durations', async () => {
    await service.speak(event, delivery);
    expect(storage.objects.has(`public:${event.keyPrefix}hook.wav`)).toBe(true);
    expect(storage.objects.has(`public:${event.keyPrefix}cta.wav`)).toBe(true);
    const [answer] = written();
    expect(answer.subject).toBe(SPEECH_EVENTS.COMPLETED);
    expect(answer.payload).toMatchObject({
      jobId: JOB,
      lines: [
        { id: 'hook', key: `${event.keyPrefix}hook.wav`, durationMs: expect.any(Number) },
        { id: 'cta', key: `${event.keyPrefix}cta.wav` },
      ],
    });
    expect(provider.speak).toHaveBeenCalledWith({
      text: event.lines[0].text,
      voice: 'Kore',
      language: 'vi',
    });
    expect(prisma.aiUsage.createMany).toHaveBeenCalled();
    expect(outbox.poke).toHaveBeenCalled();
  });

  it("refuses a target outside the site's studio area (failed, nothing written)", async () => {
    await service.speak({ ...event, siteId: 'nails' }, delivery);
    expect(provider.speak).not.toHaveBeenCalled();
    expect(storage.objects.size).toBe(0);
    expect(written()[0]).toMatchObject({
      subject: SPEECH_EVENTS.FAILED,
      payload: { reason: 'provider_refused' },
    });
  });

  it('retries a transient error, answers failed on the last attempt or a refusal', async () => {
    provider.speak.mockRejectedValue(new Error('503'));
    await expect(service.speak(event, delivery)).rejects.toThrow('503');
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();

    await service.speak(event, { ...delivery, last: true });
    expect(written()[0]).toMatchObject({ payload: { reason: 'provider_unavailable' } });

    jest.clearAllMocks();
    provider.speak.mockRejectedValue(new ProviderRefusedError('safety'));
    await service.speak(event, delivery);
    expect(written()[0]).toMatchObject({ payload: { reason: 'provider_refused' } });
  });

  it('skips a delivery already in the inbox', async () => {
    prisma.inboxMessage.findUnique.mockResolvedValue({ messageId: 'msg-1' });
    await service.speak(event, delivery);
    expect(provider.speak).not.toHaveBeenCalled();
  });

  it('wraps raw PCM in a WAV and reads its duration back', () => {
    const second = Buffer.alloc(24_000 * 2); // 1 s of 24 kHz mono 16-bit
    const wav = pcmToWav(second, { sampleRate: 24_000, channels: 1, bitsPerSample: 16 });
    expect(isWav(wav)).toBe(true);
    expect(wavDurationMs(wav)).toBe(1000);
    expect(wavDurationMs(second)).toBeNull();
  });
});
