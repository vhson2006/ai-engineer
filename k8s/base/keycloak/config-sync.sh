#!/bin/sh
# Keycloak configuration as code (ADR 0043): applies the environment's files (ConfigMap
# "keycloak-config", mounted on /config) to the running Keycloak with keycloak-config-cli. The ONE
# way realm settings reach Keycloak, on a fresh cluster and on a running one alike. Each file is
# its own run with its own cache key: keycloak-config-cli stores one checksum per realm and key, and
# skips a run whose file has not changed.
#   master.json  realm master, applied LAST: Frontend URL of the admin console, brute-force
#                detection (prod: the keycloak-config-cli client this Job signs in with). $(env:...).
#   realm.json   realm nest-microservice: roles, clients, groups, service accounts, the admin-site
#                sign-in flow. No people: a run would reset their passwords.
#   users.json   dev/staging test users (passwords from the file). Re-applied only when the file
#                changes: then the test passwords are reset to the file's.
#   otp.json     the dev/staging one-time code of alice. Applied once; afterwards Keycloak answers
#                409 (she already has one), which is not an error here.
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

run /config/realm.json realm
if [ -f /config/users.json ]; then run /config/users.json users; fi
if [ -f /config/otp.json ]; then
  run /config/otp.json otp || echo "otp.json not applied: alice already has a one-time code (Keycloak 409)"
fi
# Last: a NEW Frontend URL of realm master changes the issuer of master tokens, so the token this
# run signed in with is refused right after the change (401 while it records its state). The second
# run signs in again (new issuer), finds the realm as configured and records it.
run /config/master.json master --import.var-substitution.enabled=true ||
  run /config/master.json master --import.var-substitution.enabled=true
echo "Keycloak configuration applied"
