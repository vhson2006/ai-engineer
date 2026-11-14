/**
 * Writes the content snapshot of sites (ADR 0044) from the content database and the public bucket:
 * the site, its topics, EVERY article as it is now (drafts, unpublished and scheduled ones keep
 * their status), and only the media-library images those articles use (cover or body). Images no
 * article uses are left out; studio files are not part of the snapshot.
 *
 *   npm run content:export -- laundry nails           these sites
 *   npm run content:export -- --all                   every site of the database
 *
 * The snapshot is FIXED (2026-11-14, ADR 0044): admin-site edits are not exported back. This script
 * only rebuilds it from scratch if that is ever decided. From nest-microservice/, with the .env of
 * start:dev (dev stack + k8s:forward). Rewrites `apps/content-service/seed/content/<siteId>/`.
 */
import '../src/env';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CONTENT_ENV_SCHEMA } from '../src/content-service.module';
import { MediaModule } from '../src/media/media.module';
import { MediaUrls, variantsOf } from '../src/media/media-urls';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  contentFile,
  MEDIA_PLACEHOLDER,
  mediaDir,
  SNAPSHOT_DIR,
  type SiteSnapshot,
  type SnapshotArticle,
} from './content-snapshot';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: CONTENT_ENV_SCHEMA }),
    PrismaModule,
    MediaModule,
  ],
})
class ExportModule {}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const args = process.argv.slice(2);
  const logger = new Logger('export-content');
  const app = await NestFactory.createApplicationContext(ExportModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService);
    const urls = app.get(MediaUrls);
    const siteIds = args.includes('--all')
      ? (await prisma.site.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map(
          (s) => s.id,
        )
      : args.filter((a) => !a.startsWith('--'));
    if (!siteIds.length) throw new Error('Name the sites to export, or --all');

    for (const siteId of siteIds) {
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) throw new Error(`No site "${siteId}"`);
      const prefix = urls.sitePrefix(siteId);
      const mediaRef = new RegExp(`${escape(prefix)}([0-9a-f-]{36})/`, 'g');

      const categories = await prisma.category.findMany({
        where: { siteId },
        include: { translations: { orderBy: { locale: 'asc' } } },
        orderBy: [{ position: 'asc' }, { key: 'asc' }],
      });
      const keyOf = new Map(categories.map((c) => [c.id, c.key]));
      const rows = await prisma.article.findMany({
        where: { siteId },
        include: {
          translations: { orderBy: { locale: 'asc' } },
          redirects: { orderBy: [{ locale: 'asc' }, { slug: 'asc' }] },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      const used = new Set<string>();
      const articles: SnapshotArticle[] = rows.map((a) => {
        if (a.coverMediaId) used.add(a.coverMediaId);
        return {
          id: a.id,
          categoryKey: keyOf.get(a.categoryId)!,
          status: a.status,
          featured: a.featured,
          coverMediaId: a.coverMediaId,
          scheduledAt: a.scheduledAt?.toISOString() ?? null,
          publishedAt: a.publishedAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
          translations: a.translations.map((t) => {
            for (const m of t.body.matchAll(mediaRef)) used.add(m[1]);
            return {
              locale: t.locale,
              title: t.title,
              slug: t.slug,
              excerpt: t.excerpt,
              coverAlt: t.coverAlt,
              body: t.body.split(prefix).join(MEDIA_PLACEHOLDER),
              readingMinutes: t.readingMinutes,
              seoTitle: t.seoTitle,
              seoDescription: t.seoDescription,
            };
          }),
          redirects: a.redirects.map((r) => ({ locale: r.locale, slug: r.slug })),
        };
      });

      const media = await prisma.media.findMany({
        where: { siteId, id: { in: [...used] }, status: 'ready' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      const missing = [...used].filter((id) => !media.some((m) => m.id === id));
      if (missing.length)
        throw new Error(`${siteId}: articles use missing images ${missing.join(', ')}`);

      rmSync(join(SNAPSHOT_DIR, siteId), { recursive: true, force: true });
      let bytes = 0;
      for (const m of media) {
        for (const v of variantsOf(m)) {
          const url = urls.variantUrl(m, v.width);
          const response = await fetch(url);
          if (!response.ok)
            throw new Error(`${siteId}: ${response.status} for image ${m.id}/${v.width}`);
          const body = Buffer.from(await response.arrayBuffer());
          const file = join(mediaDir(siteId), m.id, url.slice(url.lastIndexOf('/') + 1));
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, body);
          bytes += body.length;
        }
      }

      const snapshot: SiteSnapshot = {
        site: {
          id: site.id,
          name: site.name,
          locales: site.locales,
          defaultLocale: site.defaultLocale,
        },
        categories: categories.map((c) => ({
          key: c.key,
          position: c.position,
          translations: c.translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            slug: t.slug,
          })),
        })),
        media: media.map((m) => ({
          id: m.id,
          source: m.source,
          prompt: m.prompt,
          filename: m.filename,
          contentType: m.contentType,
          width: m.width,
          height: m.height,
          variants: variantsOf(m),
          createdAt: m.createdAt.toISOString(),
        })),
        articles,
      };
      mkdirSync(dirname(contentFile(siteId)), { recursive: true });
      writeFileSync(contentFile(siteId), `${JSON.stringify(snapshot, null, 2)}\n`);
      const byStatus = articles.reduce<Record<string, number>>(
        (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
        {},
      );
      logger.log(
        `${siteId}: ${articles.length} articles ${JSON.stringify(byStatus)}, ${media.length} images ` +
          `(${(bytes / 1048576).toFixed(1)} MB), ${categories.length} topics`,
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
