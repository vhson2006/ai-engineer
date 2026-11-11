import { Module } from '@nestjs/common';
import { SitesModule } from '../sites/sites.module';
import { PublishedArticlesController } from './published-articles.controller';
import { PublishedArticlesService } from './published-articles.service';

/** What a site shows: published articles, one language at a time (read only). */
@Module({
  imports: [SitesModule],
  controllers: [PublishedArticlesController],
  providers: [PublishedArticlesService],
})
export class PublishedArticlesModule {}
