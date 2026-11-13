import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { StudioModule } from '../studio/studio.module';
import { ArticleDraftsModule } from '../article-drafts/article-drafts.module';
import { OutboxModule } from '../messaging/outbox.module';
import { TranslationsModule } from '../translations/translations.module';
import { AiResultsConsumer } from './ai-results.consumer';

/** ai-service's and render-worker's answers (ADRs 0036, 0037, 0039): one durable consumer, routed to their feature. */
@Module({
  imports: [OutboxModule, TranslationsModule, MediaModule, StudioModule, ArticleDraftsModule], // OutboxModule: JETSTREAM
  providers: [AiResultsConsumer],
})
export class AiResultsModule {}
