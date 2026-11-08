# project: system map for agents

One repository, three parts (ADR 0015; web workspace ADR 0019). Open the agent at this root: this file is always loaded;
each package's `CLAUDE.md`, `.claude/rules/` and skills load when you work on its files.

| Part | What | Own instructions |
|---|---|---|
| `nest-microservice/` | NestJS API: deployment-service (REST + Prisma/Postgres), notification-service (NATS consumer), `libs/common` (contracts, auth, errors, storage, NATS) | `nest-microservice/CLAUDE.md` |
| `web/` | npm workspace (ADR 0019): Next.js 16 BFF apps (`apps/portfolio-web` = user site, `apps/admin-web` = admin site) + shared `packages/core` (`@web/core`: sessions, auth routes, API client, security, i18n) and `packages/ui`; call the API from the server only | `web/CLAUDE.md` |
| `k8s/` | Infrastructure for BOTH (Kustomize): edge Gateway, KrakenD, Keycloak, NATS, data stores, the apps, Grafana Alloy (telemetry → Grafana Cloud, ADR 0023); dev, staging and prod overlays | `k8s/README.md`, `.claude/rules/infrastructure.md`, `.claude/rules/krakend.md` |
| `docs/adr/` | ONE decision log for the whole system | read before undoing a decision |
| `advanced-architecture/` | Separate reference repository (own remote), ignored here | don't modify |

```
Browser ──▶ edge Gateway ─┬─ www.*   ─▶ portfolio-web (Next.js server) ─┐
                          ├─ admin.* ─▶ admin-web (admins + OTP) ───────┴─Bearer──▶ KrakenD (PRIVATE) ──▶ deployment-service ──▶ Postgres
                          └─ auth.*  ─▶ Keycloak (app realm only)                                              └─ NATS event ──▶ notification-service
Browser ◀─ presigned URLs ─▶ object storage (file bytes never go through the apps)
```

## System non-negotiables

1. **The API is private** (ADR 0003): only the web apps' servers (portfolio-web, admin-web) call KrakenD. No `api.<domain>`
   route, no KrakenD CORS, nothing in the browser talks to the API.
2. **Tokens never reach the browser** (ADR 0010): an httpOnly session-id cookie; tokens sealed in Redis.
3. **Every route is authenticated twice** (ADR 0002): KrakenD `auth/validator` and the service's
   `AuthGuard`, same roles. Ownership rules live in the service.
4. **Admin surfaces are never public** (ADR 0004): Keycloak admin / realm `master` through
   port-forward only; no admin UIs for NATS/Redis in the cluster. The one exception is the
   admin SITE `admin.*` (ADR 0019): public host, but administrators only, password + OTP enforced
   by Keycloak AND the role re-checked by the app.
5. **File bytes go straight between browser and storage** (ADRs 0006, 0014).
6. **A change is complete across every part it touches**, in the same change. A new or changed
   endpoint = contract (`libs/common`) + service route + KrakenD endpoint (`k8s/base/krakend/config/krakend.tmpl`,
   incl. forwarded query strings/headers) + web helper (`web/packages/core/src/api/<resource>.ts`)
   + tests on both sides. A new header or query param sent by the web app must be forwarded by KrakenD.

## Where things go

- Agent instructions for one package → that package's `CLAUDE.md` (always), `.claude/rules/*.md`
  (by `paths:`), `.claude/skills/` (procedures). System-wide or `k8s/` → the root `CLAUDE.md` and
  root `.claude/rules/`.
- How to run → READMEs (root: whole stack; package READMEs; `k8s/README.md`).
- Policies and checklists for humans and AI → `docs/ai/ai-usage-policy.md` (root, one copy) and
  each package's `docs/ai/code-review.md`.
- Decisions → `docs/adr/` (root only). A decision that shapes the system gets an ADR in the same
  change; reversing one adds a new ADR and marks the old `Superseded by NNNN`.
- Don't create other places, and never duplicate a rule: link to it.
- **Paths:** in root docs, relative to the root. In package docs, relative to the package, except
  `k8s/...`, `docs/adr/...` and root `.claude/...`, which always mean the root folders.

## Commands

```bash
# root: local Kubernetes stack (scripts in package.json here)
npm run k8s:up            # Gateway + KrakenD + Keycloak + data + NATS (overlays/dev)
npm run k8s:forward       # keep open: Postgres, Redis, NATS, KrakenD :8080, S3, Keycloak admin :8180
npm run k8s:render        # / k8s:render:prod: render without applying
npm run krakend:check     # validate the KrakenD template
npm run keycloak:admin-url  # once per fresh cluster (ADR 0004)
npm run keycloak:admin-otp  # once per fresh cluster: admin site = admins + OTP (ADR 0019)
npm run staging:build && npm run staging:up   # local staging: prod images in the cluster, HTTPS (ADR 0018)

cd nest-microservice && npm run start:dev    # API on the host; tests: npm test, npm run test:e2e, npm run lint:check
cd web && npm install && npm run dev         # both apps: www.localtest.me:8000 + admin.localtest.me:8000 (alice + dev OTP:
                                             # web/apps/admin-web/README.md); tests: npm test / npm run check
```

## CI

`.github/workflows/ci.yml` (PRs and pushes to `main`) runs, per changed part, the same commands as
above (api: `lint:check`, `format:check`, `test`, `test:e2e`, `build`; web: `check`; k8s: kustomize
render of every overlay + `krakend-check.sh`). Required check: `ci-ok`. A new check or package goes
into that workflow in the same change; run the commands locally before pushing.
`.github/workflows/images.yml` (after a green CI on `main`) builds the changed images to GHCR and
commits their tags to `k8s/overlays/prod/kustomization.yaml`: never edit those `newTag` lines by
hand; a new image = a new matrix entry there + an `images:` entry in the overlay.

## Keep this file true

If a convention changes, update this file, the package files and the rules in the same change.
A rule that doesn't match the code is worse than no rule.
