# 0009. Delivery: GitHub + Argo CD, Kustomize base / components / overlays

- **Status:** Accepted, environments on hold (done 2026-11-08: PR CI `.github/workflows/ci.yml`, images to GHCR + tag commit `.github/workflows/images.yml`; Argo CD to do)
- **Date:** 2026-11-05
- **Related:** `k8s/README.md` (production), `k8s/overlays/`, `k8s/components/`

## Context

The system runs on Kubernetes locally (Docker Desktop) and will run on a managed cluster
(DigitalOcean DOKS). We need one way to describe every environment and a repeatable, auditable
way to deploy it.

## Decision

- Code on **GitHub**; CI with GitHub Actions (tests, images to GHCR, bump the image tag in the
  overlay).
- **Argo CD** deploys from git (pull model, GitOps). Never `kubectl apply` the prod overlay by
  hand (the migration Job is an Argo CD PreSync hook).
- **Kustomize**: `base/` (what every environment runs, placeholder hosts, no secrets),
  `components/` (optional pieces: local data, NATS, apps), `overlays/dev` and `overlays/prod`.
  KrakenD uses one Flexible Configuration template with per-overlay settings.
- Prod target: DOKS, managed Postgres and Valkey, cert-manager + Let's Encrypt (DNS-01) on the
  Gateway, secrets from a secret manager through External Secrets.

On hold by choice (don't start unless asked): staging, actually provisioning production, VPN
(Tailscale) for admin access, production SSL setup.

## Consequences

- The cluster state is whatever git says; manual changes are overwritten.
- Prod-only differences live in `overlays/prod` (TLS, NetworkPolicies, replicas, External Secrets).
- Some state lives outside git and needs bootstrap steps (Keycloak client secret, realm `master`
  Frontend URL, see 0004; managed databases).

## Alternatives considered

- **Self-hosted GitLab**: rejected (2026-11-05); GitHub + GitHub Actions needs nothing to operate.
- **Push-based deploys from CI (`kubectl apply`)**: cluster credentials in CI, drift between git
  and the cluster. Rejected for Argo CD's pull model.
- **Helm charts for our own apps**: not used; Kustomize covers the needs. Third-party components
  (e.g. NATS for a 3-node cluster) may still come from their official Helm charts.
