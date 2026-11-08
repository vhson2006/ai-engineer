#!/usr/bin/env bash
# Admin site sign-in = an administrator, with password AND one-time code (ADR 0019), enforced by
# Keycloak in the browser flow "browser-admin-otp" of realm nest-microservice:
#
#   Cookie                                   ALTERNATIVE  (an existing SSO session)
#   browser-admin-otp-forms                  ALTERNATIVE
#     Username Password Form                 REQUIRED
#     browser-admin-otp-non-admins           CONDITIONAL
#       Condition - user role                REQUIRED     (NOT admin-web.admin)
#       Deny access                          REQUIRED     → refused before any OTP step
#     OTP Form                               REQUIRED     (an admin without OTP must set it up: QR)
#
# Non-admins are refused right after their password, so trying the admin site never enrolls them
# in OTP. The flow is bound to the client "admin-web" only (authentication flow override):
# portfolio-web keeps the realm's default browser flow. admin-web ALSO checks the role itself
# (KEYCLOAK_REQUIRED_ROLE): two independent locks.
#
# Rebuilt from scratch on every run (unbind, delete, create, bind): always exactly this structure.
# Dev, staging AND prod, once per fresh cluster (stored in Keycloak's database):
#   npm run keycloak:admin-otp                                  # namespace nest-microservice
#   NS=nest-staging bash k8s/scripts/keycloak-admin-otp.sh      # (staging.sh does it)
# A script against the admin API, not the realm JSON: a partial realm file can't add a flow
# without dropping the built-in ones.
set -euo pipefail
NS=${NS:-nest-microservice}
export MSYS_NO_PATHCONV=1 # Git Bash: don't rewrite /opt/... into a Windows path

kubectl -n "$NS" exec deploy/keycloak -c keycloak -- sh -c '
set -eu
K=/opt/keycloak/bin/kcadm.sh; C=/tmp/kcadm-$$.config; R=nest-microservice; F=browser-admin-otp
trap "rm -f $C" EXIT
$K config credentials --config "$C" --server http://localhost:8080 --realm master \
  --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" >/dev/null 2>&1 \
  || { echo "kcadm login failed (bootstrap admin removed? run it with a named admin)" >&2; exit 1; }
k() { $K "$@" --config "$C" -r "$R"; }
q() { k "$@" >/dev/null 2>&1; }  # quiet: kcadm prints "Created new ..." on stderr

CID=$(k get clients -q clientId=admin-web --fields id --format csv --noquotes)
[ -n "$CID" ] || { echo "client admin-web not found in realm $R (realm imported before admin-web existed?)" >&2; exit 1; }
flow_id() { k get authentication/flows --fields id,alias --format csv --noquotes | grep ",$1\$" | cut -d, -f1; }

# Remove the previous version (the client must not point at a deleted flow).
OLD=$(flow_id $F || true)
if [ -n "$OLD" ]; then
  q update clients/$CID -s "authenticationFlowBindingOverrides.browser=" # an empty value removes it
  q delete authentication/flows/$OLD
fi

q create authentication/flows -s alias=$F -s "description=Admins only, password AND one-time code (client admin-web, ADR 0019)" \
  -s providerId=basic-flow -s topLevel=true -s builtIn=false
# Explicit priorities: Keycloak 26 orders the steps of a flow by priority, and steps created without one
# all get 0, so their order is arbitrary (the role check could run before the password form, with
# no user yet, and refuse everyone with "Invalid username or password").
q create authentication/flows/$F/executions/execution -s provider=auth-cookie -s priority=10
q create authentication/flows/$F/executions/flow -s alias=$F-forms -s type=basic-flow -s priority=20   -s "description=Password, admin role, one-time code"
q create authentication/flows/$F-forms/executions/execution -s provider=auth-username-password-form -s priority=10
q create authentication/flows/$F-forms/executions/flow -s alias=$F-non-admins -s type=basic-flow -s priority=20   -s "description=Refuse users without admin-web.admin"
q create authentication/flows/$F-non-admins/executions/execution -s provider=conditional-user-role -s priority=10
q create authentication/flows/$F-non-admins/executions/execution -s provider=deny-access-authenticator -s priority=20
q create authentication/flows/$F-forms/executions/execution -s provider=auth-otp-form -s priority=30

# Executions are created DISABLED: set each requirement; configure the role condition (negated).
k get authentication/flows/$F/executions --fields id,providerId,displayName --format csv --noquotes |
while IFS=, read -r id provider display; do
  case "$provider:$display" in
    auth-cookie:*) req=ALTERNATIVE ;;
    *:$F-forms) req=ALTERNATIVE ;;
    *:$F-non-admins) req=CONDITIONAL ;;
    auth-username-password-form:*|auth-otp-form:*) req=REQUIRED ;;
    deny-access-authenticator:*)
      req=REQUIRED
      q create authentication/executions/$id/config -s alias=$F-deny-message \
        -s "config.denyErrorMessage=This account is not an administrator. / Tài khoản này không phải quản trị viên." ;;
    conditional-user-role:*)
      req=REQUIRED
      q create authentication/executions/$id/config -s alias=$F-not-admin \
        -s config.condUserRole=admin-web.admin -s config.negate=true ;;
    *) continue ;;
  esac
  q update authentication/flows/$F/executions -b "{\"id\":\"$id\",\"requirement\":\"$req\"}"
  echo "  $display: $req"
done

# Fail loudly if the order is still not the one above (a Keycloak upgrade changing how priority works).
ORDER=$(k get authentication/flows/$F/executions --fields providerId,displayName --format csv --noquotes | cut -d, -f1,2 | tr "
" " ")
case "$ORDER" in
  *auth-cookie*"$F-forms"*auth-username-password-form*"$F-non-admins"*conditional-user-role*deny-access-authenticator*auth-otp-form*) ;;
  *) echo "unexpected step order in $F: $ORDER" >&2; exit 1 ;;
esac

q update clients/$CID -s "authenticationFlowBindingOverrides.browser=$(flow_id $F)"
echo "client admin-web: browser flow = $F (admins only, password + OTP)"'
