# 0046. One list of images, one Dockerfile for the Next.js apps

- **Status:** Accepted, implemented
- **Date:** 2026-11-14
- **Related:** 0009 (GitHub + Argo CD), 0018 (local staging), 0021 (SITE_URL), 0042/0045 (business
  sites), `k8s/images.json`, `k8s/scripts/images-check.mjs`, `web/Dockerfile`

## Context

The images were declared in five places that had to agree by hand: the build matrix and change
filters of `.github/workflows/images.yml`, three lists in `k8s/scripts/staging.sh`, the `images:`
of the prod and staging overlays, and the manifests. Each Next.js app had its own Dockerfile
(portfolio-web and admin-web differed only by the app's name), and every Dockerfile listed the
`package.json` of every workspace: the nine business sites would have added nine Dockerfiles, and
every new package a change to all of them. One had already drifted (render-worker's list missed
the nine sites).

## Decision

- **`k8s/images.json` is the one list**: per image its build context, Dockerfile, target, the app
  and public origin of a Next.js image (`siteUrl`, `{domain}` = the environment's), what it watches
  (path regex) and its `group` (the API images, built together from one commit). `images.yml`
  (prod) and `staging.sh` (local staging) build from it; `images-check.mjs` (CI, job k8s) refuses
  an overlay or a manifest that disagrees with it. The overlays keep their `images:` blocks
  (Kustomize needs them), checked.
- **`web/Dockerfile` builds every Next.js app** (`--build-arg APP=<app> --build-arg
  SITE_URL=<origin>`): a first stage keeps only the workspaces' `package.json` files, so no list is
  kept by hand and the install stays cached until a manifest changes. `SITE_URL` is required for
  every Next.js image (one public origin per image). render-worker keeps its own Dockerfile
  (Debian, Chrome) with the same manifests stage. `web/.dockerignore` keeps `node_modules`,
  `.next` and env files out of the context.
- The repository variable `PROD_DOMAIN` (was `PROD_SITE_URL`) gives the domain the web images are
  built for.

## Consequences

- A new image = an entry in `images.json`, its manifest, and its `images:` entries (CI says which
  is missing). A new business site needs no Dockerfile.
- Local builds no longer send `node_modules` to Docker.

## Alternatives considered

- **Generate the overlays' `images:` from the list**: a generator step before every kustomize
  render (Argo CD included); checking is simpler. Rejected for now.
- **A Dockerfile per app, generated**: still one file per app to review. Rejected.
