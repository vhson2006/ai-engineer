# 0034. A media library per site; images are optimized in the admin's browser

- **Status:** Accepted, implemented (2026-11-12: content-service, KrakenD, admin-web, laundry-web; not yet checked end to end on a cluster)
- **Date:** 2026-11-12
- **Related:** 0006, 0014 (presigned uploads), 0025 (site rule), 0031, 0033 (article HTML),
  `libs/common/src/contracts/content/content.media.ts`, `apps/content-service/src/media/`,
  `web/packages/core/src/files/optimize-image.ts`, `web/packages/core/src/files/media-upload.ts`,
  `web/apps/admin-web/src/features/media/`

## Context

Articles need a cover image and images in their text. The sites only had their own `/images/…`
files (ADR 0033): a new photo meant a code change and a deployment. Phone photos are large
(3-12 MB, 4000 px) and carry EXIF data, GPS position included; served as they are, they are slow and
leak where they were taken. Files already go straight from the browser to storage (ADR 0014),
but deployment-service's files are per user and per deployment, not per site.

## Decision

- **content-service owns a media library per site**: table `media` (site, sizes, status), objects
  `media/<siteId>/<mediaId>/<width>.<ext>` in the PUBLIC bucket, served by the CDN. A new image is
  a new id: objects never change, so they can be cached forever. Same roles and site rule as the
  articles: list `content:read`; upload, complete and delete `content:write`/`publish`/`admin`.
- **The admin's browser optimizes before uploading** (`optimizeImage`): decoded with the photo's
  orientation, re-encoded (no metadata survives), WebP at quality 0.82 (JPEG where the browser
  has no WebP encoder), up to three widths 640 / 1280 / 1920 never wider than the original, each
  under 3 MB. No server CPU, and the bytes still never reach Next.js, KrakenD or a service.
- **Upload flow** (`createMediaUploader`): declare the sizes (Server Action → API: a `pending` row
  and one presigned PUT per size, type and length signed) → PUT each size to storage → complete
  (the API checks every object: missing → 409, different size or type → objects and row deleted,
  422). Abandoned uploads are purged after 24 h (MediaCleanupService).
- **Covers**: `articles.cover_media_id` (FK, RESTRICT), a READY image of the same site (else 422
  `invalid_cover`); the alt text stays per language (`coverAlt`). Responses carry
  `cover: { id, url, width, height, srcset }`.
- **Images in article bodies**: the sanitizer also keeps `<img>` whose `src` is an image of THIS
  site's library (`<STORAGE_PUBLIC_BASE_URL>/media/<siteId>/<uuid>/<width>.webp|jpg`), with
  `srcset` (each candidate checked the same way) and `sizes`. Another site's images, other paths
  of the bucket and any other host are still removed.
- An image used by an article (cover, or its id in a body) can't be deleted (409 `media_in_use`).
- **Admin**: one library dialog for the cover, the editor's image cards ("choose or upload") and a
  "Media library" page per site (upload, copy URL, delete). Admin's CSP allows the storage
  origins (`STORAGE_ORIGINS`); the storage's CORS allows the admin origin.
- **Sites** render library images with `<img srcset sizes width height>` (already optimized: no
  second resize by the Next.js image optimizer) and use the cover as the link preview image.

## Consequences

- Covers and photos without a deployment; pages get the right size per screen, and no EXIF/GPS
  ever reaches the CDN.
- The quality and size depend on the browser's encoder (WebP everywhere current; older Safari
  gets JPEG). No AVIF: browsers can't encode it reliably yet.
- Each site's public pages need the CDN in their CSP `img-src` (`STORAGE_ORIGINS`).
- Prod needs: CORS on the public bucket for `https://admin.<domain>` (PUT, Content-Type), and the
  secret `nest-microservice-prod-content-storage` (ideally a key limited to `media/`).
- Body usage is found by the image id in the stored HTML: an image removed from every article
  becomes deletable again.

## Alternatives considered

- **Optimize on the server (sharp worker after the upload)**: AVIF and consistent quality, but the
  bytes go through a service (against ADR 0014), and CPU/RAM on a two-node cluster. Rejected.
- **Upload originals, let Next.js optimize on request (`next/image`)**: each site spends CPU on
  first views, body images would need their URLs rewritten, and the originals (with EXIF) would
  be public. Rejected.
- **Reuse deployment-service's files (`public-image`)**: per user, not per site; wrong service and
  roles (ADR 0026). Rejected.
- **A library per article**: no reuse between articles. Rejected (the user chose one per site).
