# 0030. The admin site serves site admins too; only superadmins need a one-time code

- **Status:** Accepted, partly implemented (Keycloak, session, layout; one site at a time)
- **Date:** 2026-11-11
- **Related:** amends 0019 (who signs in, OTP); 0025, 0028 (site membership), 0004,
  `k8s/scripts/keycloak-admin-otp.sh`, `web/apps/admin-web/README.md`

## Context

ADR 0019 opened the admin site to the system's administrators only, each with password + OTP.
The client sites (nails, wine, laundry/SFaster…) now have their own admins: business owners who
manage the content of their one site, with full rights on it. The owner decided they sign in with
a password only, while the people who manage every site and the system keep the one-time code.

## Decision

- **Two kinds of admin**, both in the `nest-microservice` realm until the realm split (0025):

  | | Keycloak | Sees | OTP |
  |---|---|---|---|
  | Superadmin | group `admins`: `admin-web:admin` + `admin-web:superadmin`, `content:admin` (every site), deployments | every site + the system pages | required |
  | Site admin | group `site-admins` (`admin-web:admin`, `content:read/write/publish`) + `/sites/<id>` | only its sites | no |

- **Sign-in flow `browser-admin-otp`** (client `admin-web`): password → no `admin-web:admin` →
  refused → `admin-web:superadmin` → one-time code. `KEYCLOAK_REQUIRED_ROLE=admin-web:admin` and
  short sessions stay.
- **The API decides access, the app only displays it**: the side menu lists what
  `GET /api/content/sites` returns (already filtered by the caller's sites, ADR 0028) and shows
  the system pages to `admin-web:superadmin`; a site the caller doesn't belong to answers 404.
- A new site's admin = a Keycloak user in `site-admins` + `/sites/<id>` (Keycloak console for
  now; a user-management page is a later decision, it needs the Keycloak admin API).

## Consequences

- A site admin's account is protected by its password, brute-force detection and the app's rate
  limits only: a stolen password gives full control of that one site's content (not of others,
  nor of the system). Turning OTP on for them later = removing the superadmin condition in the
  flow script.
- Removing a user from `site-admins` (or a site group) takes effect within one access-token
  lifetime (the role is re-checked on every refresh).
- Site admins keep `content:publish`: no approval step. A reviewer role would be a new ADR.

## Alternatives considered

- **OTP for everyone (0019 as is)**: rejected by the owner (friction for small-business owners).
- **One admin app per site**: more deployments, the same code n times. Rejected.
- **Superadmin = `content:admin` only**: the OTP flow needs a role of the admin site itself, and
  system pages aren't content. Rejected.
