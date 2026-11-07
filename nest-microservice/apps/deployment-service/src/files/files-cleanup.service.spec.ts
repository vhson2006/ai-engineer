import { FilesCleanupService } from './files-cleanup.service';
import { sanitizeFilename } from './files.service';

describe('[files-cleanup.service] (unit)', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const cutoff = new Date('2026-11-04T12:00:00Z'); // ORPHAN_TTL_HOURS = 24

  const make = (deleting: { id: string; visibility: string; storageKey: string }[][]) => {
    const prisma = {
      storedFile: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn(),
      },
    };
    deleting.forEach((batch) => prisma.storedFile.findMany.mockResolvedValueOnce(batch));
    prisma.storedFile.findMany.mockResolvedValue([]);
    const files = { purge: jest.fn().mockResolvedValue(true) };
    const service = new FilesCleanupService(prisma as never, files as never);
    return { service, prisma, files };
  };

  it('expires old pending uploads and orphaned attachments (not public images)', async () => {
    const { service, prisma } = make([]);
    await service.cleanup(now);

    expect(prisma.storedFile.updateMany).toHaveBeenCalledWith({
      where: { status: 'pending', createdAt: { lt: cutoff } },
      data: { status: 'deleting', deletedAt: now },
    });
    expect(prisma.storedFile.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'uploaded',
        deploymentId: null,
        purpose: { in: ['deployment-attachment'] }, // public-image is not attachable
        uploadedAt: { lt: cutoff },
      },
      data: { status: 'deleting', deletedAt: now },
    });
  });

  it('purges every deleting row, and skips the failed ones on the next page', async () => {
    const row = (id: string) => ({ id, visibility: 'private', storageKey: `k/${id}` });
    const { service, prisma, files } = make([[row('a'), row('b')], [row('c')]]);
    files.purge
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await service.cleanup(now);

    expect(files.purge).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ purged: 2, failed: 1 });
    expect(prisma.storedFile.findMany.mock.calls[1][0]).toMatchObject({ skip: 1 });
  });

  it('a failing run is logged, never thrown (background job)', async () => {
    const { service, prisma } = make([]);
    prisma.storedFile.updateMany.mockRejectedValue(new Error('db down'));
    await expect(service.run()).resolves.toBeUndefined();
  });
});

describe('sanitizeFilename', () => {
  it.each([
    ['../../etc/passwd', 'passwd'],
    ['C:\\Users\\me\\Report.pdf', 'Report.pdf'],
    ['  bad\u0000name\u0007.txt  ', 'badname.txt'],
    ['.htaccess', 'htaccess'],
    ['Ghi chú phát hành.pdf', 'Ghi chú phát hành.pdf'],
    ['', 'file'],
    ['a'.repeat(300), 'a'.repeat(255)],
  ])('%j → %j', (input, expected) => {
    expect(sanitizeFilename(input)).toBe(expected);
  });
});
