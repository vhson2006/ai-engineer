/**
 * Imports the content snapshot of sites (ADR 0044, written by export-content.ts) into the content
 * database and the public bucket: the site row when missing, its missing topics, the images
 * (every size, same storage keys) and the articles WITH THEIR STATUS (a draft or unpublished
 * article stays a draft, a published one keeps its publication date).
 *
 *   npm run seed:content -- --deploy                  every site whose snapshot version this
 *                                                     database hasn't imported yet (the Job
 *                                                     content-import of staging and prod, on
 *                                                     every deploy); then never again
 *   npm run seed:content -- --all                     every site of the snapshot (dev, by hand)
 *   npm run seed:content -- sushi travel              these sites
 *   npm run seed:content -- laundry --overwrite       ...and resets articles that already exist
 *                                                     to the snapshot (dev only; never --deploy)
 *
 * Existing rows are never changed (except with --overwrite): an article the admins edited stays
 * as they left it. Each import is recorded in content_imports (site, version): with --deploy, an
 * article the admins deleted doesn't come back on the next deploy; a raised version imports the
 * site's missing articles again. From nest-microservice/ with the .env of start:dev, or in the
 * image `deployment-migrate` (dist/apps/content-import, the env of content-service). Bodies go
 * through the service's sanitizer with this environment's media prefix; publishing writes the same
 * outbox events as the service (published by content-service's relay). Acts as a system user.
 */
import '../src/env';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  addToOutbox,
  ARTICLE_EVENTS,
  CONTENT_ROLES,
  OBJECT_STORAGE,
  StorageModule,
  type AuthUser,
  type MediaContentType,
  type ObjectStorage,
} from '@app/common';
import { unpublishedEvent, liveEvent } from '../src/articles/article-events';
import { toArticleHtml } from '../src/articles/article-html';
import { WITH_TRANSLATIONS } from '../src/articles/articles.mapper';
import { CategoriesService } from '../src/categories/categories.service';
import { CONTENT_ENV_SCHEMA } from '../src/content-service.module';
import { MediaUrls } from '../src/media/media-urls';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SitesModule } from '../src/sites/sites.module';
import { SitesService } from '../src/sites/sites.service';
import {
  contentFile,
  MEDIA_PLACEHOLDER,
  mediaDir,
  SNAPSHOT_DIR,
  type SiteSnapshot,
  type SnapshotArticle,
} from './content-snapshot';

/** Not a Keycloak user, so it never matches a real person. */
const SYSTEM_USER: AuthUser = {
  id: 'system:seed-content',
  roles: [CONTENT_ROLES.ADMIN, CONTENT_ROLES.PUBLISH, CONTENT_ROLES.WRITE],
  groups: [],
};
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Only what the import uses: no NATS, scheduler or cleanup jobs. The events go through the outbox
 * table; content-service's relay (always running, polls every second) publishes them.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: CONTENT_ENV_SCHEMA }),
    PrismaModule,
    SitesModule,
    StorageModule,
  ],
  providers: [CategoriesService, MediaUrls],
})
class SeedModule {}

async function main() {
  const args = process.argv.slice(2);
  const deploy = args.includes('--deploy');
  const overwrite = args.includes('--overwrite');
  if (deploy && overwrite) throw new Error('--deploy never overwrites what the admins changed');
  const siteIds =
    deploy || args.includes('--all')
      ? readdirSync(SNAPSHOT_DIR).filter((d) => existsSync(contentFile(d)))
      : args.filter((a) => !a.startsWith('--'));
  if (!siteIds.length) throw new Error('Name the sites to seed, or --all, or --deploy');
  const snapshots = siteIds.map((id) => {
    if (!existsSync(contentFile(id))) throw new Error(`No snapshot for site "${id}"`);
    return JSON.parse(readFileSync(contentFile(id), 'utf8')) as SiteSnapshot;
  });

  const logger = new Logger('seed-content');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService);
    const storage = app.get<ObjectStorage>(OBJECT_STORAGE);
    const urls = app.get(MediaUrls);
    if (deploy) await migrated(prisma, logger);

    for (const snap of snapshots) {
      const siteId = snap.site.id;
      const counts = { created: 0, overwritten: 0, kept: 0, uploaded: 0 };
      const imported = await prisma.contentImport.findUnique({
        where: { siteId_version: { siteId, version: snap.version } },
      });
      if (deploy && imported) {
        logger.log(
          `${siteId}: snapshot v${snap.version} already imported (${imported.appliedAt.toISOString()})`,
        );
        continue;
      }

      // Site and topics: created when missing; existing ones (maybe edited by the admins) are kept.
      if (!(await prisma.site.findUnique({ where: { id: siteId } }))) {
        const { name, locales, defaultLocale } = snap.site;
        await app.get(SitesService).create({ id: siteId, name, locales, defaultLocale });
        logger.log(`created site ${siteId}`);
      }
      const existingKeys = new Set(
        (await prisma.category.findMany({ where: { siteId }, select: { key: true } })).map(
          (c) => c.key,
        ),
      );
      for (const c of snap.categories.filter((c) => !existingKeys.has(c.key))) {
        await app
          .get(CategoriesService)
          .create(
            siteId,
            { key: c.key, position: c.position, translations: c.translations },
            SYSTEM_USER,
          );
      }
      const categoryId = new Map(
        (await prisma.category.findMany({ where: { siteId } })).map((c) => [c.key, c.id]),
      );

      // Images: the bucket first (missing or different sizes), then the row as `ready`.
      for (const m of snap.media) {
        const other = await prisma.media.findUnique({
          where: { id: m.id },
          select: { siteId: true },
        });
        if (other && other.siteId !== siteId)
          throw new Error(`Image ${m.id} belongs to ${other.siteId}`);
        for (const v of m.variants) {
          const key = urls.key(siteId, m.id, v.width, m.contentType as MediaContentType);
          const stored = await storage.stat('public', key);
          if (stored?.size === v.size) continue;
          const file = join(mediaDir(siteId), m.id, key.slice(key.lastIndexOf('/') + 1));
          await storage.putObject({
            visibility: 'public',
            key,
            contentType: m.contentType,
            body: readFileSync(file),
            cacheControl: IMMUTABLE,
          });
          counts.uploaded++;
        }
        if (!other) {
          await prisma.media.create({
            data: {
              id: m.id,
              siteId,
              status: 'ready',
              source: m.source,
              prompt: m.prompt,
              filename: m.filename,
              contentType: m.contentType,
              width: m.width,
              height: m.height,
              variants: m.variants,
              createdBy: SYSTEM_USER.id,
              createdAt: new Date(m.createdAt),
              uploadedAt: new Date(),
            },
          });
        }
      }

      const mediaPrefix = urls.sitePrefix(siteId);
      const studioPrefix = urls.studioPrefix(siteId);
      for (const a of snap.articles) {
        const result = await restore(a);
        counts[result]++;
      }
      await prisma.contentImport.upsert({
        where: { siteId_version: { siteId, version: snap.version } },
        create: { siteId, version: snap.version, articles: snap.articles.length },
        update: { articles: snap.articles.length, appliedAt: new Date() },
      });
      logger.log(
        `${siteId} v${snap.version}: ${counts.created} articles created, ${counts.overwritten} reset, ` +
          `${counts.kept} kept; ${snap.media.length} images (${counts.uploaded} files uploaded)`,
      );

      async function restore(a: SnapshotArticle): Promise<'created' | 'overwritten' | 'kept'> {
        const current = await prisma.article.findUnique({ where: { id: a.id } });
        if (current && current.siteId !== siteId)
          throw new Error(`Article ${a.id} belongs to ${current.siteId}`);
        if (current && !overwrite) return 'kept';
        const category = categoryId.get(a.categoryKey);
        if (!category) throw new Error(`${siteId}: no topic "${a.categoryKey}"`);
        const translations = a.translations.map((t) => ({
          ...t,
          siteId,
          body: toArticleHtml(
            t.locale,
            t.body.split(MEDIA_PLACEHOLDER).join(mediaPrefix),
            mediaPrefix,
            studioPrefix,
          ),
        }));
        const taken = await prisma.articleTranslation.findFirst({
          where: {
            siteId,
            articleId: { not: a.id },
            OR: translations.map((t) => ({ locale: t.locale, slug: t.slug })),
          },
        });
        if (taken) {
          throw new Error(
            `${siteId}: slug ${taken.locale}/${taken.slug} of article ${a.id} is taken by article ${taken.articleId}`,
          );
        }
        const data = {
          categoryId: category,
          status: a.status,
          featured: a.featured,
          coverMediaId: a.coverMediaId,
          scheduledAt: a.scheduledAt ? new Date(a.scheduledAt) : null,
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
          updatedBy: SYSTEM_USER.id,
        };
        await prisma.$transaction(async (tx) => {
          if (current) {
            await tx.article.update({ where: { id: a.id }, data });
            await tx.articleTranslation.deleteMany({ where: { articleId: a.id } });
            await tx.articleSlugRedirect.deleteMany({ where: { articleId: a.id } });
          } else {
            await tx.article.create({
              data: {
                ...data,
                id: a.id,
                siteId,
                createdBy: SYSTEM_USER.id,
                createdAt: new Date(a.createdAt),
              },
            });
          }
          await tx.articleTranslation.createMany({
            data: translations.map((t) => ({ ...t, articleId: a.id })),
          });
          await tx.articleSlugRedirect.createMany({
            data: a.redirects.map((r) => ({ ...r, siteId, articleId: a.id })),
            skipDuplicates: true,
          });
          const row = await tx.article.findUniqueOrThrow({
            where: { id: a.id },
            include: WITH_TRANSLATIONS,
          });
          if (row.status === 'published') {
            const event =
              current?.status === 'published' ? ARTICLE_EVENTS.UPDATED : ARTICLE_EVENTS.PUBLISHED;
            await addToOutbox(tx, event, liveEvent(row, SYSTEM_USER.id));
          } else if (current?.status === 'published') {
            await addToOutbox(
              tx,
              ARTICLE_EVENTS.UNPUBLISHED,
              unpublishedEvent(row, SYSTEM_USER.id),
            );
          }
        });
        return current ? 'overwritten' : 'created';
      }
    }
  } finally {
    await app.close();
  }
}

/**
 * The Job starts with the migrations (staging applies everything at once; prod runs it after
 * them): wait until table content_imports exists, like nats-setup waits for NATS.
 */
async function migrated(prisma: PrismaService, logger: Logger) {
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.contentImport.count();
      return;
    } catch (error) {
      if (attempt >= 120) throw error;
      if (attempt === 1) logger.log('waiting for the content database and its migrations');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
