# 0044. A content snapshot in git seeds the sites' articles and images

- **Status:** Accepted, implemented (dev)
- **Date:** 2026-11-14
- **Related:** 0033 (layout blocks; its seed of templates is replaced), 0034 (media library), 0037
  (AI images), 0041 (AI-written articles), 0042 (sample sites),
  `nest-microservice/apps/content-service/scripts/{export-content,seed-content,content-snapshot}.ts`

## Context

The nine sites' articles (47 written by AI, ADR 0041, plus the writers' guide of each site) cost
real money to produce (about 400,000 VND of Gemini calls, mostly the images) and an editor's time
to review, publish or unpublish. They lived only in the dev database and the dev bucket: a fresh
cluster (`k8s:down`, a new laptop, local staging) lost them. The previous seed
(`seed:article-templates`) rebuilt only the writers' guide, from TypeScript, and always PUBLISHED
it, so it undid an editor's unpublishing.

## Decision

- **The snapshot is data in git**: `apps/content-service/seed/content/<siteId>/content.json` (the
  site, its topics, every article in every language with its status, dates, cover, old slugs) and
  `media/<id>/<width>.<ext>` (every stored size of the images the articles use, the bucket's own
  bytes). In body HTML the site's media prefix is replaced by `{{media}}/`, so the snapshot does not
  depend on an environment's storage URL.
- **Only what articles use**: an image of the media library that no article uses (cover or body) is
  not exported; studio files, AI jobs and the usage ledger are not content and are not exported
  (a seeded site starts with a fresh AI image quota).
- **The snapshot is fixed** (2026-11-14: 9 sites, 56 articles, 85 images). Later edits in the admin
  site are not exported back: it is seed data, not a mirror of live content.
  `npm run content:export -- --all|<sites>` (whole site folder rewritten from the dev database and
  bucket) is kept only to rebuild the snapshot from scratch if that is ever decided.
- **`npm run seed:content -- --all|<sites>`** restores it: site and topics when missing, images
  uploaded under the same keys (skipped when already stored with the same size) and their rows as
  `ready`, articles with the snapshot's ids, **status and dates** (a draft or an unpublished article
  stays a draft, a published one keeps its date). Bodies go through the service's sanitizer with
  the target's media prefix; a published article writes the same outbox event as publishing does.
  Existing articles are left alone unless `--overwrite`; a slug held by another article stops the
  seed with a clear error. Idempotent.
- The writers' guide is part of the snapshot like any article; the TypeScript templates and
  `seed:article-templates` are removed.
- **Dev and local staging only.** Production content of real businesses is never seeded.

## Consequences

- Content survives a fresh cluster, as it was on 2026-11-14; what changes afterwards in a
  database stays there.
- The repository holds about 20 MB of images (WebP), once: the snapshot being fixed, it does not
  grow.
- The seed writes rows with Prisma (the service's own client, inside one transaction per article)
  instead of calling ArticlesService, because ids, status and dates must be restored exactly; it
  still uses the service's sanitizer and event payloads, so ADR 0033's guarantees hold.

## Alternatives considered

- **A database dump + bucket copy**: exact but environment-bound (users, URLs, AI jobs, quotas) and
  not reviewable in a diff. Rejected.
- **Regenerate with AI on each fresh cluster**: costs money every time and gives other articles.
  Rejected.
- **Git LFS for the images**: unnecessary at ~20 MB; reconsider if the snapshot grows past ~100 MB.
