/**
 * Puts the article templates of a site into the content database, PUBLISHED, through the service
 * itself (ADR 0033): CategoriesService creates the site's missing topics, ArticlesService
 * sanitizes the bodies, checks slugs and computes reading time; ArticlePublishingService publishes
 * and writes the outbox events. Never raw SQL.
 *
 *   npm run seed:article-templates                      laundry (default)
 *   npm run seed:article-templates -- nails             another site (nails, wine)
 *   npm run seed:article-templates -- nails --delete-others
 *                                                       ...and deletes every OTHER article of the site
 *
 * From nest-microservice/, with the .env of start:dev. Idempotent: a template already in the
 * database (found by its Vietnamese slug) is updated, not duplicated; an existing topic is kept.
 * Acts as a system user with content:admin (no token involved: it never goes over HTTP).
 */
import '../src/env';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CONTENT_ROLES, type AuthUser, type ArticleTranslationDto } from '@app/common';
import { ArticlePublishingService } from '../src/articles/article-publishing.service';
import { ArticlesModule } from '../src/articles/articles.module';
import { ArticlesService } from '../src/articles/articles.service';
import { CategoriesService } from '../src/categories/categories.service';
import { CONTENT_ENV_SCHEMA } from '../src/content-service.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SitesModule } from '../src/sites/sites.module';
import type { ArticleTemplateSeed, CategorySeed, Locale } from './article-templates/guide';
import { LAUNDRY_CATEGORIES, LAUNDRY_TEMPLATES } from './article-templates/laundry';
import { NAILS_CATEGORIES, NAILS_TEMPLATES } from './article-templates/nails';
import { WINE_CATEGORIES, WINE_TEMPLATES } from './article-templates/wine';

const SITES: Record<string, { categories: CategorySeed[]; templates: ArticleTemplateSeed[] }> = {
  laundry: { categories: LAUNDRY_CATEGORIES, templates: LAUNDRY_TEMPLATES },
  nails: { categories: NAILS_CATEGORIES, templates: NAILS_TEMPLATES },
  wine: { categories: WINE_CATEGORIES, templates: WINE_TEMPLATES },
};
const LOCALES: Locale[] = ['vi', 'en'];

/** Who the articles are "created by": not a Keycloak user, so it never matches a real person. */
const SYSTEM_USER: AuthUser = {
  id: 'system:seed-article-templates',
  roles: [CONTENT_ROLES.ADMIN, CONTENT_ROLES.PUBLISH, CONTENT_ROLES.WRITE],
  groups: [],
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: CONTENT_ENV_SCHEMA }),
    PrismaModule,
    SitesModule,
    ArticlesModule,
  ],
  providers: [CategoriesService],
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
  const args = process.argv.slice(2);
  const siteId = args.find((arg) => !arg.startsWith('--')) ?? 'laundry';
  const deleteOthers = args.includes('--delete-others');
  const site = SITES[siteId];
  if (!site)
    throw new Error(`No templates for site "${siteId}" (known: ${Object.keys(SITES).join(', ')})`);

  const logger = new Logger('seed-article-templates');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService);
    const categoriesService = app.get(CategoriesService);
    const articles = app.get(ArticlesService);
    const publishing = app.get(ArticlePublishingService);

    // Topics: create the missing ones (an existing topic, maybe renamed by the admins, is kept).
    const existingKeys = new Set(
      (await prisma.category.findMany({ where: { siteId }, select: { key: true } })).map(
        (c) => c.key,
      ),
    );
    for (const category of site.categories.filter((c) => !existingKeys.has(c.key))) {
      await categoriesService.create(
        siteId,
        {
          key: category.key,
          position: category.position,
          translations: LOCALES.map((locale) => ({
            locale,
            name: category.name[locale],
            slug: category.slug[locale],
          })),
        },
        SYSTEM_USER,
      );
      logger.log(`created topic ${category.key}`);
    }

    const categories = await prisma.category.findMany({ where: { siteId } });
    const categoryId = (key: string) => {
      const found = categories.find((c) => c.key === key);
      if (!found) throw new Error(`Site ${siteId} has no category "${key}"`);
      return found.id;
    };

    const kept = new Set<string>();
    for (const template of site.templates) {
      const existing = await prisma.articleTranslation.findFirst({
        where: {
          siteId,
          locale: 'vi',
          slug: { in: [template.slug.vi, ...(template.formerSlugs ?? [])] },
        },
      });
      const dto = {
        categoryId: categoryId(template.categoryKey),
        // Templates use the site's own images only, never a cover from the media library.
        coverMediaId: null,
        translations: translations(template),
      };
      const article = existing
        ? await articles.update(siteId, existing.articleId, dto, SYSTEM_USER)
        : await articles.create(siteId, dto, SYSTEM_USER);
      await publishing.publish(siteId, article.id, {}, SYSTEM_USER);
      kept.add(article.id);
      logger.log(`${existing ? 'updated' : 'created'} ${template.slug.vi} (${article.id})`);
    }

    if (deleteOthers) {
      const others = await prisma.article.findMany({
        where: { siteId, id: { notIn: [...kept] } },
        select: { id: true },
      });
      for (const { id } of others) {
        await articles.remove(siteId, id, SYSTEM_USER); // a published one also sends its event
        logger.log(`deleted article ${id}`);
      }
      logger.log(`${others.length} other article(s) deleted`);
    }
  } finally {
    await app.close(); // stops the outbox relay after it has published the events
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
