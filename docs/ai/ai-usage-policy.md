# AI usage policy

What engineers may put into AI tools while working on this repository (all parts: `nest-microservice/`, `web/`, `k8s/`). `CLAUDE.md` and the `.claude/rules/` folders govern what the resulting code must look like; this file governs what goes **into** the tool.

Anything pasted into an AI tool leaves your machine, may be kept by the vendor, and can't be recalled. Treat a prompt like a message to an external party.

## Never share
- **Credentials:** contents of `.env` / `.env.local`, database passwords, NATS credentials, `SESSION_ENCRYPTION_KEY`, the Keycloak client secret, Redis passwords, kubeconfigs, API keys, tokens, session cookies. Share the variable *name*, never the value.
- **Production data:** real rows from any service database, customer identifiers, exports.
- **Raw production or staging logs:** they routinely contain tokens, emails and connection strings.
- **Personal data:** names, email addresses, phone numbers, support ticket contents.

## Share only after masking
- Replace real values with obvious fakes: `user@example.com`, `example-customer-1`, `00000000-0000-0000-0000-000000000001`.
- Trim a log to the error class and stack frames; remove headers, query strings and payload bodies.
- Prefer test fixtures or a made-up row to an export from a real database.
- If masking takes longer than describing the problem, describe it in words.

## Safe to share
Source code in this repository, migrations and Prisma schemas, test fixtures, error messages with values removed, public documentation, and architecture questions without customer specifics.

## Reviewing AI output
- A human reads every AI-generated change before it's committed. "The tests pass" isn't a review.
- Changes touching authentication, sessions/tokens, CSRF, cookies, Server Actions, inter-service trust, raw SQL, env/config, contracts in `nest-microservice/libs/common`, or what `k8s/` exposes (Gateway routes, NetworkPolicies, Services) need an explicit review against the package's `docs/ai/code-review.md` (nest-microservice: run `/security-review`) before opening a PR.
- Don't merge generated code you can't explain.

## If something leaks
Assume the value is compromised: rotate the credential right away, tell the team lead, and record what was exposed.
