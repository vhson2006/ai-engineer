# syntax=docker/dockerfile:1
# One Dockerfile, three images (pick with --target):
#   docker build --target deployment-service   -t deployment-service .
#   docker build --target notification-service -t notification-service .
#   docker build --target migrate              -t deployment-migrate .   (prisma migrate deploy of BOTH databases, run as a Job)
# Runtime images: production node_modules only, non-root user, no source, no .env.
ARG NODE_IMAGE=node:24.22.1-alpine

# ---- dependencies (all, incl. dev: Nest CLI, Prisma CLI) ---------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs `prisma generate` for both services, which needs their schemas and configs.
COPY apps/deployment-service/prisma.config.ts apps/deployment-service/
COPY apps/deployment-service/prisma apps/deployment-service/prisma
COPY apps/notification-service/prisma.config.ts apps/notification-service/
COPY apps/notification-service/prisma apps/notification-service/prisma
RUN npm ci

# ---- build both apps (webpack bundles the app code and the generated Prisma client into dist/) --
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

# ---- migrate: prisma migrate deploy (needs the Prisma CLI, a dev dependency) --------------------
FROM deps AS migrate
ENV NODE_ENV=production
# Numeric uid (= the image's "node" user): Kubernetes can only enforce runAsNonRoot with a
# numeric USER ("node" → CreateContainerConfigError). Found by the local staging (ADR 0018).
USER 1000:1000
# Each service owns its database: deployment (DB_*) and notification (NOTIFICATION_DB_*).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --config apps/deployment-service/prisma.config.ts && ./node_modules/.bin/prisma migrate deploy --config apps/notification-service/prisma.config.ts"]
