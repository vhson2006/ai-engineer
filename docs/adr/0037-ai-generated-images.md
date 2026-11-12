# 0037. AI-generated images in the media library (Gemini Flash-Lite Image, monthly quota)

- **Status:** Accepted, implemented (2026-11-12: fake and Gemini providers, verified end to end
  with `gemini-3.1-flash-lite-image`)
- **Date:** 2026-11-12
- **Related:** extends 0036 (ai-service) and 0034 (media library); an exception to 0014 (bytes
  straight between browser and storage) for bytes no browser has;
  `libs/common/src/contracts/ai/image.events.ts`, `apps/ai-service/src/images/`,
  `apps/content-service/src/media/media-generation.service.ts`,
  `web/apps/admin-web/src/features/media/ai-generate-panel.tsx`

## Context

Site admins need pictures for articles (covers, illustrations) and often have none. Generating one
from a description in the media library saves a trip to a stock site. Image models have no free
tier: every image costs money (Gemini Flash-Lite Image ≈ $0.034 per 1K image), so the spend must be
bounded per site, and a generated image must end up exactly like an uploaded one (optimized sizes
on the CDN, usable as a cover or in a body).

## Decision

- **Where:** "Generate with AI" in the media library and the image picker (admin-web). A
  description (≤ 1000 characters), an aspect ratio (16:9, 4:3, 1:1, 3:4, 9:16) and 1–4 options.
- **Flow** (events, like 0036): `POST …/media/generate` → 202 + Location of the job; content-service
  stores an `image_generation_jobs` row and one PENDING `media` row per image (`source: ai`), and
  publishes `events.image-generation.requested` with one target per image: a key prefix
  `media/<siteId>/<mediaId>/` it chose (the contract only accepts that shape; ai-service checks the
  site again). ai-service calls the provider once per image, **optimizes on the server** with sharp
  (WebP q82, widths 640/1280 and the image's own ≤ 1920, no metadata), writes the sizes to the public
  bucket (`immutable` cache), and answers `completed` (the images made, partial results allowed:
  each one is paid for) or `failed`. content-service (inbox) marks the rows `ready` or `failed`. The
  admin polls `GET …/media/generations/{jobId}`.
- **Exception to 0014:** these bytes are produced by a server, not a browser, so the server writes
  them to storage (ai-service, with a key limited to `media/`). Uploads by people still go straight
  from the browser.
- **Quota:** `CONTENT_AI_IMAGES_PER_MONTH` (default 50) per site and calendar month (UTC), summed
  from the jobs (never deleted: deleting an image does not give it back; images that failed do). A
  per-site advisory lock makes two concurrent requests unable to both take the last images. 422
  `quota_exceeded`. Plus the admin's usual rate limit.
- **Provider:** `AI_IMAGE_PROVIDER` = `fake` (a placeholder drawn locally; tests, staging) or `gemini`
  (`AI_GEMINI_IMAGE_MODEL`, default `gemini-3.1-flash-lite-image`, 1K, JPEG output, `store: false`).
  The prompt gets fixed guardrails: no text, logos, watermarks or real identifiable people. 4xx and
  "no image" (safety refusal) are permanent (`provider_refused`); 429/5xx/network are retried by
  JetStream, the last delivery answers `provider_unavailable`. Usage per image in `ai_usage`.
- **Marking:** library tiles show an "AI" badge and the prompt; the admin is told that Google adds
  an invisible SynthID watermark. Pending AI images can't be deleted (409 `generation_in_progress`);
  failed and abandoned rows are purged after a day with the pending uploads.

## Consequences

- A paid Gemini key (billing enabled) is needed in prod; staging uses `fake`. Worst case per site:
  quota × price (50 × $0.034 ≈ $1.70 a month).
- ai-service now needs object storage (Secret `ai-storage`, `STORAGE_*` settings) and the native
  module `sharp` (its alpine/musl binary is in the lockfile).
- A generated image is indistinguishable from an upload for articles and pages (same table, same
  URLs, same sanitizer rules).
- In dev, `nest start --watch` rebundles `sharp` after a reload and crashes; restart ai-service after
  editing it (a fresh build is fine).

## Alternatives considered

- **Optimize in the admin's browser, like uploads (0034):** the browser would download the original
  from the provider through our server and upload it again: more traffic, a client that must stay
  open, no gain. Rejected.
- **Imagen / larger Gemini image models:** better quality, 2–4× the price. Flash-Lite is enough for
  illustrations; the model is one env value.
- **No quota, rate limit only:** a rate limit bounds speed, not the monthly bill. Rejected.
