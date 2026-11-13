# 0039. Video studio: script templates, AI rewrite and voice, Remotion render worker

- **Status:** Accepted, in progress (2026-11-12)
- **Date:** 2026-11-12
- **Related:** 0026 (content-service), 0034 (media library), 0036 (ai-service), 0037 (AI images,
  an exception to 0014 this one extends), 0007/0024 (events),
  `libs/common/src/contracts/content/studio.*.ts`, `libs/common/src/contracts/ai/{script,speech}.events.ts`,
  `apps/content-service/src/studio/`, `web/packages/video/`, `web/apps/render-worker/`

## Context

Site admins want short marketing clips for TikTok, Reels and Shorts without editing software:
pick a ready-made script, give it photos, a host and a voice, let AI write the lines, preview,
export an MP4. The building blocks exist: the per-site media library, ai-service (the one caller
of AI providers) and Remotion projects in `video/` that render videos from React code.

## Decision

- **Script templates are code** (`STUDIO_TEMPLATES` in libs/common, versioned): each declares its
  slots (images, avatars, speakers, facts: free text or a published article) and its scenes
  (purpose, which slot it shows, word and on-screen character limits). First three: `price-hook`,
  `host-intro`, `article-tips` (9:16). Each template id is a Remotion composition of the same name
  in `@web/video` (`web/packages/video`). A project records the template VERSION it used.
- **Where:** a `studio` module of **content-service** (not a new service): it needs the media
  library, the articles, the sites and the site rule, all in that database. Tables
  `studio_brand_kits` (per site: name, tagline, phone, call to action, tone, banned phrases,
  colours, logo), `studio_avatars` (a media-library photo, a default voice and a **consent note**:
  only real people who agreed, or licensed stock), `studio_projects`, `studio_renders` (one row per
  render: history, monthly quota, and the render report the Remotion license asks for).
  Routes `/api/content/sites/{siteId}/studio/...`, `content:read` to view, `content:write` to change
  (same audience and roles as the rest of content-service; site rule of 0028).
- **Flow** (events and outbox, like 0036/0037; every step answered `completed` or `failed`):
  1. **Script:** `POST …/projects/{id}/script` → `events.script-writing.requested` (brand kit,
     facts, scene limits, banned phrases, 3 hook variants) → ai-service (Gemini, JSON schema) →
     `…completed` (hooks, lines per scene, caption, hashtags). content-service checks the result
     (word limits, banned phrases, numbers not found in the facts) and stores WARNINGS for the
     admin; it never publishes anything by itself. The admin edits and picks a hook.
  2. **Voice:** `POST …/voice` → `events.speech.requested` (one line per scene, its voice) →
     ai-service (Gemini TTS `gemini-3.8-flash-tts`, prebuilt voices, through the REST
     `generateContent`: the TTS models don't serve the Interactions API) writes `studio/<siteId>/<projectId>/voice/<jobId>/<sceneId>.wav` to the
     public bucket itself (like 0037) → `…completed` (keys, durations). Scene timing follows them.
  3. **Render:** `POST …/render` → content-service resolves every input to public URLs (media,
     voice, avatar, brand) into the composition's props → `events.video-render.requested` →
     **render-worker** (`web/apps/render-worker`: Remotion + headless Chrome, one render at a time)
     writes `studio/<siteId>/<projectId>/video/<renderId>.mp4` and answers `…completed|failed`.
- **render-worker** is a plain Node process in the web workspace (it bundles `@web/video`, the
  same compositions the admin previews with `@remotion/player`). It has no database: it renders,
  uploads, publishes the answer with the render id as `Nats-Msg-Id` (deduplicated), then acks; a
  crash before the ack re-renders to the same key (idempotent). JSON logs, no tokens.
- **In the cluster ("option A", chosen 2026-11-12):** render-worker shares the nodes with the site
  (no dedicated node pool: one pool is simpler to run) and stays a good neighbour: 1 render at a
  time (`RENDER_CONCURRENCY=1`), requests = limits = 1 CPU, memory limit 2Gi (incl. the
  memory-backed `/dev/shm`), PriorityClass `render-batch` (-100, never preempts: the first pod
  evicted), a soft anti-affinity away from Keycloak and KrakenD, `Recreate` on rollout (no second
  pod reserving a CPU; JetStream redelivers a render cut short). Production gets a third node
  (3 × 2 vCPU / 4 GB) so the renderer always has room.
- **Fonts are self-hosted** in `@web/video` (Be Vietnam Pro, OFL, latin/latin-ext/vietnamese per
  weight): renders never depend on Google Fonts and admin-web's CSP keeps `font-src 'self'`.
- **Preview** in admin-web with `@remotion/player` (no render, no cost); the admin page receives
  the same props as the worker.
- **Storage:** studio files live in the PUBLIC bucket under `studio/<siteId>/<projectId>/` (random
  ids): finished clips are published on social networks anyway. ai-service and render-worker only
  accept keys under `studio/<siteId>/`.
- **Quota:** `CONTENT_STUDIO_RENDERS_PER_MONTH` (default 30) renders per site and month, counted
  from `studio_renders` (failed ones given back). Script and voice requests: the admin's rate limit.
- **Media library:** a "Video" section lists the finished clips (download, open). Deleting a
  project deletes its files, refused (409 `video_in_use`) while an article body shows one of them.
- **Clips in articles, self-hosted on our CDN** (no streaming service: 10-20 s clips play by
  progressive download, the MP4s are faststart). Next to each render's full-quality MP4 (for social
  networks) render-worker cuts, with Remotion's ffmpeg (no second render), `<renderId>-web.mp4`
  (720 wide, crf 26) and `<renderId>.jpg` (poster): `videoWebKeys` in libs/common. Article bodies
  may contain `<video>` (`figure.tpl-video`, 9:16, at most 22rem wide): content-service keeps it
  only with a src (and poster) among the SITE's `studio/` clips and always writes `controls
  playsinline preload="none"` (no autoplay, nothing loaded before play). The admin editor inserts
  one from the finished clips ("Video from the studio"). YouTube embeds were considered: free
  streaming and reach, but an iframe, YouTube's tracking and a heavier page; later if wanted.
- **Remotion license:** free for organisations of at most 3 people (incl. contractors); site admins
  using our templates are not licensees (they get MP4s, they never upload Remotion code). From 4
  people: Company License "Automators" ($0.01/render, min $100/month) and a monthly render report:
  `studio_renders` is that report. Previews in the Player don't count; thumbnails are cut from the
  MP4 (a `renderStill` would count).

## Consequences

- One more process to run and deploy (Chrome + ffmpeg: a heavy image, CPU-bound); a site's
  clips wait in the queue behind other sites' (one render at a time per worker; add workers).
- Templates change only with a code release; a new template = a spec + a composition.
- AI-made content is labelled by the admin when posting (TikTok/Meta "AI-generated" labels);
  avatars of real people need their consent (stored note). Wine (alcohol): templates with prices
  or promotions are not offered for it (`STUDIO_TEMPLATES[].excludeSites`).

## Alternatives considered

- **A separate studio-service:** cleaner domain boundary, but it would need the media library,
  the articles and the site list through events or trusted URLs, plus a database and a deployment.
  Can be split out later (tables carry site_id, the flow is event-based).
- **Rendering in content-service or ai-service:** Chrome inside an API process; rejected.
- **A dedicated node pool for renders ("option B"):** full isolation from the site and the whole
  node for each render, at the same price as the third node, but a second pool to run and a node
  idle most of the month. Rejected for now (simpler to manage one pool).
- **At scale** (renders often waiting in the queue, or a worker busy all day), in order:
  **Remotion Lambda** (a clip split into chunks rendered in parallel, pay per render; a second
  cloud and its egress), or **an autoscaled worker pool** (KEDA on the JetStream consumer's
  pending count, cluster autoscaler, spot nodes: a render is safe to retry), or a video SaaS
  (Shotstack, Creatomate: templates rewritten in their format). The event contract stays: only
  `renderer.ts` in render-worker changes (e.g. to `renderMediaOnLambda`).
