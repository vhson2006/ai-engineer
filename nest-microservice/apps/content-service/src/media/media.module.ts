import { Module } from '@nestjs/common';
import { StorageModule } from '@app/common';
import { OutboxModule } from '../messaging/outbox.module';
import { SitesModule } from '../sites/sites.module';
import { MediaCleanupService } from './media-cleanup.service';
import { MediaGenerationService } from './media-generation.service';
import { MediaUrls } from './media-urls';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/**
 * The media library (ADR 0034): images in the public bucket (StorageModule, STORAGE_* env).
 * Exports MediaUrls (cover and body image URLs) and MediaService (cover check) to the articles,
 * MediaGenerationService (AI images, ADR 0037) to AiResultsModule.
 */
@Module({
  imports: [SitesModule, StorageModule, OutboxModule],
  controllers: [MediaController],
  providers: [MediaService, MediaGenerationService, MediaUrls, MediaCleanupService],
  exports: [MediaService, MediaGenerationService, MediaUrls],
})
export class MediaModule {}
