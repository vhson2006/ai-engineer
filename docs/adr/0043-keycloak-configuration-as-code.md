# 0043. Keycloak configuration as code (keycloak-config-cli Job)

- **Status:** Accepted, implemented (checked against Keycloak 26.4.7 in Docker; not yet run on the clusters)
- **Date:** 2026-11-13
- **Related:** 0004 (admin console private), 0009 (Argo CD, bootstrap state), 0018 (staging),
  0019/0030 (admin-site sign-in, OTP), 0032 (site service accounts), 0042 (business sites),
  `k8s/base/keycloak/config-job.yaml`, `k8s/base/keycloak/config-sync.sh`, `k8s/base/keycloak/`, `k8s/components/keycloak-{local,sites}/`

## Context

Keycloak's settings reached it three different ways:

- the realm JSON, imported by `--import-realm` **only when the realm didn't exist** (a fresh
  cluster); every later change in git was silently ignored by a running Keycloak;
- `keycloak-admin-url.sh` (realm `master` Frontend URL, brute-force) and `keycloak-admin-otp.sh`
  (the admin-site sign-in flow), kcadm scripts to remember once per fresh cluster;
- then `keycloak-sync-sites.sh` for the sites of ADR 0042, whose partial import failed on the
  existing `sites` group ("duplicate").

Adding a site, a role or a client meant knowing which of them to run where; forgetting one left
an environment quietly different from git.

## Decision

- **One mechanism, every environment, every deploy**: the Job `keycloak-config` runs
  [keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) (`6.5.1-26.1.0`) against
  Keycloak and applies the environment's ConfigMap `keycloak-config`. Keycloak itself imports
  nothing any more (`--import-realm` removed): a fresh cluster gets its realms from the Job, a
  running one gets every change. prod: an Argo CD PostSync hook; dev/staging: `npm run k8s:up` /
  `staging:up` delete the previous Job and apply.
- **The same files in every environment** (revised 2026-11-14: the realm was first one copy per
  environment, and the copies had drifted). What differs is a value, referenced as `$(env:NAME)`
  and given by the environment: ConfigMap `public-urls` (the overlay's `urls.env`: `WEB_URL`, `ADMIN_URL`,
  `KEYCLOAK_CONSOLE_URL`) and Secret `keycloak-clients` (`WEB_CLIENT_SECRET`,
  `ADMIN_WEB_CLIENT_SECRET`, the sites' `<SITE>_WEB_CLIENT_SECRET`; prod: External Secrets, from the
  SAME secret-manager entries the web apps read, so no client secret is copied by hand). A missing
  value fails the run.
- **Files**, each its own run with its own cache key (the tool keeps one checksum per realm and key,
  skips an unchanged file, and a run never deletes what another file created; checked in Docker):
  - `realm.json` (`k8s/base/keycloak/`): realm `nest-microservice`, its roles, clients, groups and the
    admin-site flow `browser-admin-otp` bound to `admin-web` (was `keycloak-admin-otp.sh`). **No
    people**: an applied user gets the file's password back.
  - `site-<id>.json` (`k8s/sites/<id>/keycloak`, in the environments that list the site; dev lists
    all nine, ADR 0047): the site's client `<id>-web` and its service account in `/sites/<id>` (ADR 0032).
  - `users.json`, `otp.json`, `dev-cli.json` (component `keycloak-local`: dev, staging): the test
    users (applied when the file changes, then their passwords are the file's again), alice's
    one-time code (applied once; afterwards Keycloak answers 409, expected and logged), the
    password-grant client for curl tests.
  - `master-config-cli.json` (prod): the master client `keycloak-config-cli` the Job signs in with
    once the bootstrap admin is removed.
  - `master.json` (base): realm `master`'s Frontend URL and brute-force detection (was
    `keycloak-admin-url.sh`), applied last (its new issuer invalidates the run's token, so that run
    is repeated once).
- **Credentials**: the bootstrap admin (Secret `keycloak-admin`) until the master client works.
- Checked in Docker on 26.4.7: a fresh Keycloak gets both realms; on a realm imported the old way
  with a different `browser-admin-otp`, the flow is rebuilt and rebound; hand-changed passwords,
  Keycloak-generated client secrets (prod has none in git) and alice's OTP survive; the prod switch
  to the master client works after the bootstrap admin is deleted.

## Consequences

- A change to Keycloak's configuration is a change to a file in git, applied by the next deploy.
  A new site = its group in `realm.json` and its client and service account in `k8s/sites/<id>/keycloak`.
- Only realms master and nest-microservice are managed; resources created by hand in the console
  are left alone unless the tool created them (its remote state), but a field of a managed object
  not in the file is reset (e.g. a client's flow override made by hand): change the file instead.
- Editing `users.json` resets the test users' passwords (dev/staging only).
- A file that declares a user without `groups` removes that user's groups (found on a fresh staging:
  `otp.json` stripped alice of `/admins`). So `otp.json` runs before `users.json`, whose cache key
  carries `otp.json`'s checksum: the groups are applied again whenever the code is.
- One more image (Docker Hub, `adorsys/keycloak-config-cli`) and one powerful credential in prod
  (the master client has realm role `admin`): keep its secret in the secret manager only.

## Alternatives considered

- **Keep `--import-realm` + kcadm scripts**: the situation above. Rejected.
- **Keycloak partial import (`partialImport`) on every deploy**: cannot add authentication flows
  without dropping the built-in ones, matches groups by id (the "duplicate" error), no remote state.
- **Terraform Keycloak provider**: a state backend and another toolchain for one service.
