import { Module } from '@nestjs/common';
import { SitesModule } from '../sites/sites.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

/** Topics of a site's articles. PrismaService comes from the global PrismaModule. */
@Module({
  imports: [SitesModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
