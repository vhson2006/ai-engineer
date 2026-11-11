import { Test } from '@nestjs/testing';
import { ARTICLE_EVENTS, ArticlePublishedEvent, OutboxRelay } from '@app/common';
import {
  ARTICLE_ID as id,
  articleRow as row,
  site,
  translationRow as tr,
} from '../../support/fixtures';
import {
  createPrismaMock,
  outboxPayload,
  outboxSubjects,
  resetPrismaMock,
} from '../../support/prisma-mock';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ArticleSchedulerService } from '../../../src/articles/article-scheduler.service';

describe('[article-scheduler.service] (unit)', () => {
  let scheduler: ArticleSchedulerService;
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn() };
  const now = new Date('2026-11-17T01:00:30Z');
  const scheduledAt = new Date('2026-11-17T01:00:00Z');

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticleSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
      ],
    }).compile();
    scheduler = moduleRef.get(ArticleSchedulerService);
  });

  it('publishes due articles at their scheduled time, with the scheduler of record as actor', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id }]);
    prisma.article.findUniqueOrThrow.mockResolvedValue({
      ...row({ status: 'scheduled', scheduledAt, updatedBy: 'u-pub' }),
      site,
    });
    prisma.article.update.mockResolvedValue(
      row({ status: 'published', publishedAt: scheduledAt, updatedBy: 'u-pub' }),
    );

    await expect(scheduler.publishDue(now)).resolves.toEqual({ published: 1, reverted: 0 });

    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'published',
          publishedAt: scheduledAt,
          scheduledAt: null,
        },
      }),
    );
    expect(outboxSubjects(prisma)).toEqual([ARTICLE_EVENTS.PUBLISHED]);
    expect(outboxPayload<ArticlePublishedEvent>(prisma)).toMatchObject({ actorId: 'u-pub' });
    expect(outbox.poke).toHaveBeenCalled();
  });

  it('sends an article that lost a language back to draft, without an event', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id }]);
    prisma.article.findUniqueOrThrow.mockResolvedValue({
      ...row({ status: 'scheduled', scheduledAt, translations: [tr('en')] }),
      site,
    });

    await expect(scheduler.publishDue(now)).resolves.toEqual({ published: 0, reverted: 1 });
    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id },
      data: { status: 'draft', scheduledAt: null },
    });
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    expect(outbox.poke).not.toHaveBeenCalled();
  });

  it('does nothing when nothing is due', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(scheduler.publishDue(now)).resolves.toEqual({ published: 0, reverted: 0 });
    expect(prisma.article.update).not.toHaveBeenCalled();
  });

  it('never throws from the cron job: a failed run is logged and retried next minute', async () => {
    prisma.$transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(scheduler.run()).resolves.toBeUndefined();
  });
});
