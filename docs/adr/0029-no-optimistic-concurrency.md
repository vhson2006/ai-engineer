# 0029. No optimistic concurrency: no `revision`, ETag or If-Match; the last write wins

- **Status:** Accepted, implemented (2026-11-11)
- **Date:** 2026-11-11
- **Related:** supersedes 0005; 0007 (event order), 0026, `nest-microservice/.claude/rules/microservice.md`,
  `web/.claude/rules/api.md`, `k8s/base/krakend/config/krakend.tmpl`

## Context

ADR 0005 made every changeable resource carry a `revision`, sent as `ETag`, and required
`If-Match` on PATCH (428 without it, 412 when stale). With content-service it spread to sites,
categories and articles, including the publish/unpublish actions and, as proposed next, DELETE.
The owner decided the mechanism costs more than it protects for these sites: every client call
must carry a version, every form must keep it, and every stale tab ends in an error the admins of
small businesses don't expect. Edits of the same record by two people at the same minute are rare
here.

## Decision

- **No optimistic concurrency anywhere**: no `revision` column, no `revision` in responses, no
  `ETag` header (Express' automatic weak ETag is disabled too, so no `304` either), no `If-Match`
  (KrakenD doesn't forward it), no 412/428 from the API.
- **Updates are plain PATCHes** with JSON merge semantics and **the last write wins**. A record
  deleted between the read and the write answers 404.
- Database: forward migrations drop the columns (`drop_deployment_revision`,
  `drop_revision` in content); the old migrations stay as history.
- Rules that need a stable view of a row inside one request (e.g. content-service's "keep the old
  slug of a live article") still read and write in the same transaction.

## Consequences

- Simpler clients: no version to keep in forms, no 412/428 handling in `@web/core`.
- **Lost updates are possible**: two people saving the same record silently overwrite each other;
  a stale browser tab can undo a newer change; deleting a record someone just changed deletes the
  new content. Admin screens should reload a record before editing it and after saving it.
- Event payloads computed from the row read before the write (e.g. `previousStatus` of
  `deployment.status-changed`) can be inaccurate when two writes race.
- Consumers can't order events by version: where order matters they compare timestamps
  (`occurredAt`) or re-read the source.
- Reintroducing it later is a new ADR plus a migration adding the columns back.

## Alternatives considered

- **Keep ADR 0005 and extend If-Match to DELETE**: the safest option, rejected by the owner for
  the cost above.
- **Optional If-Match (checked only when sent)**: keeps all the code paths and tests for a check
  no client would use. Rejected.
- **`updatedAt` as the version**: the same mechanism with a weaker token. Rejected.
