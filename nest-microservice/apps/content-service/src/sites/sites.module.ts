import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

/**
 * The client sites and their languages. Exports SitesService: every other content feature asks
 * it for the site first (getAccessible: the site rule, 404 for a site the caller can't see).
 */
@Module({
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
