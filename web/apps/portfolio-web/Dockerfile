# syntax=docker/dockerfile:1
# Production image (Next.js standalone output). Build context = the web workspace (web/), so the
# shared packages are included:
#   docker build -f web/apps/portfolio-web/Dockerfile --build-arg SITE_URL=https://www.example.com -t portfolio-web web
# Configuration is read at runtime from env (APP_URL, API_URL, REDIS_URL, KEYCLOAK_*,
# SESSION_ENCRYPTION_KEY), except SITE_URL: the public origin is baked in for SEO (ADR 0021),
# so build one image per public domain.
ARG NODE_IMAGE=node:24.22.1-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /web
# Manifests first (cached layer). Every workspace in package-lock.json must be listed here.
COPY package.json package-lock.json ./
COPY apps/portfolio-web/package.json apps/portfolio-web/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
COPY packages/video/package.json packages/video/
COPY apps/render-worker/package.json apps/render-worker/
COPY apps/admin-web/package.json apps/admin-web/
RUN npm ci -w portfolio-web

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
# The public origin, baked into the prerendered pages (canonical, hreflang, sitemap, link previews;
# ADR 0021). Required: --build-arg SITE_URL=https://www.example.com
ARG SITE_URL
RUN test -n "$SITE_URL" || { echo "build arg SITE_URL is required (e.g. https://www.example.com)" >&2; exit 1; }
ENV SITE_URL=$SITE_URL
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/portfolio-web apps/portfolio-web
RUN npm run build -w portfolio-web

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# server.js + traced node_modules and packages (outputFileTracingRoot = web/), then the static
# assets it serves itself, at the same relative paths.
COPY --from=build /web/apps/portfolio-web/.next/standalone ./
COPY --from=build /web/apps/portfolio-web/.next/static ./apps/portfolio-web/.next/static
COPY --from=build /web/apps/portfolio-web/public ./apps/portfolio-web/public
# The only place Next writes at runtime (image/fetch cache). In k8s it's an emptyDir, so the
# root filesystem can stay read-only.
RUN mkdir -p apps/portfolio-web/.next/cache && chown node:node apps/portfolio-web/.next/cache
# Numeric uid (= the image's "node" user): Kubernetes can only enforce runAsNonRoot with a
# numeric USER ("node" → CreateContainerConfigError). Found by the local staging (ADR 0018).
USER 1000:1000
EXPOSE 3000
CMD ["node", "apps/portfolio-web/server.js"]
