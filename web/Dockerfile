# syntax=docker/dockerfile:1
# The production image of ANY Next.js app of the workspace (portfolio-web, admin-web, the business
# sites): standalone output. Build context = the web workspace (web/), so the shared packages are
# included. One image per app and public origin:
#   docker build -f web/Dockerfile --build-arg APP=portfolio-web --build-arg SITE_URL=https://www.example.com -t portfolio-web web
# Configuration is read at runtime from env (APP_URL, API_URL, REDIS_URL, KEYCLOAK_*,
# SESSION_ENCRYPTION_KEY…), except SITE_URL: the public origin is baked into the prerendered pages
# (canonical, hreflang, sitemap, link previews; ADR 0021). The images CI builds: k8s/images.json.
ARG NODE_IMAGE=node:24.22.1-alpine

# Every workspace's package.json, and nothing else, at its path: `npm ci` needs all of them (the
# lockfile lists every workspace). No hand-kept list: a new app or package is picked up, and this
# stage's result only changes when a manifest does (the install below stays cached).
FROM ${NODE_IMAGE} AS manifests
WORKDIR /web
COPY . .
RUN find . -type f ! -name package.json ! -name package-lock.json -delete && find . -type d -empty -delete

FROM ${NODE_IMAGE} AS deps
ARG APP
RUN test -n "$APP" || { echo "build arg APP is required (a workspace under apps/, e.g. portfolio-web)" >&2; exit 1; }
WORKDIR /web
COPY --from=manifests /web ./
RUN npm ci -w "$APP"

FROM deps AS build
ARG APP
ARG SITE_URL
RUN test -n "$SITE_URL" || { echo "build arg SITE_URL is required (the app's public origin, e.g. https://www.example.com)" >&2; exit 1; }
ENV NEXT_TELEMETRY_DISABLED=1 \
    SITE_URL=$SITE_URL
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/${APP} apps/${APP}
RUN npm run build -w "$APP"

FROM ${NODE_IMAGE} AS runtime
ARG APP
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# server.js + traced node_modules and packages (outputFileTracingRoot = web/), then the static
# assets it serves itself, at the same relative paths.
COPY --from=build /web/apps/${APP}/.next/standalone ./
COPY --from=build /web/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build /web/apps/${APP}/public ./apps/${APP}/public
# The only place Next writes at runtime (image/fetch cache). In k8s it's an emptyDir, so the root
# filesystem can stay read-only.
RUN mkdir -p apps/${APP}/.next/cache && chown node:node apps/${APP}/.next/cache
# server.js changes to its own folder when it starts.
WORKDIR /app/apps/${APP}
# Numeric uid (= the image's "node" user): Kubernetes can only enforce runAsNonRoot with a numeric
# USER ("node" → CreateContainerConfigError). Found by the local staging (ADR 0018).
USER 1000:1000
EXPOSE 3000
CMD ["node", "server.js"]
