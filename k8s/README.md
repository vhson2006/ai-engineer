# k8s: infrastructure for the whole system (edge Gateway, KrakenD, Keycloak, Postgres, Redis, NATS, S3)

Shared by `nest-microservice/` and `web/` (monorepo, ADR 0015). Run the `npm run k8s:*`
scripts from the repo root. Rules for agents: root `.claude/rules/infrastructure.md` and `krakend.md`.

Everything except the apps runs on a local Kubernetes cluster (Docker Desktop, kind, minikube...).
The apps run on your machine (`npm run start:dev` in nest-microservice, `npm run dev` in portfolio-web):

- the **apps** reach Postgres and NATS through `kubectl port-forward` on the same ports as
  docker-compose, so `.env` needs no changes;
- **KrakenD** (in the cluster) reaches the apps on your machine through `host.docker.internal`;
- **browsers** reach everything public through ONE edge Gateway (NGINX Gateway Fabric) by host name;
- **KrakenD is private** (as in prod): no Gateway route; Next.js and curl use `localhost:8080`
  from `npm run k8s:forward`.

```
browser ──▶ :8000 edge Gateway ──┬─ www.localtest.me  ─▶ portfolio-web (your machine, :3000)
           (nginx, LoadBalancer) └─ auth.localtest.me ─▶ Keycloak (realm nest-microservice + /resources only)

portfolio-web / curl ──▶ localhost:8080 (port-forward) ─▶ KrakenD ──host.docker.internal:3001──▶ deployment-service

private (npm run k8s:forward): KrakenD :8080, Keycloak admin :8180, management :9000, Postgres, Redis, NATS, S3
```

```
k8s/
├── base/                        # what every environment runs (placeholder host names, no secrets)
│   ├── namespace.yaml
│   ├── gateway/                 #   Gateway "edge" + HTTPRoutes www/admin/auth (hosts from urls.env); no api route
│   ├── krakend/                 #   Deployment + Service + config/krakend.tmpl, config/templates/*.tmpl
│   └── keycloak/                #   Deployment + Service; realm.json + master.json (the same in every
│                                #   environment, values $(env:…)) + the Job keycloak-config (ADR 0043)
├── components/
│   ├── local-data/              # Postgres, Redis (ACL users), SeaweedFS (S3 for files) in the cluster: dev, staging
│   ├── keycloak-local/          # Keycloak test users, alice's OTP, dev-cli: dev, staging
│   ├── nats/                    # NATS (single instance): dev and prod
│   ├── apps/                    # deployment-service, notification-service, content-service, the web apps IN the cluster,
│   │                            #   Jobs nats-setup and content-import (the sites' content, ADR 0044): staging, prod
│   ├── network-policies/        # default deny + allowed flows: staging and prod
│   └── observability/           # Grafana Alloy → Grafana Cloud (metrics, logs, traces; ADR 0023): staging and prod
├── overlays/
│   ├── dev/                     # entry point: npm run k8s:up  (= kubectl apply -k k8s/overlays/dev)
│   │   ├── kustomization.yaml   #   base + local-data + nats + the files below
│   │   ├── urls.env             #   THE public addresses of the environment (hosts, URLs, issuer)
│   │   ├── krakend/settings/env.json      # JWKS URL, backends (host.docker.internal)
│   │   ├── keycloak/            #   dev Secrets (bootstrap admin, DB, client secrets)
│   │   ├── listeners/           #   the Gateway's listeners (:8000)
│   │   ├── gateway-proxy.yaml   #   NginxProxy: DNS resolver for the ExternalName backend
│   │   └── portfolio-web.yaml   #   Service -> Next.js on your machine
│   └── prod/                    # DOKS, deployed by Argo CD: HTTPS, External Secrets, migration Job,
│                                #   2 replicas + PDBs + spread, NetworkPolicies (see "Production" below)
├── platform/prod/               # cluster-level, applied once: ClusterIssuers, DNS token, Argo CD Application
├── sites/                       # the business sites (ADR 0047): _template + one folder per site
│                                #   (app/ names, keycloak/ client, host from urls.env); an overlay lists ../../sites/<id>
├── images.json                  # THE list of images (CI builds, staging builds, images-check.mjs)
└── scripts/                     # up.sh, staging.sh, gateway-install.sh, krakend-check.sh, images-check.mjs, port-forward.{sh,ps1}

A new environment = a new `overlays/<env>/` with its own `urls.env` (every public address: host
names, URLs, the token issuer, the storage origins; `components/public-urls` writes them where they
are needed), listeners, settings, patches and secrets.
`base/` stays untouched. `npm run k8s:render` / `npm run k8s:render:prod` print what an overlay produces.
```

| Component | Image | In-cluster address | From your machine |
|---|---|---|---|
| Edge Gateway | NGINX Gateway Fabric `2.8.0` | Service `edge-nginx` (LoadBalancer) | `http://{www,api,auth}.localtest.me:8000` (no port-forward) |
| KrakenD | `krakend:2.10.2` | `http://krakend.nest-microservice.svc.cluster.local:8080` | `http://localhost:8080` via port-forward only (health: `/__health`) |
| Keycloak | `quay.io/keycloak/keycloak:26.4.7` | `http://keycloak.nest-microservice.svc.cluster.local:8080`, management `:9000` | `http://auth.localtest.me:8000` (app realm only); Admin Console `http://localhost:8180/admin` and management `http://localhost:9000` via port-forward |
| Postgres | `postgres:16-alpine` | `postgres.nest-microservice.svc.cluster.local:5432` | `localhost:5432` |
| Redis | `redis:7-alpine` | `redis.nest-microservice.svc.cluster.local:6379` | `localhost:6379` |
| NATS | `nats:2.10-alpine` | `nats://nats.nest-microservice.svc.cluster.local:4222` | `localhost:4222`, monitoring `http://localhost:8222` (JetStream: `/jsz`) |

> **Dev only.** Passwords are in plain Secrets (`postgres`/`postgres`, Keycloak admin `admin`/`admin`,
> test users `password`), Redis has no password, and the admin UIs have no login. NATS has JetStream (1Gi volume `data-nats-0`): streams `EVENTS` (7 days) and `DLQ` (30 days), created by `nats-setup` only (Job in staging/prod, `npm run nats:setup` in dev; the services wait for them); durable consumer `notification` (ADRs 0007, 0024).

## Start

```bash
kubectl config current-context        # make sure you are on the local cluster (e.g. docker-desktop)
npm run k8s:up                        # installs NGINX Gateway Fabric once, then kubectl apply -k k8s/overlays/dev
                                      # (and the Job keycloak-config: the realms, ADR 0043)
npm run k8s:status                    # wait until all 6 pods are Running 1/1 (Keycloak: ~1-2 min)
npm run k8s:forward                   # Postgres/Redis/NATS for the apps + admin UIs (Ctrl+C to stop)
```

`k8s:forward` reconnects by itself when a pod is replaced (rollout, restart): a watchdog compares the
pods behind each Service every 5 s (`kubectl port-forward` alone keeps forwarding to the dead pod).
The npm scripts run the `.sh` scripts through `k8s/scripts/sh.mjs`, which picks **Git Bash** on Windows
(npm's shell is cmd.exe, where `bash` is often WSL, without kubectl). Without Git for Windows:
`powershell -ExecutionPolicy Bypass -File k8s/scripts/port-forward.ps1`.

Do not run `npm run infra:up` (docker compose, in nest-microservice) at the same time, because both use ports 5432, 4222 and 8222.
(Keycloak and the admin UIs exist only on Kubernetes, not in docker compose.)

Then, in another terminal, run the API:

```bash
cd nest-microservice
cp .env.example .env
npm install
npm run migration:run
npm run start:dev
npm run k8s:forward      # another terminal: KrakenD on localhost:8080 (+ Postgres, NATS...)
curl http://localhost:8080/api/deployments           # 401: no token, answered by KrakenD
```

## Edge Gateway (NGINX Gateway Fabric)

[`gateway/`](base/gateway/) publishes, by host name, only what a browser needs. Anything else (other
hosts, other paths, `/admin`, realm `master`) gets **404** from nginx.

| Host | Backend | Paths |
|---|---|---|
| `www.localtest.me:8000` | `portfolio-web` (ExternalName → `host.docker.internal:3000`) | all |
| `admin.localtest.me:8000` | `admin-web` (ExternalName → `host.docker.internal:3100`) | all (admins only, ADR 0019) |
| `auth.localtest.me:8000` | `keycloak:8080` | `/realms/nest-microservice`, `/resources` |

- `*.localtest.me` is public DNS for 127.0.0.1: no hosts file. Port **8000** because Windows'
  HTTP.sys holds :80 on this machine.
- Controller: NGINX Gateway Fabric v2.8.0, installed once per cluster by `k8s/scripts/gateway-install.sh`
  (Gateway API CRDs + NGF CRDs + control plane in namespace `nginx-gateway`). Not ingress-nginx:
  that project was retired in March 2026.
- Add a site or API: a new `HTTPRoute` in `gateway/routes.yaml` (+ a Keycloak redirect URI if it logs in).
- Debug: `kubectl -n nest-microservice get gateway,httproute` (check `Accepted` / `ResolvedRefs`),
  `kubectl -n nest-microservice exec deploy/edge-nginx -c nginx -- nginx -T` (generated config),
  `kubectl -n nginx-gateway logs deploy/nginx-gateway`.
- Production: a `:443` HTTPS listener with `certificateRefs` (cert-manager), real domains, a rate
  limit on `/realms/*/login-actions` and the token endpoint, and the Next.js app as a real
  Deployment instead of the ExternalName Service.

## KrakenD (API gateway)

KrakenD uses **Flexible Configuration** (a Go template rendered at startup). Rules: `.claude/rules/krakend.md`.

| File | What |
|---|---|
| [`base/krakend/config/krakend.tmpl`](base/krakend/config/krakend.tmpl) | All public routes, the same in every environment |
| [`base/krakend/config/templates/endpoint.tmpl`](base/krakend/config/templates/endpoint.tmpl) | The security of one endpoint, written once: Keycloak token check (RS256, JWKS, issuer, audience, roles) + rate limits |
| [`overlays/dev/krakend/settings/env.json`](overlays/dev/krakend/settings/env.json) | Dev values: in-cluster JWKS URL, backends (`host.docker.internal`), rate limits, log level |

Every endpoint validates the Keycloak token and forwards `Authorization` to the service, which
checks it again, and is rate limited (read: 200/s per endpoint, 20/s per user token; write: 50/s and
5/s; ADR 0017). An endpoint only chooses its roles and its limit class:
`{{ template "endpoint.tmpl" (dict "env" .env "roles" (list "deployment:read") "limit" "read") }}`.

- Validate: `npm run krakend:check` (renders with the dev settings in the real image and writes
  the result to `k8s/.krakend-rendered.dev.json`, git-ignored).
- Apply: `npm run k8s:up`. The three ConfigMaps (template, sub-templates, settings) carry a content
  hash, so the pods roll automatically.
- Logs: `kubectl -n nest-microservice logs -f deploy/krakend`.
- Backends are `http://host.docker.internal:<port>` in dev because the apps run on your machine.
  An environment that runs them in the cluster sets `services.<name>` to the Service DNS name
  (e.g. `http://deployment-service:3001`) in its own `env.json`.

If KrakenD answers but returns errors for `/api/...`, check that `npm run start:dev` is running
(`curl http://localhost:3001/health`).

## Keycloak (identity and roles)

| What | Where |
|---|---|
| Admin Console (private, port-forward) | http://localhost:8180/admin (user `admin` / `admin`, realm `master`; its Frontend URL and brute-force detection come from `keycloak/master.json`) |
| Realm `nest-microservice` | http://auth.localtest.me:8000/realms/nest-microservice/.well-known/openid-configuration |
| JWKS (public keys) | `.../realms/nest-microservice/protocol/openid-connect/certs` (from the cluster: `http://keycloak.nest-microservice.svc.cluster.local:8080/...`) |
| Management (health, metrics) | http://localhost:9000/health/ready, http://localhost:9000/metrics |
| Account console (end users) | http://auth.localtest.me:8000/realms/nest-microservice/account |

**Configuration as code (ADR 0043).** Everything below comes from files applied by the Job
`keycloak-config` (keycloak-config-cli) on every `npm run k8s:up` / `staging:up` / Argo CD sync, on a
fresh cluster and on a running one alike. **The same files in every environment**:
[`base/keycloak/realm.json`](base/keycloak/realm.json) (realm `nest-microservice`: roles, clients,
groups, the admin-site sign-in flow; no people) and `master.json` (realm `master`);
[`components/keycloak-local/`](components/keycloak-local/) (dev, staging: test users, alice's one-time
code, `dev-cli`); [`sites/<id>/keycloak/`](sites/) (a business site's client and service account, in
the environments that list it); prod adds `master-config-cli.json`. What differs per environment is
only a value, written `$(env:NAME)` in the files: ConfigMap `public-urls` (the overlay's `urls.env`)
(`WEB_URL`, `ADMIN_URL`, `KEYCLOAK_CONSOLE_URL`) and Secret `keycloak-clients` (client secrets).
Change Keycloak by changing these files, not the console: a field of a managed object that the file
doesn't set is reset at the next deploy.
Follow a run: `kubectl -n nest-microservice logs -f job/keycloak-config`.

| Clients | Purpose |
|---|---|
| `deployments-api` | Resource server: owns the roles `deployment:read`, `deployment:write`, `deployment:admin`; it's the token audience |
| `web` | portfolio-web (confidential, Authorization Code + PKCE, secret `web-dev-secret`, redirect `$WEB_URL/*`: `http://www.localtest.me:8000/*` in dev) |
| `admin-web` | admin-web (same, secret `admin-web-dev-secret`, redirect `$ADMIN_URL/*`); owns the roles `admin` (may sign in) and `superadmin` (every site, system pages, OTP); sessions 8 h idle / 7 days max (ADR 0035; realm SSO the same, `web` keeps 30 min / 10 h); browser flow **`browser-admin-otp`** |
| `dev-cli` | **dev and staging only** (`components/keycloak-local`): password grant for curl tests |

| Group | Roles | Test user (password `Dev-Staging-2026!`) |
|---|---|---|
| `viewers` | read | `carol` |
| `developers` | read, write | `bob` |
| `admins` | read, write, admin + `admin-web:admin`, `admin-web:superadmin`, `content:admin` | `alice` (also has a **dev-only OTP**: see `web/apps/admin-web/README.md`) |
| `site-admins` (+ a `/sites/<id>` group) | `admin-web:admin`, `content:read/write/publish` on their sites (ADR 0030) | `<site>-admin` for each of the nine sites (`nails-admin` in `/sites/nails`, `wine-admin` in `/sites/wine`…) |

**Admin site sign-in** (ADRs 0019, 0030): the flow `browser-admin-otp` (in `realm.json`), bound to the
client `admin-web` only: password, then users without `admin-web:admin` are refused ("Deny access"),
then the one-time code for `admin-web:superadmin` only (a superadmin without OTP is made to set it up). portfolio-web keeps the
realm's default flow.

Get a token for testing (access token lives 5 minutes):

```bash
TOKEN=$(curl -s http://auth.localtest.me:8000/realms/nest-microservice/protocol/openid-connect/token \
  -d grant_type=password -d client_id=dev-cli -d username=bob --data-urlencode 'password=Dev-Staging-2026!' | jq -r .access_token)
```

Every token has `iss = http://auth.localtest.me:8000/realms/nest-microservice` (fixed by `KC_HOSTNAME` = `AUTH_URL` of `urls.env`),
even when Keycloak is reached from inside the cluster or through the port-forward.
The admin console uses its own URL (`KC_HOSTNAME_ADMIN=http://localhost:8180`), which is never
published on the Gateway. Its login runs on realm `master`, whose **Frontend URL must be
`http://localhost:8180`** too, otherwise the console hangs (it would log in through
`auth.localtest.me`, where the Gateway answers 404 for `master`): `master.json`, applied last by the
Job (the new issuer invalidates its token, so it repeats that run once). Verifiers (KrakenD, services) must use that
issuer, and may fetch the JWKS through the in-cluster URL.

People are not configuration: users created in the console (and their passwords, OTP) stay in
Postgres (database `keycloak`). The test users of `users.json` get the file's passwords back when that
file changes. A public site (ADR 0042) = its group `/sites/<id>` in `realm.json` and its client `<id>-web`
and service account in `sites/<id>/keycloak/` (secret `<ID>_WEB_CLIENT_SECRET` in the environment's
Secret `keycloak-clients`).

## Object storage (uploaded files)

Dev: **SeaweedFS** (`components/local-data/seaweedfs`), an S3-compatible server. `npm run k8s:forward`
exposes it on http://localhost:8333; the service signs presigned URLs for that host and the browser
uses them directly.

| | |
|---|---|
| Credentials | `dev-storage-key` / `dev-storage-secret` (`seaweedfs/s3.json`, dev only) |
| Buckets | `dev-public-files` (anonymous read = what the CDN does in prod), `dev-private-files` (presigned only); created on first upload |
| CORS | `http://www.localtest.me:8000`, `http://localhost:3000` (`-s3.allowedOrigins`) |
| Inspect | `aws --endpoint-url http://localhost:8333 s3 ls s3://dev-private-files --recursive` (with the dev keys), or any S3 desktop client |

## Inspecting NATS and Redis

No admin web UIs run in the cluster (they have no login and hold full rights). Use the CLIs, the
same way you would in production (break-glass), or a desktop client through the port-forward:

```bash
# Watch the events live (temporary pod, deleted on exit)
kubectl -n nest-microservice run nats-box --rm -it --image=natsio/nats-box:0.20.1 -- \
  nats -s nats://nats:4222 sub "deployments.>"
# JetStream: streams, consumers and their lag
kubectl -n nest-microservice run nats-box --rm -it --image=natsio/nats-box:0.20.1 --   sh -c 'nats -s nats://nats:4222 stream ls; nats -s nats://nats:4222 consumer report <STREAM>'
# Server stats (connections, subscriptions, message rates): http://localhost:8222/varz, /connz, /subsz, /jsz

# Redis as the admin user
kubectl -n nest-microservice exec -it redis-0 -- redis-cli --user admin --pass admin-dev-redis-password
```

A desktop GUI (RedisInsight desktop, a NATS GUI) can connect to `localhost:6379` / `localhost:4222`
while `npm run k8s:forward` runs.

## Redis users (ACL)

Redis requires authentication; the password-less `default` user is disabled. Users are defined
in [`redis/users.acl`](components/local-data/redis/users.acl) (generated into the `redis-acl` Secret; editing the file
and `npm run k8s:up` rolls Redis). That file can't contain comments: see `redis/statefulset.yaml`.

| User | Password (dev) | Can do |
|---|---|---|
| `web` | `web-dev-redis-password` | portfolio-web sessions + rate-limit counters: keys `web:*`, `GET/SET/DEL/GETDEL/INCR/EXPIRE/PING` |
| `admin-web` | `admin-web-dev-redis-password` | admin-web, same commands, keys `admin-web:*` (`REDIS_KEY_PREFIX=admin-web:`): it can't read portfolio-web's sessions, nor the reverse |
| `admin` | `admin-dev-redis-password` | everything (operators, via redis-cli or a desktop client) |
| `healthcheck` | none | `PING` only (readiness probe) |

```bash
kubectl -n nest-microservice exec -it redis-0 -- redis-cli --user admin --pass admin-dev-redis-password
```

A service that starts using Redis gets its own user and key prefix (e.g. `api` on `~api:*`),
never the `admin` or `web` user. If it uses Redis as a cache with eviction, give it a separate
Redis instance so sessions are never evicted.

## Connect with DBeaver

Keep `npm run k8s:forward` running, then go to *New Database Connection → PostgreSQL*:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `deployment` |
| Username / Password | `postgres` / `postgres` |

If DBeaver offers to download the driver, accept. To see every database, tick *Show all databases*
on the PostgreSQL tab.

## Useful commands

```bash
kubectl -n nest-microservice logs -f statefulset/postgres         # logs (also redis, statefulset/nats, deploy/krakend)
kubectl -n nest-microservice exec -it postgres-0 -- psql -U postgres -d deployment
kubectl -n nest-microservice exec -it redis-0 -- redis-cli --user admin --pass admin-dev-redis-password
kubectl -n nest-microservice rollout restart statefulset/nats

npm run k8s:down    # delete everything, INCLUDING the PVCs (data is lost)
```

To stop the infrastructure but keep the data, scale it to 0 instead of deleting it:

```bash
kubectl -n nest-microservice scale statefulset/postgres statefulset/redis statefulset/nats deployment/krakend deployment/keycloak deployment/edge-nginx --replicas=0
kubectl -n nest-microservice scale statefulset/postgres statefulset/redis statefulset/nats deployment/krakend deployment/keycloak deployment/edge-nginx --replicas=1
```

## Business sites (ADR 0047)

Every business site runs from one template, [`sites/_template`](sites/_template/): a Deployment,
a Service and a route, the same for all. A site's folder `sites/<id>/` only names it (`app/`: its
app and client-secret key; `keycloak/`: its Keycloak client) and takes its host and URL from the
overlay's `urls.env`. To run a site in an environment:

1. `components:` of the overlay: `- ../../sites/<id>`;
2. `urls.env`: `<ID>_HOST` and `<ID>_URL`;
3. `images:`: `<id>-web` (and its entry in `images.json`, `environments` listing the overlay);
4. Secret `keycloak-clients`: `<ID>_WEB_CLIENT_SECRET`.

Shared by every site of an environment: ConfigMap `business-sites-env` (API URL), the label
`role: business-site` (NetworkPolicies, the https-only route patch). Staging runs all nine
(`https://<id>.staging.localtest.me`: each site 160 Mi requested, 384 Mi limit; give WSL 12 GB,
`.wslconfig`); prod none yet (each real site needs its domain,
certificate and DNS). Site images build without the API: their article pages fill in at runtime
(ISR, about a minute; ADR 0047).

## Local staging

The production setup in the local cluster, with HTTPS (ADR 0018): `overlays/staging`, namespace
`nest-staging`, production images, Keycloak `start`, NetworkPolicies, migration Job, TLS from a
local CA through cert-manager (as in prod with Let's Encrypt).

```bash
npm run staging:build      # docker build the 5 images (local/<name>:staging); no registry needed
npm run staging:up         # NGF, cert-manager, local CA, CoreDNS rule, dev → 0, apply, migrate, realms, content, wait
npm run staging:trust-ca   # once: import the CA (Windows asks to confirm); restart the browser
npm run staging:status
npm run staging:stop       # stop it, KEEP its data, bring dev back; staging:up resumes it
npm run staging:down       # delete the namespace WITH its data (fresh start); npm run k8s:up brings dev back
```

| URL | What |
|---|---|
| https://www.staging.localtest.me | portfolio-web (production image) |
| https://admin.staging.localtest.me | admin-web (alice: password + one-time code) |
| https://auth.staging.localtest.me | Keycloak, app realm only |
| https://s3.staging.localtest.me | SeaweedFS (presigned uploads/downloads) |
| https://&lt;site&gt;.staging.localtest.me | the nine business sites: nails, wine, laundry, sushi, travel, flowers, autoparts, hotel, spa |
| http://*.staging.localtest.me:8001 | → 301 to https (port 80 is Windows') |
| `kubectl -n nest-staging port-forward svc/keycloak 8181:8080` | admin console http://localhost:8181/admin |

- **CA**: `k8s/platform/local/local-ca.yaml`, name-constrained to `localtest.me` (can't sign any
  other domain). The certificate (no key) is exported to `k8s/.local-ca.crt` (git-ignored).
- **In-cluster DNS**: a CoreDNS rule maps `*.staging.localtest.me` to the staging Gateway, so pods
  reach Keycloak and S3 through the same HTTPS URLs as browsers (public DNS does this in prod).
- **Content**: a fresh staging gets the nine sites, their articles and images from the Job
  `content-import` (ADR 0044), as prod does; each site's snapshot version once, so `staging:stop`
  / `staging:up` keep what you changed. `staging:down` starts over.
- **Rebuild after a code change**: `npm run staging:build && npm run staging:up` (restarts the apps).
- **Memory**: staging's limits add up to about 12 GB (the nine sites, Keycloak, render-worker…),
  and Docker Desktop's nodes all share ONE WSL VM (each node reports the whole VM: Kubernetes never
  sees the shortage, Linux kills pods, exit 137). WSL takes half the RAM by default: set it in
  `%USERPROFILE%\.wslconfig` (`[wsl2]` / `memory=12GB` / `swap=4GB`), `wsl --shutdown`, restart Docker.
- `staging.sh` refuses any kubectl context other than `docker-desktop`.
- **Telemetry (optional)**: `cp k8s/grafana-cloud.env.example k8s/.grafana-cloud.env` (git-ignored),
  fill in your Grafana Cloud stack (the file says where each value is), then `npm run staging:up`.
  See [Observability](#observability-grafana-cloud). Without the file, Alloy is scaled to 0.

## Observability (Grafana Cloud)

ADR 0023. One **Grafana Alloy** per namespace (`components/observability`, staging and prod):

```
deployment-service, notification-service ──OTLP traces :4318──▶ alloy ──HTTPS──▶ Grafana Cloud
                    ▲  GET /metrics every 60 s ─────────────────┘  │              (Prometheus, Loki, Tempo)
every pod's stdout ── read through the Kubernetes API ─────────────┘
```

- **Metrics**: pods annotated `prometheus.io/scrape: 'true'` (+ `port`, `path`). Only the metrics
  in the allow-list of `config.alloy` leave the cluster (Free tier: ~10k series): add a metric
  there when a dashboard needs it. Pod CPU/memory come from the apps' own `process_*` metrics.
- **Logs**: every pod of the namespace; our services' JSON gets the label `level` and the
  structured metadata `trace_id` (log → trace in Grafana).
- **Traces**: apps send to `http://alloy:4318` (`OTEL_EXPORTER_OTLP_ENDPOINT` in their env files);
  staging keeps all traces, prod 25 % of new ones (`OTEL_TRACES_SAMPLER_ARG`).
- Every signal has `cluster` = `staging-local` / `prod` (ConfigMap `alloy-env` of the overlay).
- **Access**: Alloy only has a Role in its namespace (pods, pods/log: read). Its debug UI is
  port-forward only: `kubectl -n nest-staging port-forward deploy/alloy 12345` → http://localhost:12345.
- **Credentials**: Secret `grafana-cloud` (keys in `k8s/grafana-cloud.env.example`) with a
  write-only token (metrics:write, logs:write, traces:write). Staging: from `k8s/.grafana-cloud.env`;
  prod: External Secrets entry `nest-microservice-prod-grafana-cloud`.
- **Certificates** (ADR 0048): every 5 minutes Alloy opens TLS to www, admin and auth (`urls.env`)
  and sends `probe_ssl_earliest_cert_expiry` and `probe_success`. Create two alert rules in Grafana
  Cloud (Alerting → Alert rules, data source Prometheus), contact point = your email:
  `probe_ssl_earliest_cert_expiry{cluster="prod"} - time() < 14 * 86400` (renewal failed:
  cert-manager renews 30 days before) and `probe_success{cluster="prod"} == 0` for 15 min (no TLS).
- **A new instrumented app**: the scrape annotations on its pod, `OTEL_*` in its env file, and both
  rules of `components/observability/networkpolicies.yaml`.

## Production (`overlays/prod`)

Target: DigitalOcean Kubernetes (DOKS), deployed by **Argo CD** from GitHub. Never `kubectl apply`
the prod overlay by hand (the migration Job is an Argo CD PreSync hook).

```
Internet ─▶ DO Load Balancer ─▶ edge-nginx (x2) ─┬─ https://www.example.com   ─▶ portfolio-web (x2)
           :80 → 301 to https, :443 TLS          ├─ https://admin.example.com ─▶ admin-web (x2, admins + OTP)
           (wildcard cert, cert-manager)         └─ https://auth.example.com  ─▶ Keycloak (x2, app realm only)
portfolio-web, admin-web ─▶ KrakenD (x2, PRIVATE: NetworkPolicy krakend-from-web) ─▶ deployment-service (x2)
deployment-service, notification-service (x2) ─▶ NATS (in cluster)
deployment-service, Keycloak ─TLS─▶ DO managed Postgres     web apps ─TLS─▶ DO managed Valkey (one user each)
```

| What | Where |
|---|---|
| TLS | Gateway listener `https` (:443) with `wildcard-tls`, issued and renewed by cert-manager (DNS-01, DigitalOcean DNS). `:80` only redirects. HSTS on every public route, its value `HSTS` of `urls.env` (ADR 0048) (ramped up after go-live; no includeSubDomains, no preload). Expiry watched by Alloy (`probe_ssl_earliest_cert_expiry`) |
| Secrets | `overlays/prod/secrets/external-secrets.yaml`: External Secrets Operator copies them from the secret manager (ClusterSecretStore `prod-secrets`). The file lists every entry and field to create |
| Migrations | `overlays/prod/migration-job.yaml`: `prisma migrate deploy` (image `--target migrate`) before each rollout. Keep migrations backward compatible |
| Resilience | 2 replicas (KrakenD, Keycloak, apps, nginx), PodDisruptionBudgets, spread over nodes, `maxUnavailable: 0`, probes, resource requests/limits |
| Isolation | `overlays/prod/networkpolicies.yaml`: default deny + only the flows listed in the file |
| Telemetry | `components/observability`: Alloy → Grafana Cloud, label `cluster=prod` ([Observability](#observability-grafana-cloud)) |
| Images | `k8s/images.json` (the list), `kustomization.yaml` `images:`: `.github/workflows/images.yml` sets the tags to the commit SHA |

### Images

**The one list of images: [`images.json`](images.json)** (how each is built, what it watches,
the web apps' public origin). CI (`npm run k8s:check`) checks that the overlays' `images:` and the
manifests agree with it; `staging:build` and the workflow below build from it.

Built by CI, not by hand: after CI passes on `main`, `.github/workflows/images.yml` builds every
image whose watched files changed since the commit it is tagged with in `overlays/prod/kustomization.yaml`
(the API images always together, `group` of the list; one of them changed or on `newTag: placeholder`
rebuilds all), pushes `ghcr.io/vhson2006/ai-engineer/<name>:<commit sha>` (private, like the
repository; pods pull with the Secret `ghcr-pull`) and commits the new `newTag`s to `main` as
`github-actions[bot]`. Actions → Images → *Run workflow* rebuilds all. The web apps bake their public
origin in (ADR 0021): set the repository variable `PROD_DOMAIN` (e.g. `example.com` →
`https://www.example.com`, `https://admin.example.com`). What the workflow runs:

```bash
# nest-microservice (context nest-microservice/), one target per image
docker build --target deployment-service -t ghcr.io/<user>/<repo>/deployment-service:<sha> nest-microservice
# every Next.js app: ONE Dockerfile (web/Dockerfile), context = the web workspace
docker build -f web/Dockerfile --build-arg APP=portfolio-web --build-arg SITE_URL=https://www.example.com   -t ghcr.io/<user>/<repo>/portfolio-web:<sha> web
# render-worker (Remotion + Chrome, Debian): its own Dockerfile
docker build -f web/apps/render-worker/Dockerfile -t ghcr.io/<user>/<repo>/render-worker:<sha> web
```

All run as non-root with a read-only root filesystem; configuration comes from env at runtime.

### Bootstrap (once per cluster)

1. **DigitalOcean**: DOKS cluster; the domain in DO DNS; managed Postgres with databases
   `deployment`, `notification`, `content`, `ai` and `keycloak` (one user each); managed Valkey with one ACL user
   per web app (`web` on `~web:*`, `admin-web` on `~admin-web:*`, commands as in
   `components/local-data/redis/users.acl`); an API token with domain read/write (for cert-manager).
2. **Cluster add-ons**:
   ```bash
   bash k8s/scripts/gateway-install.sh          # NGINX Gateway Fabric v2.8.0 + Gateway API CRDs
   helm install cert-manager oci://quay.io/jetstack/charts/cert-manager --version v1.21.3 \
     -n cert-manager --create-namespace --set crds.enabled=true \
     --set config.apiVersion=controller.config.cert-manager.io/v1alpha1 \
     --set config.kind=ControllerConfiguration --set config.enableGatewayAPI=true
   helm install external-secrets external-secrets --repo https://charts.external-secrets.io \
     --version 2.13.0 -n external-secrets --create-namespace
   kubectl create namespace argocd
   kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.7/manifests/install.yaml
   ```
3. **Secret manager**: create the entries listed in `overlays/prod/secrets/external-secrets.yaml`
   and `platform/prod/digitalocean-dns.yaml`, then the ClusterSecretStore
   (`platform/prod/cluster-secret-store.example.yaml`, adapt to your provider).
4. **Object storage** (Spaces, region `sgp1` like the cluster): two buckets, `<name>-public-files`
   and `<name>-private-files`; enable the CDN on the public one (custom domain `cdn.example.com`
   → `STORAGE_PUBLIC_BASE_URL`); a Spaces access key limited to these two buckets → secret entry
   `nest-microservice-prod-storage`. CORS on **both** buckets, so browsers can upload:
   ```json
   [{ "AllowedOrigins": ["https://www.example.com"], "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["content-type", "content-length", "x-amz-acl"], "MaxAgeSeconds": 3600 }]
   ```
   Spaces publishes objects one by one: `STORAGE_PUBLIC_OBJECT_ACL=public-read` (already in
   `env/deployment-service.env`) makes uploads to the public bucket public, the private bucket
   never. With AWS S3 or R2 instead, make the public bucket readable as a whole (bucket policy /
   R2 public domain), unset that variable, and set `STORAGE_PROVIDER` / `STORAGE_REGION` /
   `STORAGE_R2_ACCOUNT_ID`.
5. **Replace placeholders**: `example.com` and the bucket names in `overlays/prod/urls.env` (the one
   file with the environment's public addresses), the ClusterIssuer email, and set the
   repository variable `PROD_DOMAIN`, then *Run workflow* on Images. The GitHub repository is
   private: give Argo CD read access (a deploy key or a read-only token, `argocd repo add`).
6. `kubectl apply -k k8s/platform/prod`: ClusterIssuers, DNS token, Argo CD Application. Argo CD
   then syncs `overlays/prod`.
7. **DNS**: `www`, `admin`, `auth` → the external IP of Service `edge-nginx` (no `api`: the API is private)
   (`kubectl -n nest-microservice get svc edge-nginx`).
8. **Keycloak, after the first sync**: the Job `keycloak-config` (PostSync hook, ADR 0043) has created
   both realms, the admin-site flow and realm `master`'s Frontend URL, signing in with the bootstrap
   admin, and the master client `keycloak-config-cli` (secret entry
   `nest-microservice-prod-keycloak-config-cli`: create it BEFORE the first sync) it uses from then on.
   The clients `web` and `admin-web` already have the secrets of the entries `…-portfolio-web` /
   `…-admin-web` (`KEYCLOAK_CLIENT_SECRET`, random values you chose in step 3: the Job sets them,
   Secret `keycloak-clients`). Admin console
   `kubectl -n nest-microservice port-forward svc/keycloak 8180:8080` → http://localhost:8180/admin:
   create real named admins in `master` with OTP required, then remove the bootstrap admin (the next
   sync signs in as `keycloak-config-cli`).

9. **Content, after the first sync**: the Job `content-import` (PostSync hook, ADR 0044) has
   imported the nine sites, their topics, articles (status kept) and images into the managed
   database and Spaces (URLs on the CDN), once per site and snapshot version: later syncs skip them,
   and what the admins change stays. Follow it: `kubectl -n nest-microservice logs job/content-import`.

Check: `kubectl get certificate,externalsecret -n nest-microservice` (Ready=True),
`curl -I http://www.example.com` (301 to https). `https://api.example.com` must NOT answer: the API is
private, no `api` DNS record is needed.

### Known follow-ups (not done yet)

- **NATS**: single node with JetStream on one volume (losing the node or its disk loses the
  streams), no auth. Move to the NATS Helm chart (3 nodes, streams with `replicas: 3`), a
  StorageClass with `reclaimPolicy: Retain`, and credentials. NetworkPolicy limits who can reach it.
- **Keycloak**: `start` builds its config at every start (slower). Build an optimized image in CI
  and use `start --optimized`.
- **Valkey**: check that the managed Valkey supports a dedicated ACL user like `web` in dev, and
  whether its certificate needs the DO CA (`NODE_EXTRA_CA_CERTS` for portfolio-web).
- **Migrations over TLS** use `sslmode=require` (encrypted, server certificate not verified by
  the Prisma CLI); the apps themselves verify it (`PGSSLMODE=verify-full` + CA).
- Admin access (Keycloak console, Argo CD UI) is port-forward only until the VPN (Tailscale) is set up.
