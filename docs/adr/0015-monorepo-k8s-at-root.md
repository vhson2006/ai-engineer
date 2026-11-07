# 0015. One repository; infrastructure (`k8s/`) at the root

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** 0019 (layout of the web part: `web/` workspace), `CLAUDE.md` (root), `k8s/README.md`, `.claude/rules/infrastructure.md`, ADR 0009

## Context

nest-microservice and portfolio-web were two git repositories, and `k8s/` lived inside
nest-microservice although it describes the whole system: the edge Gateway, Keycloak, NATS and
the data stores, the web app's Deployment, env and NetworkPolicies, and KrakenD, whose routes
change together with the services and with the web app's API helpers. A cross-cutting change
(new endpoint = contract + service + KrakenD route + web helper) spanned two repositories, rules
and docs were duplicated (two AI usage policies, two ADR logs), and an AI agent working in one
repository couldn't see or check the other side (e.g. a header the web app sends but KrakenD
doesn't forward). Neither repository had real history yet (0 and 1 scaffold commits), and CI /
Argo CD weren't set up.

## Decision

- **One git repository** at the project root with three parts: `nest-microservice/` (API),
  `portfolio-web/` (Next.js BFF), `k8s/` (infrastructure for both).
- System-wide things live at the root: `CLAUDE.md` (system map), `.claude/rules/` (KrakenD,
  infrastructure), `docs/adr/` (ONE decision log for everything), `docs/ai/ai-usage-policy.md`,
  `package.json` with the infrastructure scripts (`k8s:*`, `krakend:check`, `keycloak:admin-url`).
- Each package keeps what is only about itself: its `CLAUDE.md`, `.claude/rules/`,
  `.claude/skills/`, `docs/ai/code-review.md`, README, package.json, Dockerfile.
- Paths in root docs are relative to the root; package docs name root paths explicitly
  (`k8s/...` is always the root folder).
- `advanced-architecture/` (a separate reference repository with its own remote) stays outside,
  ignored. The two former `.git` folders are kept in `.git-backups/` (ignored).

## Consequences

- A cross-cutting change is one change and one review; an agent opened at the root sees every
  side, and package rules/skills still load for their own files.
- CI (when set up, ADR 0009) needs path filters per part; Argo CD reads `k8s/overlays/prod` from
  this repository; CI's image-tag bump commits must not retrigger builds.
- Deploy permissions can't be separated by repository: use CODEOWNERS on `k8s/overlays/prod`
  and branch protection instead.

## Alternatives considered

- **Keep `k8s/` inside nest-microservice**: the web app's infrastructure lives in another
  package; changes still span two repositories. Rejected.
- **A separate infrastructure (GitOps config) repository**: the classic pattern for many teams
  with separate deploy rights, but a new endpoint would touch three repositories and docs would
  split further. Rejected for a single developer / small team; reconsider if deploy rights must be
  separated.
