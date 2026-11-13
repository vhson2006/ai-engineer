import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { OutboxModule } from '../messaging/outbox.module';
import { SitesModule } from '../sites/sites.module';
import { StudioModule } from '../studio/studio.module';
import { TranslationsModule } from '../translations/translations.module';
import { ArticleDraftsController } from './article-drafts.controller';
import { ArticleDraftsService } from './article-drafts.service';

/** Articles written by AI (ADR 0041); its answers come through AiResultsModule. */
@Module({
  imports: [SitesModule, MediaModule, StudioModule, OutboxModule, TranslationsModule],
  controllers: [ArticleDraftsController],
  providers: [ArticleDraftsService],
  exports: [ArticleDraftsService],
})
export class ArticleDraftsModule {}
