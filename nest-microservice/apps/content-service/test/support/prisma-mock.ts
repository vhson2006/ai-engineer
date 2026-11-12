/**
 * A PrismaService stand-in for content-service tests (unit and integration): every model method the
 * services use is a jest.fn(). `$transaction` runs a callback with the same mock as `tx`, and
 * resolves an array of queries; call resetPrismaMock() in beforeEach (after jest.resetAllMocks).
 */
export function createPrismaMock() {
  return {
    site: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateManyAndReturn: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    categoryTranslation: { findUnique: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
    article: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    articleTranslation: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    articleSlugRedirect: { createMany: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn() },
    media: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    translationJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    imageGenerationJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    inboxMessage: { createMany: jest.fn() },
    outboxMessage: { create: jest.fn() }, // addToOutbox (same transaction)
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

/** Re-arms what jest.resetAllMocks() cleared: transactions, and the site every test starts with. */
export function resetPrismaMock(prisma: PrismaMock, site: unknown): void {
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: PrismaMock) => unknown)(prisma)
      : Promise.all(arg as unknown[]),
  );
  prisma.site.findUnique.mockResolvedValue(site);
}

/** Subjects of the events written to the outbox, in order. */
export function outboxSubjects(prisma: PrismaMock): string[] {
  return (prisma.outboxMessage.create.mock.calls as [{ data: { subject: string } }][]).map(
    ([arg]) => arg.data.subject,
  );
}

/** Payload of the n-th event written to the outbox. */
export function outboxPayload<T>(prisma: PrismaMock, n = 0): T {
  return (prisma.outboxMessage.create.mock.calls as [{ data: { payload: T } }][])[n][0].data
    .payload;
}
