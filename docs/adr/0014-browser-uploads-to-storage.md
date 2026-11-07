# 0014. Uploads go from the browser straight to storage

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** ADR 0006 (files), `portfolio-web/.claude/rules/files.md`,
  `web/packages/core/src/files/upload.ts`, `web/apps/portfolio-web/src/features/files/use-file-upload.ts`, `web/apps/portfolio-web/src/app/files/[id]/download/route.ts`

## Context

The API issues presigned URLs (ADR 0006), but the browser can't call the API (it
has no token, and the API is private). Server Actions cap bodies at 1 MB, and streaming files
through Next.js would load the web servers for nothing. Components need one simple way to upload
with progress and to link files.

## Decision

- **Upload** in 3 steps behind one call (`uploadFile` / `useFileUpload(purpose)`):
  Server Action `startUpload` (validates, asks the API, returns only `{ fileId, url, headers,
  expiresAt }`) → browser **PUT with XMLHttpRequest** (progress, cancel; retried on network
  errors / 5xx / 429, not on 403) → Server Action `finishUpload` (API verifies the object).
- The browser checks type and size first for a friendly message; the API and the signed headers
  remain the authority.
- **Download**: `fileDownloadPath(id)` → our route `/files/<id>/download` asks the API for a
  short-lived link with the session and answers 302 to storage. Pages never render the expiring
  `StoredFile.url` of private files.

## Consequences

- Storage CORS must allow `APP_URL` (PUT + Content-Type); verified in dev (other origins → 403).
- An abandoned upload leaves a `pending` file that the API's cleanup job removes.
- File bytes never reach Next.js, KrakenD or the services.

## Alternatives considered

- **Post the file to a Server Action / Route Handler and forward it**: body limits, memory,
  bandwidth. Rejected.
- **`fetch` for the PUT**: no upload progress. Rejected for XHR.
