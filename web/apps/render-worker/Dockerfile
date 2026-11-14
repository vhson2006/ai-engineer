# syntax=docker/dockerfile:1
# render-worker (ADR 0039): renders the video studio's MP4s with Remotion (headless Chrome + the
# ffmpeg Remotion ships). Not Next.js, so not web/Dockerfile. Build context = the web workspace (web/):
#   docker build -f web/apps/render-worker/Dockerfile -t render-worker web
# Debian (glibc): Chrome Headless Shell doesn't run on Alpine. All configuration comes from env.
ARG NODE_IMAGE=node:24.22.1-bookworm-slim

# Every workspace's package.json, and nothing else (as in web/Dockerfile): no hand-kept list.
FROM ${NODE_IMAGE} AS manifests
WORKDIR /web
COPY . .
RUN find . -type f ! -name package.json ! -name package-lock.json -delete && find . -type d -empty -delete

FROM ${NODE_IMAGE} AS deps
WORKDIR /web
COPY --from=manifests /web ./
RUN npm ci -w render-worker --omit=dev

FROM ${NODE_IMAGE} AS runtime
# The libraries Chrome Headless Shell needs (Remotion docs, Linux), and fonts for any fallback.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 libxrandr2 libxkbcommon0 libxfixes3 \
    libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    fonts-noto-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    HOME=/tmp
WORKDIR /web
COPY --from=deps /web/node_modules ./node_modules
COPY package.json tsconfig.base.json ./
COPY packages/video packages/video
COPY apps/render-worker apps/render-worker
# Download Chrome Headless Shell at build time (into node_modules: read-only at runtime is fine),
# never at start or from the pod.
RUN cd apps/render-worker && node -e "require('@remotion/renderer').ensureBrowser().then(() => console.log('browser ready'))"
WORKDIR /web/apps/render-worker
# Numeric uid (the image's "node" user): Kubernetes can enforce runAsNonRoot.
USER 1000:1000
EXPOSE 3005
CMD ["node", "--import", "tsx", "src/main.ts"]
