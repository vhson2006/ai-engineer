import { Module } from '@nestjs/common';
import { ArticlesModule } from '../articles/articles.module';
import { MediaModule } from '../media/media.module';
import { OutboxModule } from '../messaging/outbox.module';
import { SitesModule } from '../sites/sites.module';
import { TranslationJobsService } from './translation-jobs.service';
import { TranslationsController } from './translations.controller';

/**
 * Machine translation of articles through ai-service (ADR 0036): requests out through the
 * outbox, results in through AiResultsConsumer (durable consumer + inbox).
 */
@Module({
  imports: [SitesModule, ArticlesModule, MediaModule, OutboxModule],
  controllers: [TranslationsController],
  providers: [TranslationJobsService],
  exports: [TranslationJobsService],
})
export class TranslationsModule {}
