# syntax=docker/dockerfile:1
# One Dockerfile, four images (pick with --target):
#   docker build --target deployment-service   -t deployment-service .
#   docker build --target notification-service -t notification-service .
#   docker build --target content-service      -t content-service .
#   docker build --target migrate              -t deployment-migrate .   (run as Jobs: prisma migrate deploy of EVERY
#                                                                         database; with `node dist/apps/nats-setup/main`: the JetStream streams)
# Runtime images: production node_modules only, non-root user, no source, no .env.
ARG NODE_IMAGE=node:24.22.1-alpine

# ---- dependencies (all, incl. dev: Nest CLI, Prisma CLI) ---------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs `prisma generate` for every service, which needs their schemas and configs.
COPY apps/deployment-service/prisma.config.ts apps/deployment-service/
COPY apps/deployment-service/prisma apps/deployment-service/prisma
COPY apps/notification-service/prisma.config.ts apps/notification-service/
COPY apps/notification-service/prisma apps/notification-service/prisma
COPY apps/content-service/prisma.config.ts apps/content-service/
COPY apps/content-service/prisma apps/content-service/prisma
COPY apps/ai-service/prisma.config.ts apps/ai-service/
COPY apps/ai-service/prisma apps/ai-service/prisma
RUN npm ci

# ---- build every app (webpack bundles the app code and the generated Prisma client into dist/) --
FROM deps AS build
COPY . .
RUN npm run build

# ---- production dependencies only --------------------------------------------------------------
# --legacy-peer-deps: @prisma/client lists the Prisma CLI and TypeScript as peer dependencies and
# npm would install them (~250 MB); the generated client doesn't need them at runtime.
# --ignore-scripts: no postinstall `prisma generate` (the client is already bundled in dist/).
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts && npm cache clean --force

# ---- shared runtime base -----------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    LOG_FORMAT=json
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
# Numeric uid (= the image's "node" user): Kubernetes can only enforce runAsNonRoot with a
# numeric USER ("node" → CreateContainerConfigError). Found by the local staging (ADR 0018).
USER 1000:1000

# ---- deployment-service (REST, :3001) ----------------------------------------------------------
FROM runtime AS deployment-service
COPY --from=build /app/dist/apps/deployment-service ./dist/apps/deployment-service
EXPOSE 3001
CMD ["node", "dist/apps/deployment-service/main"]

# ---- notification-service (JetStream consumer + inbox, health on :3002) -------------------------
FROM runtime AS notification-service
COPY --from=build /app/dist/apps/notification-service ./dist/apps/notification-service
EXPOSE 3002
CMD ["node", "dist/apps/notification-service/main"]

# ---- content-service (REST, :3003; publishes scheduled articles every minute) -----------------
FROM runtime AS content-service
COPY --from=build /app/dist/apps/content-service ./dist/apps/content-service
EXPOSE 3003
CMD ["node", "dist/apps/content-service/main"]

# ---- ai-service (JetStream consumer + outbox, health on :3004; the only caller of AI providers) ----
FROM runtime AS ai-service
COPY --from=build /app/dist/apps/ai-service ./dist/apps/ai-service
EXPOSE 3004
CMD ["node", "dist/apps/ai-service/main"]

# ---- migrate: prisma migrate deploy (needs the Prisma CLI, a dev dependency) --------------------
# Also carries nats-setup (the one owner of the JetStream streams, ADR 0024) and content-import
# (the content snapshot, ADR 0044): same image, their Jobs override the command.
FROM deps AS migrate
ENV NODE_ENV=production
COPY --from=build /app/dist/apps/nats-setup ./dist/apps/nats-setup
COPY --from=build /app/dist/apps/content-import ./dist/apps/content-import
COPY apps/content-service/seed/content ./seed/content
ENV CONTENT_SNAPSHOT_DIR=/app/seed/content
# Numeric uid (= the image's "node" user): Kubernetes can only enforce runAsNonRoot with a
# numeric USER ("node" → CreateContainerConfigError). Found by the local staging (ADR 0018).
USER 1000:1000
# Each service owns its database: deployment (DB_*), notification (NOTIFICATION_DB_*), content (CONTENT_DB_*), ai (AI_DB_*).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --config apps/deployment-service/prisma.config.ts && ./node_modules/.bin/prisma migrate deploy --config apps/notification-service/prisma.config.ts && ./node_modules/.bin/prisma migrate deploy --config apps/content-service/prisma.config.ts && ./node_modules/.bin/prisma migrate deploy --config apps/ai-service/prisma.config.ts"]
