import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaService } from './media.service';

/** A pending upload this old will never complete (its upload URLs expired long ago). */
export const PENDING_MEDIA_TTL_HOURS = 24;

/**
 * Hourly: deletes pending uploads older than PENDING_MEDIA_TTL_HOURS, objects first, in bounded
 * batches. Safe with several replicas (conditional delete; deleting an object twice is a no-op).
 */
@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(private readonly media: MediaService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'media-cleanup' })
  async run(): Promise<void> {
    try {
      const before = new Date(Date.now() - PENDING_MEDIA_TTL_HOURS * 3_600_000);
      const purged = await this.media.purgePending(before);
      if (purged) this.logger.log(`Media cleanup: ${purged} abandoned upload(s) removed`);
    } catch (error) {
      // Never crash the process from a background job; the next run retries.
      this.logger.error(
        'Media cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
