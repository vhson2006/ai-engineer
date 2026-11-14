# 0050. Customers' accounts: e-mail and password, Google, passkeys; never linked at sign-in; Keycloak sends the e-mails

- **Status:** Accepted, not implemented
- **Date:** 2026-11-14
- **Related:** 0025 (a realm per site), 0049 (customers sign in: this adds registration, recovery,
  Google and passkeys), 0043 (Keycloak as code), 0010 (tokens never in the browser), 0004

## Context

ADR 0049 lets customers sign in, but only accounts created beforehand exist. Customers must be able
to register, recover a password, sign in with Google and with a passkey, and still be ONE account
per person on a site. Sign-in methods meeting on the same e-mail is where accounts get taken over,
so the behaviour of Keycloak 26.4.7 (the version deployed) was tested on a throwaway instance with
real Chrome before deciding:

- Keycloak's default `first broker login` never links silently (even with "trust email"): it
  e-mails a link. Clicking it links the provider into an account an attacker pre-registered with
  the victim's e-mail, and the attacker's password then works.
- A verification link opened in another browser asks "Confirm validity…, click to proceed" and
  then activates the account, whoever registered it.
- "Forgot password" replaces the password (an attacker's included) and lifts a brute-force lock,
  but does not verify the e-mail. Its "sign out other devices" box is unchecked by default.
- An unverified account reaches neither passkey registration nor the account console.
- Unlinking Google is refused when the account has no password, even with a passkey.

## Decision

- **Methods, per realm `site-<id>`:** e-mail + password, Google, passkeys. Nothing else.
- **One e-mail, one account** (`duplicateEmailsAllowed: false`, e-mail as username). Apps and
  services identify a customer by the token's `sub`, never by e-mail or Google id.
- **Never linked at sign-in.** The realm's first-login flow for identity providers is only
  "Create User If Unique" (required): a Google e-mail that already has an account is refused
  ("already exists, sign in and link it from your account"). Google is linked only by a signed-in
  customer (account console, or `kc_action=idp_link:google`). Google: `trustEmail` (accounts it
  creates are verified), sync mode `IMPORT`; one OAuth client in Google Cloud, consent screen in the
  platform's name, a redirect URI per realm and environment.
- **Registration and verification by Keycloak's link** (`verifyEmail`); an unverified account cannot
  sign in. **Forgot password by Keycloak's link**, never a code: a code is typed into the screen of
  whoever asked for it, so a scammer who asked could get the owner to read it out.
- **Passkeys** (WebAuthn passwordless) are added and deleted by a signed-in, therefore verified,
  customer: account console or `kc_action=webauthn-register-passwordless`. Adding or deleting a
  credential and linking Google require a recent sign-in.
- **Only Keycloak sends e-mail:** each realm's `smtpServer` from `$(env:SMTP_*)`, its own display
  name. Gmail with an app password for now; another SMTP relay (Resend) = new values in the
  environment's Secret, nothing else. Dev uses Mailpit. No mail code in the API.
- **Unverified accounts are deleted after 24 hours** by a job (TypeScript, Keycloak Admin API).
- **A login and e-mail theme** (FreeMarker templates, no Java, mounted from a ConfigMap): the
  verification mail and its confirmation page say "didn't sign up at <site>? don't click";
  "sign out other devices" is checked by default; the reset mail announces the activation mail
  that follows.
- Everything goes through `k8s/scripts/sites.mjs` and the realm files (ADR 0043), never the console.

## Consequences

- Accepted risk: someone who registers a victim's e-mail first gets the account if the victim
  clicks an activation mail they never asked for, within 24 hours; the victim recovers it with
  "forgot password" but must delete any passkey the attacker added.
- A customer who registered with a password and then clicks "Google" gets an error and links it
  from the account instead. After "forgot password" on an unverified account, one more mail.
- A customer with a passkey and Google but no password cannot unlink Google (Keycloak's rule).
- The same person on two sites has two accounts (ADR 0025).
- Passkeys belong to the sign-in host (`auth.<domain>`): when a site moves to its own domain, its
  customers register them again (passwords and Google keep working).
- Gmail: about 500 mails a day for every site together, sent from the Gmail address; move to a
  relay with the platform's domain (SPF, DKIM) before that limit matters.
- New secrets in every environment: SMTP and Google client (dev, staging, External Secrets in prod).

## Alternatives considered

- **Keycloak's default linking at sign-in:** pre-registered accounts are taken over (tested).
- **One account per method, duplicate e-mails allowed:** sign-in by e-mail and recovery become
  ambiguous, customers split in several accounts that cannot be merged later.
- **A 6-digit code instead of the activation link:** needs a Java extension and our own Keycloak
  image for a low risk; and for password reset a code is less safe than a link.
- **Facebook:** e-mails Keycloak cannot trust, more takeover paths. **Zalo:** a Java extension, no
  e-mail at all.
- **Two of three methods to change the third:** for Gmail users the mailbox and Google are the
  same account, most customers have one method, and it conflicts with password recovery.
- **Sending mail from the API:** Keycloak already sends every mail these flows need.
