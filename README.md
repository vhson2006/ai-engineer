# project

| Part | What |
|---|---|
| [`nest-microservice/`](nest-microservice/README.md) | The API: NestJS microservices behind KrakenD, Keycloak auth, Prisma/Postgres, NATS events |
| [`web/`](web/README.md) | The websites: Next.js 16 BFF apps (`apps/portfolio-web` user site, `apps/admin-web` admin site) + shared packages (`@web/core`, `@web/ui`) |
| [`k8s/`](k8s/README.md) | Infrastructure for both: local Kubernetes (dev) and production (DOKS via Argo CD) |
| [`docs/adr/`](docs/adr/README.md) | Architecture decisions (one log for everything) |
| [`docs/ai/`](docs/ai/ai-usage-policy.md) | What may be pasted into AI tools |

## Run everything locally

Requires Docker Desktop with Kubernetes, Node.js 20+.

```bash
npm run k8s:up                    # once: Gateway, KrakenD, Keycloak, Postgres, Redis, NATS, S3
npm run keycloak:admin-url        # once per fresh cluster (admin console login)
npm run keycloak:admin-otp        # once per fresh cluster (admin site: admins only + OTP)
npm run k8s:forward               # keep this terminal open

cd nest-microservice && cp .env.example .env && npm install && npm run migration:run && npm run start:dev
cd web && npm install && npm run dev   # both sites (once before: cp .env.example .env.local in apps/portfolio-web and apps/admin-web)
```

Open http://www.localtest.me:8000 and sign in with `carol` (read), `bob` (read + write own) or
`alice` (admin), password `password`. Keycloak admin: http://localhost:8180/admin (`admin` /
`admin`). The API (private, like in prod): http://localhost:8080 through the port-forward.
Admin site: http://admin.localtest.me:8000, `alice` + a one-time code (dev OTP secret in
[`web/apps/admin-web/README.md`](web/apps/admin-web/README.md)).

## Local staging (everything in the cluster, like production, with HTTPS)

```bash
npm run staging:build      # the 5 production images
npm run staging:up         # cert-manager + local CA, scale dev down, deploy, migrate (a few minutes)
npm run staging:trust-ca   # once: trust the local CA (localtest.me only) in Windows
```

Open https://www.staging.localtest.me (sign in `bob` / `password`) and
https://admin.staging.localtest.me (`alice` + one-time code). `npm run staging:down` removes
it, `npm run k8s:up` brings dev back. Details: [`k8s/README.md`](k8s/README.md#local-staging), ADR 0018.

## CI (GitHub Actions)

Every pull request to `main` and every push to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
only the parts the change touches (`nest-microservice/`: lint, format, unit + integration tests, build;
`web/`: `npm run check`; `k8s/`: render every overlay, validate KrakenD). Branch protection
requires the single check **`ci-ok`**. Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml))
proposes dependency updates weekly, once a release is at least 14 days old. Same commands locally:
the package READMEs.

After CI passes on `main`, [`.github/workflows/images.yml`](.github/workflows/images.yml) builds
the images whose code changed, pushes them to GHCR (`ghcr.io/vhson2006/ai-engineer/<name>:<commit sha>`,
private) and commits the new tags to `k8s/overlays/prod/kustomization.yaml` (Argo CD deploys from
there). Details: [`k8s/README.md`](k8s/README.md#images).

Agents: start with [`CLAUDE.md`](CLAUDE.md).
