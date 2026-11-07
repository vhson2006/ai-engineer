import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FILE_PURPOSES, FilePurpose, ORPHAN_TTL_HOURS } from '@app/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from './files.service';

const BATCH = 100;
const MAX_BATCHES = 20; // per run: bounded work, the next run continues

/**
 * Hourly housekeeping of the files table and the buckets:
 *  - pending uploads older than ORPHAN_TTL_HOURS (the upload URL expired long ago) → deleting
 *  - `attachable` files uploaded but never attached within ORPHAN_TTL_HOURS → deleting
 *  - every `deleting` row: delete the object, then mark the row `deleted`
 *
 * Safe with several replicas running it at once: status transitions are conditional updates and
 * deleting an object twice is a no-op.
 */
@Injectable()
export class FilesCleanupService {
  private readonly logger = new Logger(FilesCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'files-cleanup' })
  async run(): Promise<void> {
    try {
      const result = await this.cleanup();
      if (result.expired || result.orphaned || result.purged || result.failed) {
        this.logger.log(`Files cleanup: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      // Never crash the process from a background job; the next run retries.
      this.logger.error(
        'Files cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async cleanup(now = new Date()) {
    const cutoff = new Date(now.getTime() - ORPHAN_TTL_HOURS * 3600_000);
    const attachable = (Object.keys(FILE_PURPOSES) as FilePurpose[]).filter(
      (p) => FILE_PURPOSES[p].attachable,
    );

    const expired = await this.prisma.storedFile.updateMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
      data: { status: 'deleting', deletedAt: now },
    });
    const orphaned = await this.prisma.storedFile.updateMany({
      where: {
        status: 'uploaded',
        deploymentId: null,
        purpose: { in: attachable },
        uploadedAt: { lt: cutoff },
      },
      data: { status: 'deleting', deletedAt: now },
    });

    let purged = 0;
    let failed = 0;
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const rows = await this.prisma.storedFile.findMany({
        where: { status: 'deleting' },
        select: { id: true, visibility: true, storageKey: true },
        orderBy: { deletedAt: 'asc' },
        take: BATCH,
        skip: failed, // rows that failed in this run stay `deleting`: don't fetch them again
      });
      if (!rows.length) break;
      for (const row of rows) {
        if (await this.files.purge(row)) purged++;
        else failed++;
      }
    }
    return { expired: expired.count, orphaned: orphaned.count, purged, failed };
  }
}
