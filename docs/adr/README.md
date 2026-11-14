# Architecture Decision Records

ONE log for the whole system (API, web app, infrastructure). One file per decision that shapes
the system and that the code alone doesn't explain: the context, what was decided, what it costs,
and what was rejected. Agents and reviewers read the relevant ADR before proposing to undo a
decision.

- Number sequentially: `NNNN-short-title.md`. Never renumber or delete; a reversed decision gets
  status `Superseded by NNNN` and a new ADR explains why.
- Status: `Proposed` → `Accepted` (→ `Superseded by NNNN` / `Deprecated`). `Accepted, partly
  implemented` says what is still missing.
- Keep it short (one screen). HOW belongs in `CLAUDE.md`, `.claude/rules/` or READMEs; the ADR
  says WHY. Paths are relative to the repository root.
- Template: [0000-template.md](0000-template.md).

| # | Decision | Area | Status |
|---|---|---|---|
| [0001](0001-krakend-rest-and-nats-events.md) | KrakenD gateway, REST for requests, NATS events between services | API | Accepted |
| [0002](0002-keycloak-tokens-verified-twice.md) | Keycloak OIDC, RS256 tokens verified locally by KrakenD and by each service | API | Accepted |
| [0003](0003-private-api-public-surface.md) | The API is private: only the web app's server calls it | Infra | Accepted |
| [0004](0004-keycloak-admin-private.md) | Keycloak: only the app realm is public; admin through port-forward | Infra | Accepted |
| [0005](0005-optimistic-concurrency-etag.md) | No lost updates: `revision` + ETag / If-Match | API | Superseded by 0029 |
| [0006](0006-files-presigned-urls.md) | Files: bytes go straight between browser and object storage | API | Accepted |
| [0007](0007-jetstream-outbox-no-bullmq.md) | Events at-least-once: outbox + NATS JetStream + inbox, no BullMQ | API / Infra | Accepted, implemented |
| [0008](0008-nats-reconnect-forever.md) | NATS clients reconnect forever | API | Accepted |
| [0009](0009-delivery-github-argocd-kustomize.md) | Delivery: GitHub + Argo CD, Kustomize base / components / overlays | Infra | Accepted, environments on hold |
| [0010](0010-bff-server-side-sessions.md) | BFF: tokens stay on the server, the browser holds a session id | Web | Accepted |
| [0011](0011-single-flight-token-refresh.md) | Token refresh: single-flight with a Redis lock; only `invalid_grant` signs out | Web | Accepted |
| [0012](0012-one-api-client.md) | One API client (`apiFetch`): retries only what is safe, never throws | Web | Accepted |
| [0013](0013-mutations-server-actions-csrf-idempotency.md) | Mutations: Server Actions + origin check + `once()` | Web | Accepted |
| [0014](0014-browser-uploads-to-storage.md) | Uploads go from the browser straight to storage | Web | Accepted |
| [0015](0015-monorepo-k8s-at-root.md) | One repository; infrastructure (`k8s/`) at the root | Repo | Accepted |
| [0016](0016-csp-without-nonces.md) | Content-Security-Policy from the proxy, without nonces | Web | Accepted |
| [0017](0017-http-protection-by-layer.md) | Rate limits, security headers, compression, CORS: each at the layer that sees the threat | All | Accepted, partly implemented |
| [0018](0018-local-staging-with-https.md) | Local staging: the production setup in the local cluster, with HTTPS | Infra | Accepted |
| [0019](0019-web-workspace-and-admin-site.md) | Web apps in one npm workspace with shared packages; admin is a separate public app (admins + OTP) | Web | Accepted, implemented |
| [0020](0020-i18n-sub-path-json-dictionaries.md) | Languages: sub-path routing (`/en`, `/vi`) and JSON dictionaries, no i18n library | Web | Accepted |
| [0021](0021-seo-build-time-site-url.md) | SEO: `SITE_URL` baked at build, per-language metadata, sitemap, JSON-LD, link previews, icons | Web | Accepted |
| [0022](0022-ui-stack-shadcn-radix-zod.md) | UI stack: shadcn/ui-style on Radix, react-hook-form + zod, TanStack Table, nuqs, `features/` structure | Web | Accepted |
| [0023](0023-observability-grafana-cloud-alloy.md) | Observability: Grafana Cloud fed by Alloy (one per namespace); `/metrics`, OpenTelemetry traces, JSON logs with `trace_id` | All | Accepted, partly implemented |
| [0024](0024-jetstream-streams-one-owner.md) | JetStream streams: one owner (`nats-setup`), one shared `EVENTS` stream, a checked storage budget | API / Infra | Accepted, implemented |
| [0025](0025-multi-site-tenancy.md) | Many client sites: a Keycloak realm per site for customers, one admin realm, shared databases with `site_id` | All | Accepted, partly implemented (`site_id` in content; realms: interim 0028) |
| [0026](0026-business-services-split.md) | Business services: content, commerce, crm, marketing, notification, social | API | Accepted, partly implemented (content) |
| [0027](0027-public-webhook-ingress.md) | A public, signature-checked ingress for platform webhooks (`hooks.*`) | Infra / API | Accepted, not implemented |
| [0028](0028-content-access-interim.md) | Content access until the realm split: `content-api` roles + `/sites/<id>` groups in the current realm | API / Infra | Accepted, interim |
| [0029](0029-no-optimistic-concurrency.md) | No optimistic concurrency: no `revision`, ETag or If-Match; the last write wins | API / Web | Accepted, implemented |
| [0030](0030-admin-site-for-site-admins.md) | The admin site serves site admins too (password); only superadmins need a one-time code | Web / Infra | Accepted, partly implemented |
| [0031](0031-article-body-sanitized-html.md) | Article bodies are HTML, sanitized by content-service with an allow-list | API / Web | Accepted, implemented |
| [0032](0032-public-sites-read-content-with-service-account.md) | Public sites read their published content with their own service account (client credentials) | Web / Infra | Accepted, implemented (laundry-web, nails-web, wine-web; dev) |
| [0033](0033-article-layout-blocks.md) | Article bodies may contain layout blocks from a fixed vocabulary (`tpl-*` classes, site images) | API / Web | Accepted, implemented (blocks edited visually or in HTML) |
| [0034](0034-media-library-browser-optimized-images.md) | A media library per site; images optimized in the admin's browser (WebP, 3 sizes, no EXIF) | API / Web / Infra | Accepted, implemented |
| [0035](0035-longer-admin-sessions.md) | Longer admin sessions for now: 8 h without activity, 7 days at most | Web / Infra | Accepted, interim |
| [0036](0036-ai-service-machine-translation.md) | ai-service, the one caller of AI providers; machine translation of articles (segments, drafts) | API / Web / Infra | Accepted, implemented |
| [0037](0037-ai-generated-images.md) | AI-generated images in the media library (Gemini Flash-Lite Image, server-side WebP, monthly quota per site) | API / Web / Infra | Accepted, implemented |
| [0038](0038-fixed-default-language-public-sites.md) | Public sites open in their own language (nails EN; laundry, wine, portfolio VI), not the browser's; one language cookie per client site | Web | Accepted, implemented |
| [0039](0039-video-studio.md) | Video studio: script templates (code), AI script and voice (ai-service), Remotion render-worker, studio module in content-service | API / Web / Infra | Accepted, implemented (dev) |
| [0040](0040-youtube-embeds-in-articles.md) | YouTube embeds in articles: only the video id in the body, a click-to-load youtube-nocookie player on the client sites | API / Web | Accepted, implemented (dev) |
| [0041](0041-ai-written-articles.md) | Articles written by AI: a brief and an outline to confirm, the article as blocks (not HTML), AI images, written in one language then machine-translated into the site's others; always a draft | API / Web | Accepted, implemented (dev) |
| [0042](0042-business-site-kit-and-sample-sites.md) | `@web/site-kit`: what every business site shares (articles, legal, SEO, header/footer, contact); six sample sites on it (sushi, travel, flowers, autoparts, hotel, spa), fictional, managed from the admin site | Web / API / Infra | Accepted, implemented (dev) |
| [0043](0043-keycloak-configuration-as-code.md) | Keycloak configuration as code: a keycloak-config-cli Job applies realms `nest-microservice` and `master` on every deploy, from the same files in every environment (`k8s/base/keycloak/`, components for test users and the sites' clients) with each environment's URLs and client secrets; no `--import-realm`, no kcadm scripts | Infra | Accepted, implemented (checked in Docker, not yet on the clusters) |
| [0044](0044-content-snapshot-seed.md) | Content snapshot: the sites' articles (every status), topics and the images they use, exported to `apps/content-service/seed/content/` (in git) and restored by `seed:content` with the same ids and status | API | Accepted, implemented (dev) |
| [0045](0045-all-business-sites-on-the-kit.md) | Every business site on `@web/site-kit`: per-site configuration (`defineWebsite`: languages, URLs, legal pages, formats), slots instead of copies; nails, wine, laundry migrated; `check:sites` in CI | Web | Accepted, implemented (dev) |
