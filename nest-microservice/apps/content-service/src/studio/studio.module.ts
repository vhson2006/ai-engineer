import { Module } from '@nestjs/common';
import { StorageModule } from '@app/common';
import { MediaModule } from '../media/media.module';
import { OutboxModule } from '../messaging/outbox.module';
import { SitesModule } from '../sites/sites.module';
import { AvatarsService } from './avatars.service';
import { BrandKitService } from './brand-kit.service';
import { ProjectsService } from './projects.service';
import { StudioController } from './studio.controller';

/**
 * The video studio (ADR 0039): brand kit, avatars, video projects. Exports ProjectsService to
 * AiResultsModule, which applies ai-service's and render-worker's answers.
 */
@Module({
  imports: [SitesModule, MediaModule, StorageModule, OutboxModule],
  controllers: [StudioController],
  providers: [BrandKitService, AvatarsService, ProjectsService],
  exports: [ProjectsService, BrandKitService],
})
export class StudioModule {}
