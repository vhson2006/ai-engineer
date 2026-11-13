# syntax=docker/dockerfile:1
# Production image (Next.js standalone output). Build context = the web workspace (web/), so the
# shared packages are included:
#   docker build -f web/apps/admin-web/Dockerfile -t admin-web web
# All configuration is read at runtime from env (APP_URL, API_URL, REDIS_URL, KEYCLOAK_*,
# SESSION_ENCRYPTION_KEY), never baked in: the same image runs in every environment.
ARG NODE_IMAGE=node:24.22.1-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /web
# Manifests first (cached layer). Every workspace in package-lock.json must be listed here.
COPY package.json package-lock.json ./
COPY apps/admin-web/package.json apps/admin-web/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
COPY packages/video/package.json packages/video/
COPY apps/render-worker/package.json apps/render-worker/
COPY apps/portfolio-web/package.json apps/portfolio-web/
RUN npm ci -w admin-web

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/admin-web apps/admin-web
RUN npm run build -w admin-web

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# server.js + traced node_modules and packages (outputFileTracingRoot = web/), then the static
# assets it serves itself, at the same relative paths.
COPY --from=build /web/apps/admin-web/.next/standalone ./
COPY --from=build /web/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=build /web/apps/admin-web/public ./apps/admin-web/public
# The only place Next writes at runtime (image/fetch cache). In k8s it's an emptyDir, so the
# root filesystem can stay read-only.
RUN mkdir -p apps/admin-web/.next/cache && chown node:node apps/admin-web/.next/cache
# Numeric uid (= the image's "node" user): Kubernetes can only enforce runAsNonRoot with a
# numeric USER ("node" → CreateContainerConfigError). Found by the local staging (ADR 0018).
USER 1000:1000
EXPOSE 3000
CMD ["node", "apps/admin-web/server.js"]
