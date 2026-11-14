#!/bin/sh
# Keycloak configuration as code (ADR 0043): applies the files of ConfigMap "keycloak-config"
# (mounted on /config) to the running Keycloak with keycloak-config-cli. The ONE way realm settings
# reach Keycloak, on a fresh cluster and on a running one alike. Every environment shares the same
# files; what differs comes from the environment (ConfigMap "public-urls": the URLs of urls.env; Secret
# "keycloak-clients": client secrets), substituted where a file says $(env:NAME). Each file is its
# own run with its own cache key: keycloak-config-cli stores one checksum per realm and key, and
# skips a run whose file has not changed; a run never deletes what another file created.
#   realm.json              (base) realm nest-microservice: roles, clients web/admin-web, groups,
#                           the admin-site sign-in flow. No people: a run would reset passwords.
#   site-<id>.json          (k8s/sites/<id>/keycloak) a business site's client + service account
#   customers-<id>.json     (k8s/sites/<id>/keycloak) realm site-<id>: the site's customers (ADR 0049)
#   dev-cli.json            (components/keycloak-local) the password-grant client for curl tests
#   otp.json, users.json    (components/keycloak-local) alice's one-time code, then the test users
#                           (in that order, see below). otp.json is applied once: afterwards
#                           Keycloak answers 409, not an error here.
#   test-customers-<id>.json (components/keycloak-local) bob and carol, customers of site <id>; only
#                           when that environment runs the site (its customers-<id>.json is here)
#   master-config-cli.json  (prod) the master client this Job signs in with from then on
#   master.json             (base) realm master, LAST: console Frontend URL, brute-force detection
set -eu
JAR=/app/keycloak-config-cli.jar
: "${KEYCLOAK_URL:?}"

echo "waiting for Keycloak at $KEYCLOAK_URL"
i=0
until curl -sf -o /dev/null "$KEYCLOAK_URL/realms/master"; do
  i=$((i + 1)); [ "$i" -lt 180 ] || { echo "Keycloak not reachable" >&2; exit 1; }
  sleep 5
done

# Credentials: the keycloak-config-cli client of realm master once it exists (prod, created by
# master.json; the bootstrap admin may then be removed), otherwise the bootstrap admin.
token_ok() {
  curl -sf -o /dev/null "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" "$@"
}
if [ -n "${KEYCLOAK_CONFIG_CLI_SECRET:-}" ] &&
  token_ok -d grant_type=client_credentials -d client_id=keycloak-config-cli --data-urlencode "client_secret=$KEYCLOAK_CONFIG_CLI_SECRET"; then
  echo "signing in as the client keycloak-config-cli"
  export KEYCLOAK_GRANTTYPE=client_credentials KEYCLOAK_CLIENTID=keycloak-config-cli KEYCLOAK_CLIENTSECRET="$KEYCLOAK_CONFIG_CLI_SECRET"
else
  echo "signing in as the bootstrap admin"
  export KEYCLOAK_USER="${KC_BOOTSTRAP_ADMIN_USERNAME:?no credentials}" KEYCLOAK_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:?no credentials}"
fi

run() { # file, cache key, extra options
  file=$1 key=$2; shift 2
  echo "== $file (cache key $key)"
  IMPORT_FILES_LOCATIONS="$file" IMPORT_CACHE_KEY="$key" java -jar "$JAR" "$@"
}

run_if() { # file, cache key: only when the environment has that file
  if [ -f "/config/$1" ]; then run "/config/$1" "$2"; fi
}

run /config/realm.json realm
for file in /config/site-*.json; do
  if [ -f "$file" ]; then run "$file" "$(basename "$file" .json)"; fi
done
for file in /config/customers-*.json; do
  if [ -f "$file" ]; then run "$file" "$(basename "$file" .json)"; fi
done
run_if dev-cli.json dev-cli
# otp.json BEFORE users.json: applying a user without `groups` (otp.json declares alice only for her
# one-time code) REMOVES her groups. So users.json comes after, and its cache key carries otp.json's
# checksum: whenever otp.json is applied anew, the users' groups are applied again too.
if [ -f /config/otp.json ]; then
  run /config/otp.json otp || echo "otp.json not applied: alice already has a one-time code (Keycloak 409)"
fi
if [ -f /config/users.json ]; then
  run /config/users.json "users-$(cksum < /config/otp.json 2>/dev/null | cut -d' ' -f1)"
fi
for file in /config/test-customers-*.json; do
  id=${file#/config/test-customers-}
  if [ -f "/config/customers-$id" ]; then run "$file" "$(basename "$file" .json)"; fi
done
run_if master-config-cli.json master-config-cli
# Last: a NEW Frontend URL of realm master changes the issuer of master tokens, so the token this
# run signed in with is refused right after the change (401 while it records its state). The second
# run signs in again (new issuer), finds the realm as configured and records it.
run /config/master.json master || run /config/master.json master
echo "Keycloak configuration applied"
