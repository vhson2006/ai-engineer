---
paths:
  - 'packages/core/src/files/**'
  - 'packages/core/src/api/files.ts'
  - 'apps/*/src/features/files/**'
  - 'apps/*/src/app/files/**'
---

# Files (upload, download, delete)

Flow and diagram: README "Files". The bytes NEVER go through Next.js, KrakenD or the API: the
browser PUTs them to object storage with a presigned URL and downloads them from there.

- Upload from a client component: `useFileUpload(purpose)` (one file, state + progress + cancel)
  or `uploadFile(file, purpose, { onProgress, signal })` from `@/features/files/use-file-upload`. Then send
  the returned `file.id` with the form (e.g. `attachmentIds`). Never post file bytes to a Server
  Action, a Route Handler or the API (Server Actions also cap bodies at 1 MB).
- Download / display: `<a href={fileDownloadPath(id)}>`, `<img src={fileDownloadPath(id, { inline: true })}>`
  (`@web/core/files`): our route gets a fresh short-lived link with the session and redirects. Don't
  render `StoredFile.url` of private files in pages: it expires.
- Delete: `removeFile(id)` (`@/features/files/actions`), then refresh the list.
- A new purpose is added in nest-microservice (`FILE_PURPOSES`) first, then mirrored in
  `packages/core/src/files/`. The API stays the authority on types and sizes; the checks here only give an
  early, friendly message.
- The storage must allow `APP_URL` in its CORS (PUT + Content-Type), or uploads fail in the
  browser with a network error.
