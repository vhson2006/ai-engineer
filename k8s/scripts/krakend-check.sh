#!/usr/bin/env bash
# Renders KrakenD's Flexible Configuration for an overlay and validates it with the real image.
#   npm run krakend:check            # overlay "dev"
#   bash k8s/scripts/krakend-check.sh prod
# The rendered JSON is written to k8s/.krakend-rendered.<overlay>.json (git-ignored) to inspect.
set -euo pipefail

OVERLAY=${1:-dev}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SETTINGS="$ROOT/overlays/$OVERLAY/krakend/settings"
[ -d "$SETTINGS" ] || { echo "No settings for overlay '$OVERLAY' ($SETTINGS)"; exit 1; }

# Docker Desktop on Windows needs Windows paths for bind mounts; Git Bash must not rewrite them.
host_path() { if command -v cygpath >/dev/null; then cygpath -w "$1"; else echo "$1"; fi; }
export MSYS_NO_PATHCONV=1

docker run --rm \
  -v "$(host_path "$ROOT/base/krakend/config"):/etc/krakend/config:ro" \
  -v "$(host_path "$SETTINGS"):/etc/krakend/settings:ro" \
  -v "$(host_path "$ROOT"):/out" \
  -e KEYCLOAK_ISSUER="$(sed -n 's/^KEYCLOAK_ISSUER=//p' "$ROOT/overlays/$OVERLAY/urls.env")"   -e FC_ENABLE=1 \
  -e FC_SETTINGS=/etc/krakend/settings \
  -e FC_TEMPLATES=/etc/krakend/config/templates \
  -e FC_OUT="/out/.krakend-rendered.$OVERLAY.json" \
  krakend:2.10.2 check -t -l -c /etc/krakend/config/krakend.tmpl

echo "Rendered: k8s/.krakend-rendered.$OVERLAY.json"
