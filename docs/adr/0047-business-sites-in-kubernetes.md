# 0047. Business sites in Kubernetes: one template, one folder per site

- **Status:** Accepted, implemented (staging runs the nine sites; prod: none yet)
- **Date:** 2026-11-14
- **Related:** 0042/0045 (the site kit), 0032 (site service accounts), 0043 (Keycloak as code),
  0046 (images), `k8s/sites/`, `k8s/overlays/<env>/urls.env`

## Context

The nine business sites had no manifests. Written like portfolio-web, each would have been a
Deployment, a Service, a route, NetworkPolicies, an env file and a Secret, nine times over. And a
site image could not be built in CI at all: `next build` read the articles from the private API
(prerendering the articles pages), which CI can't reach (ADR 0003).

## Decision

- **One template, `k8s/sites/_template`** (a Component): Deployment, Service and HTTPRoute of a
  site. Every site has the same shape; a site's folder `k8s/sites/<id>/` only names it:
  - `app/`: the template with a local ConfigMap `site` (APP = `<id>-web`, the key of its client
    secret), written in by the template's rules;
  - `keycloak/`: its Keycloak client and service account (dev lists only this: the sites run on the
    developer's machine there);
  - `kustomization.yaml` (a Component): the two, plus its host and URL from the overlay's
    `urls.env` (`<ID>_HOST`, `<ID>_URL`).
  An environment runs a site by listing `../../sites/<id>`, its image, and its client secret.
- **Shared per environment**: ConfigMap `business-sites-env` (API URL; the issuer and storage
  origins come from `urls.env`), Secret `keycloak-clients` (the client secrets, ADR 0043), label
  `role: business-site` selected by the NetworkPolicies (edge → sites, sites → KrakenD), the
  https-only route patch and staging's local-CA patch: a new site needs no rule of its own.
- **Images without the API**: in a build with no `API_URL` (`NEXT_PHASE` = build), the site's
  article reads return nothing, inside their cache (`'use cache'`, `cacheLife('minutes')`). The
  articles index, the sitemap and the landing page's latest articles are prerendered with
  revalidation (1 minute) and filled in at runtime (ISR); one article or topic is rendered on its
  first request, complete (SEO: the HTML a crawler gets is whole), then cached. Regenerated pages
  stay in memory (`experimental.isrFlushToDisk: false`): the container's filesystem is read-only.
  `check:sites` keeps that setting in every site.
- **Staging runs the nine sites** (`<id>.staging.localtest.me`; three until 2026-11-14, all nine since
  the content of every site is imported there, ADR 0044), built by
  `staging:build` from `k8s/images.json` (`environments: ["staging"]`). **Prod runs none yet**: each
  real site needs its own domain, certificate and DNS first (a Gateway listener per domain or a
  certificate covering them), a decision per client.

## Consequences

- A site in an environment = one folder (generated once from the template) and four lines in the
  overlay. CI renders every site on its own and checks the images list.
- A newly published or edited article shows up within about a minute (the cache's revalidation),
  as before; nothing invalidates it on publish yet (`revalidateTag` of `content:<siteId>` on the
  article events would).
- Each pod keeps its own page cache: with two replicas, the two may differ for up to a minute.

## Alternatives considered

- **Manifests per site (copies)**: nine times the same YAML. Rejected.
- **A Helm chart**: the repository is Kustomize only (ADR 0009). Rejected.
- **Give CI access to the API to prerender**: would open the private API to the build. Rejected.
