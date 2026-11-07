# 0006. Files: bytes go straight between browser and object storage

- **Status:** Accepted
- **Date:** 2026-11-05 (recorded 2026-11-06)
- **Related:** `nest-microservice/apps/deployment-service/src/files/`, `nest-microservice/libs/common/src/storage/`,
  `nest-microservice/libs/common/src/contracts/file/`, portfolio-web `.claude/rules/files.md`

## Context

Deployments have attachments (logs, reports, screenshots) and the site has public images.
Streaming bytes through the web app, KrakenD and a service would cost memory, bandwidth and
timeouts on every hop (KrakenD CE also follows redirects and would stream downloads itself), and
Server Actions cap request bodies.

## Decision

- **Metadata in Postgres** (`files`: purpose, visibility, status `pending → uploaded →
  deleting → deleted`, owner, size, type), **bytes in S3-compatible storage** (SeaweedFS in dev;
  Spaces / S3 / R2 in prod), a public and a private bucket.
- The **server decides** from the purpose (`FILE_PURPOSES`): bucket, allowed types (never types a
  browser executes), max size. The object key is server-made (`<purpose>/<yyyy>/<mm>/<uuid>.<ext>`),
  never from the user's file name.
- **Upload**: `POST /api/files/uploads` → presigned PUT with **signed `Content-Type` and
  `Content-Length`** (storage refuses anything else) → browser PUTs → `POST /api/files/:id/complete`
  (HEAD on the object: exists, same size, same type → `uploaded`; otherwise the object is deleted, 422).
- **Download**: `GET /api/files/:id/download-url` returns a short-lived link (with
  `Content-Type` and `Content-Disposition`) as JSON, never a 3xx; the web app redirects the browser.
  Public files: stable CDN URL.
- Attaching files to a deployment is a conditional update in the deployment's transaction.
- An hourly cleanup job purges abandoned uploads, unattached attachments and failed deletions.

## Consequences

- The client makes 3 calls per upload (wrapped once in portfolio-web: `useFileUpload`).
- Storage must allow the web origin in CORS (PUT + Content-Type).
- A presigned download link works for anyone who has it until it expires (minutes).
- File contents aren't inspected yet (only size and declared type): a follow-up is an async scan
  (magic bytes / antivirus) after `complete`, fed by 0007.

## Alternatives considered

- **Multipart upload through the API (Multer)**: memory, gateway limits and timeouts. Rejected.
- **Auto-complete via storage event notifications**: provider-specific, more infrastructure. Not now.
- **Stream downloads through the web app**: only if a file type must never be shareable by link.
