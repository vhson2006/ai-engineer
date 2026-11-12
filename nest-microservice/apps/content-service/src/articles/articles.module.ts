import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { OutboxModule } from '../messaging/outbox.module';
import { SitesModule } from '../sites/sites.module';
import { ArticlePublishingService } from './article-publishing.service';
import { ArticleSchedulerService } from './article-scheduler.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

/**
 * Articles as admins manage them: editing (ArticlesService), the publishing workflow
 * (ArticlePublishingService) and scheduled publishing (ArticleSchedulerService, @Cron: needs
 * ScheduleModule in the root module). Events go through the outbox, never straight to NATS.
 */
@Module({
  imports: [SitesModule, OutboxModule, MediaModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlePublishingService, ArticleSchedulerService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
