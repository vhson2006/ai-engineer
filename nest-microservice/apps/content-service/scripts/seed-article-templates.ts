/**
 * Puts the article templates of a site into the content database, PUBLISHED, through the service
 * itself (ADR 0033): ArticlesService sanitizes the bodies, checks slugs and computes reading time;
 * ArticlePublishingService publishes and writes the outbox events. Never raw SQL.
 *
 *   npm run seed:article-templates            (from nest-microservice/, with the .env of start:dev)
 *
 * Idempotent: a template already in the database (found by its Vietnamese slug) is updated, not
 * duplicated. Acts as a system user with content:admin (no token involved: it never goes over HTTP).
 */
import '../src/env';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CONTENT_ROLES, type AuthUser, type ArticleTranslationDto } from '@app/common';
import { ArticlePublishingService } from '../src/articles/article-publishing.service';
import { ArticlesModule } from '../src/articles/articles.module';
import { ArticlesService } from '../src/articles/articles.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  LAUNDRY_TEMPLATES,
  type ArticleTemplateSeed,
  type Locale,
} from './article-templates/laundry';

const SITE_ID = 'laundry';
const LOCALES: Locale[] = ['vi', 'en'];

/** Who the articles are "created by": not a Keycloak user, so it never matches a real person. */
const SYSTEM_USER: AuthUser = {
  id: 'system:seed-article-templates',
  roles: [CONTENT_ROLES.ADMIN, CONTENT_ROLES.PUBLISH, CONTENT_ROLES.WRITE],
  groups: [],
};

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ArticlesModule],
})
class SeedModule {}

function translations(template: ArticleTemplateSeed): ArticleTranslationDto[] {
  return LOCALES.map((locale) => {
    const l = (vi: string, en: string) => (locale === 'vi' ? vi : en);
    return {
      locale,
      title: template.title(l),
      slug: template.slug[locale],
      excerpt: template.excerpt(l),
      body: template.body(l),
      coverAlt: null,
      seoTitle: null,
      seoDescription: null,
    };
  });
}

async function main() {
  const logger = new Logger('seed-article-templates');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService);
    const articles = app.get(ArticlesService);
    const publishing = app.get(ArticlePublishingService);

    const categories = await prisma.category.findMany({ where: { siteId: SITE_ID } });
    const categoryId = (key: string) => {
      const found = categories.find((c) => c.key === key);
      if (!found) throw new Error(`Site ${SITE_ID} has no category "${key}"`);
      return found.id;
    };

    for (const template of LAUNDRY_TEMPLATES) {
      const existing = await prisma.articleTranslation.findFirst({
        where: { siteId: SITE_ID, locale: 'vi', slug: template.slug.vi },
      });
      const dto = {
        categoryId: categoryId(template.categoryKey),
        translations: translations(template),
      };
      const article = existing
        ? await articles.update(SITE_ID, existing.articleId, dto, SYSTEM_USER)
        : await articles.create(SITE_ID, dto, SYSTEM_USER);
      await publishing.publish(SITE_ID, article.id, {}, SYSTEM_USER);
      logger.log(`${existing ? 'updated' : 'created'} ${template.slug.vi} (${article.id})`);
    }
  } finally {
    await app.close(); // stops the outbox relay after it has published the events
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
