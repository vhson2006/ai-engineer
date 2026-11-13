import { Test } from '@nestjs/testing';
import {
  FACT_SUGGESTION_EVENTS,
  InMemoryObjectStorage,
  OBJECT_STORAGE,
  OutboxRelay,
  type FactSuggestionRequestedEvent,
} from '@app/common';
import { PrismaService } from '../../../src/prisma/prisma.module';
import {
  FACT_SUGGESTER,
  normalizeSuggestions,
  type FactSuggester,
} from '../../../src/suggestions/providers/fact-suggester';
import { FakeFactSuggester } from '../../../src/suggestions/providers/fake-fact.suggester';
import { suggestionInstruction } from '../../../src/suggestions/providers/gemini-fact.suggester';
import { SuggestionService } from '../../../src/suggestions/suggestion.service';

const MEDIA = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
const event: FactSuggestionRequestedEvent = {
  jobId: '0b30bc39-b265-47bb-91e3-5a3d2a254935',
  requester: 'content-service',
  siteId: 'nails',
  language: 'en',
  template: 'A bento-style brand film.',
  title: 'Fall looks',
  brand: { name: 'Envy Nails Spa' },
  known: [{ id: 'address', text: '2241 Treelight Way' }],
  fields: [
    { id: 'promises', label: 'Promises', hint: 'Title | text', maxLength: 600, lines: 4 },
    {
      id: 'captions',
      label: 'Names of the looks',
      hint: 'One name per line',
      maxLength: 300,
      images: [`media/nails/${MEDIA}/640.webp`, `media/nails/${MEDIA}/640.jpg`],
    },
  ],
};

describe('[fact suggestions] (unit)', () => {
  it('keeps only the asked fields, one item per line, list markers removed, cut to the limits', () => {
    const facts = normalizeSuggestions(event, {
      fields: [
        { id: 'captions', text: '- Mint foil\n2. Peacock\n3. One too many' },
        { id: 'promises', text: ' Clean | Sterilized tools \n\n Calm | Massage chairs ' },
        { id: 'unknown', text: 'x' },
        { id: 'promises', text: 'a second answer is ignored' },
      ],
    });
    expect(facts).toEqual([
      { id: 'promises', text: 'Clean | Sterilized tools\nCalm | Massage chairs' },
      { id: 'captions', text: 'Mint foil\nPeacock' },
    ]);
    expect(normalizeSuggestions(event, { fields: 'nope' })).toEqual([]);
  });

  it('tells the model never to invent facts or write digits', () => {
    const instruction = suggestionInstruction(event);
    expect(instruction).toContain('NEVER invent facts');
    expect(instruction).toContain('Use no digits');
  });

  describe('service', () => {
    const prisma = {
      inboxMessage: { findUnique: jest.fn(), createMany: jest.fn() },
      aiUsage: { create: jest.fn() },
      outboxMessage: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    const outbox = { poke: jest.fn() };
    const suggester: jest.Mocked<FactSuggester> = { name: 'test', suggest: jest.fn() };
    const fetchMock = jest.fn();
    let service: SuggestionService;
    const delivery = {
      id: 'msg-1',
      subject: FACT_SUGGESTION_EVENTS.REQUESTED,
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
      global.fetch = fetchMock;
      prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
      prisma.inboxMessage.findUnique.mockResolvedValue(null);
      prisma.inboxMessage.createMany.mockResolvedValue({ count: 1 });
      suggester.suggest.mockImplementation((request) => new FakeFactSuggester().suggest(request));
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
      );
      const moduleRef = await Test.createTestingModule({
        providers: [
          SuggestionService,
          { provide: PrismaService, useValue: prisma },
          { provide: OutboxRelay, useValue: outbox },
          { provide: FACT_SUGGESTER, useValue: suggester },
          { provide: OBJECT_STORAGE, useValue: new InMemoryObjectStorage() },
        ],
      }).compile();
      service = moduleRef.get(SuggestionService);
    });

    it('reads the images from the storage CDN, in order, and answers the drafts', async () => {
      await service.suggest(event, delivery);
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        `https://cdn.test/media/nails/${MEDIA}/640.webp`,
        `https://cdn.test/media/nails/${MEDIA}/640.jpg`,
      ]);
      const images = suggester.suggest.mock.calls[0][1];
      expect(images.map((i) => i.mimeType)).toEqual(['image/webp', 'image/jpeg']);
      const [answer] = written();
      expect(answer.subject).toBe(FACT_SUGGESTION_EVENTS.COMPLETED);
      expect((answer.payload.facts as { id: string }[]).map((f) => f.id)).toEqual([
        'promises',
        'captions',
      ]);
    });

    it("refuses another site's image without calling the model (answered failed)", async () => {
      const foreign = {
        ...event,
        fields: [{ ...event.fields[1], images: [`media/wine/${MEDIA}/640.webp`] }],
      };
      await service.suggest(foreign, delivery);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(suggester.suggest).not.toHaveBeenCalled();
      expect(written()[0].subject).toBe(FACT_SUGGESTION_EVENTS.FAILED);
    });

    it('a transient error is thrown (retried) until the last attempt', async () => {
      suggester.suggest.mockRejectedValue(new Error('503'));
      await expect(service.suggest(event, delivery)).rejects.toThrow('503');
      await service.suggest(event, { ...delivery, last: true });
      expect(written()[0]).toMatchObject({
        subject: FACT_SUGGESTION_EVENTS.FAILED,
        payload: expect.objectContaining({ reason: 'provider_unavailable' }),
      });
    });
  });
});
