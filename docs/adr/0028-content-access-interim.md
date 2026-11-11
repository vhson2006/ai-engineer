# 0028. Content access until the realm split: `content-api` roles and `/sites/<id>` groups

- **Status:** Accepted, interim (until the realm list and per-site roles of ADR 0025 are decided)
- **Date:** 2026-11-10
- **Related:** 0002, 0019, 0025 (target: a realm per site + one admin realm), 0026,
  `libs/common/src/contracts/content/content.roles.ts`, `apps/content-service/src/common/site-access.ts`,
  `k8s/base/krakend/config/templates/endpoint.tmpl`, `k8s/overlays/*/keycloak/realm-nest-microservice.json`

## Context

content-service (ADR 0026) is built before the Keycloak layout of ADR 0025 exists: there is one
realm (`nest-microservice`) and its tokens carry the client roles of `deployments-api`. The
service needs, today, (1) what a user may do with content and (2) which sites they may touch,
checked twice (ADR 0002), without waiting for the per-site role model still under discussion.

## Decision

- **Own resource server `content-api`** in the current realm, with client roles `content:read`,
  `content:write` (drafts and categories), `content:publish` (publish, schedule, unpublish, change
  what is not a draft) and `content:admin` (every site, create and change sites). The clients that
  call it (`admin-web`, and `dev-cli` in dev) get an audience mapper for `content-api`.
- **Site membership = Keycloak groups `/sites/<siteId>`** (subgroups count), sent in the access
  token's `groups` claim (group membership mapper, full path). The service reads them into
  `AuthUser.groups`; a site the caller doesn't belong to answers **404** like an unknown one.
  `content:admin` belongs to every site. Roles apply to every site the user belongs to.
- **KrakenD checks the `content-api` audience and roles** per endpoint (`endpoint.tmpl` gained an
  optional `audience`); the service checks them again (`@Roles`) plus the site rule.
- **content-service verifies only `content-api` tokens**: `CONTENT_AUTH_AUDIENCE` (default
  `content-api`) is set as `AUTH_AUDIENCE`/`AUTH_ROLES_CLIENT` before the module loads
  (`src/env.ts`), because in dev every service shares one `.env`.
- Group grants in the realm: `viewers` → read, `developers` → read + write, `admins` → all four.

## Consequences

- Works now, in one realm, with the existing admin site and its OTP flow; nothing in the
  service depends on how membership will later be expressed beyond "a list of site ids".
- One person has the same content roles on every site they belong to: "editor on nails, owner on
  wine" isn't expressible yet. ADR 0025's follow-up (per-site roles, realm per site) replaces this
  and supersedes this ADR.
- Realm JSON is imported only when the realm is created: an existing cluster needs the same
  changes through the admin API (kcadm), like other realm changes.
- The sites' servers will need their own tokens (service accounts or the customers' realms) to
  read `published-articles`; until then the sample sites keep their JSON.

## Alternatives considered

- **Reuse `deployments-api` and add content roles there**: mixes two APIs' permissions in one
  client; every token for one API would grant the other. Rejected.
- **Site list in a user attribute**: needs Keycloak's user profile configured for unmanaged
  attributes and per-user editing; groups are visible, auditable and already used for roles.
- **Wait for the realm split**: blocks the first business service on an open decision.
