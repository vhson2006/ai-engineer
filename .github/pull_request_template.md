## What and why

<!-- One or two sentences. Link the issue or ADR if there is one. -->

## Checklist

- [ ] Complete across every part it touches (root `CLAUDE.md` rule 6): contract, service route,
      KrakenD endpoint (+ forwarded headers/query strings), web helper, tests on both sides
- [ ] No secret, token or personal data in code, logs, metric labels or span attributes
- [ ] Docs, rules and ADRs updated in the same change if a convention or decision changed
- [ ] Tried locally (dev or `npm run staging:up`) when behaviour changed
