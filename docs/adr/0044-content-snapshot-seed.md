# 0044. A content snapshot in git seeds the sites' articles and images

- **Status:** Accepted, implemented (dev; staging and prod by the Job content-import)
- **Date:** 2026-11-14
- **Related:** 0033 (layout blocks; its seed of templates is replaced), 0034 (media library), 0037
  (AI images), 0041 (AI-written articles), 0042 (sample sites),
  `nest-microservice/apps/content-service/scripts/{export-content,seed-content,content-snapshot}.ts`,
  `k8s/components/apps/content-import-job.yaml`

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
- **Every environment gets the snapshot, without anyone creating content by hand**:
  - **staging and prod**: the Job `content-import` (`k8s/components/apps`) runs
    `seed-content --deploy` on every deploy (prod: Argo CD PostSync hook; staging: `staging:up`
    waits for it), with content-service's settings (database, bucket, CDN URL, object ACL), from the
    image `deployment-migrate` (same commit as the migrations; it carries the snapshot). Staging
    rehearses exactly what prod runs.
  - **dev**: `npm run seed:content -- --all|<sites>` by hand (the services run on the host).
- **Each site's snapshot is imported once per environment**: `content.json` has a `version`; table
  `content_imports` records (site, version). `--deploy` imports only the versions not recorded,
  then never again: from then on the environment owns its content, and what its admins edit or
  delete stays so (a deleted article does not come back on the next deploy). `--deploy` never
  overwrites (`--overwrite` is refused with it). To ship new articles of a site, add them to the
  snapshot and raise its `version`: the next deploy adds the missing articles and keeps the rest.
- The snapshot holds content only, nothing to test with: the test users and the `dev-cli` client
  stay in `k8s/components/keycloak-local` (dev and staging, never prod).

## Consequences

- Content survives a fresh cluster, as it was on 2026-11-14; what changes afterwards in a
  database stays there. A fresh staging and the first prod deploy come up with the nine sites,
  their articles and images.
- Raising a site's `version` re-adds the snapshot's articles that the environment no longer has
  (the deleted ones too): remove from the snapshot what must not come back.
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
