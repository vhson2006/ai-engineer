# 0005. No lost updates: `revision` + ETag / If-Match

- **Status:** Superseded by 0029 (2026-11-11: no revision, ETag or If-Match; the last write wins)
- **Date:** 2026-11-06 (recorded)
- **Related:** `nest-microservice/.claude/rules/microservice.md` ("No lost updates"), `nest-microservice/libs/common/src/http/conditional-requests.ts`

## Context

PATCH did "read the row, then update it". Two users editing the same deployment overwrote each
other silently (lost update), and a stale browser tab could undo a newer change.

## Decision

- A resource that clients modify has `revision Int @default(1)` (DB check `revision >= 1`),
  returned in the body and as `ETag: "<revision>"` on GET one, POST and PATCH.
- PATCH/PUT **require** `If-Match` (RFC 9110, strong comparison; `*` and lists accepted):
  missing → **428** `precondition_required`; not matching → **412** `precondition_failed`.
  Preconditions are evaluated after 404 and 403.
- The write is conditional: `updateManyAndReturn({ where: { id, revision }, data: { …,
  revision: { increment: 1 } } })`; no row back → 404 if deleted, else 412 (a concurrent writer won).
- KrakenD forwards `If-Match` on those endpoints.

## Consequences

- Clients must read before they write and send the revision back; on 412 they reload and re-apply.
- Two concurrent PATCHes: exactly one succeeds (verified live).
- `revision` is not the deployment's `version` (a business field).

## Alternatives considered

- **Last write wins**: silent data loss. Rejected.
- **`updatedAt` as the precondition**: timestamp precision and clock issues. Rejected for an integer.
- **Pessimistic locks (`SELECT … FOR UPDATE`) held across a user's edit**: can't span HTTP requests. Rejected.
