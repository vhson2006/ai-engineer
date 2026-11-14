# 0043. Keycloak configuration as code (keycloak-config-cli Job)

- **Status:** Accepted, implemented (checked against Keycloak 26.4.7 in Docker; not yet run on the clusters)
- **Date:** 2026-11-13
- **Related:** 0004 (admin console private), 0009 (Argo CD, bootstrap state), 0018 (staging),
  0019/0030 (admin-site sign-in, OTP), 0032 (site service accounts), 0042 (business sites),
  `k8s/base/keycloak/config-job.yaml`, `k8s/base/keycloak/config-sync.sh`, `k8s/overlays/<env>/keycloak/`

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
- **Files** (`k8s/overlays/<env>/keycloak/`), each its own run with its own cache key (the tool
  keeps one checksum per realm and key, and skips an unchanged file):
  - `realm.json`: realm `nest-microservice`, its roles, clients, groups, service accounts and the
    admin-site flow `browser-admin-otp` bound to `admin-web` (was `keycloak-admin-otp.sh`). **No
    people**: an applied user gets the file's password back.
  - `users.json` (dev, staging): the test users; applied when the file changes, then their
    passwords are the file's again.
  - `otp.json` (dev, staging): alice's one-time code; applied once (afterwards Keycloak answers
    409, expected and logged).
  - `master.json`: realm `master`'s Frontend URL and brute-force detection (was
    `keycloak-admin-url.sh`), applied last (its new issuer invalidates the run's token, so that run
    is repeated once). prod also declares the client `keycloak-config-cli` (secret from External
    Secrets) that the Job signs in with once the bootstrap admin is removed.
- **Credentials**: the bootstrap admin (Secret `keycloak-admin`) until the master client works.
- Checked in Docker on 26.4.7: a fresh Keycloak gets both realms; on a realm imported the old way
  with a different `browser-admin-otp`, the flow is rebuilt and rebound; hand-changed passwords,
  Keycloak-generated client secrets (prod has none in git) and alice's OTP survive; the prod switch
  to the master client works after the bootstrap admin is deleted.

## Consequences

- A change to Keycloak's configuration is a change to a file in git, applied by the next deploy.
  A new site = its group, client and service account in `realm.json` of each environment.
- Only realms master and nest-microservice are managed; resources created by hand in the console
  are left alone unless the tool created them (its remote state), but a field of a managed object
  not in the file is reset (e.g. a client's flow override made by hand): change the file instead.
- Editing `users.json` resets the test users' passwords (dev/staging only).
- One more image (Docker Hub, `adorsys/keycloak-config-cli`) and one powerful credential in prod
  (the master client has realm role `admin`): keep its secret in the secret manager only.

## Alternatives considered

- **Keep `--import-realm` + kcadm scripts**: the situation above. Rejected.
- **Keycloak partial import (`partialImport`) on every deploy**: cannot add authentication flows
  without dropping the built-in ones, matches groups by id (the "duplicate" error), no remote state.
- **Terraform Keycloak provider**: a state backend and another toolchain for one service.
