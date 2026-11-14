// Deletes the customers' accounts never activated (ADR 0050): in every realm site-<id> this
// environment runs, an account whose e-mail is still unverified (Keycloak's VERIFY_EMAIL pending)
// and that was created more than MAX_AGE_HOURS ago. Someone who registered another person's
// address loses that account before its owner could be tricked into activating it; a real
// customer who never clicked registers again. Run by the CronJob unverified-cleanup (base).
//
// The realms: the files customers-<id>.json of ConfigMap keycloak-config (mounted on /config), the
// same files the Job keycloak-config applies. Each realm's client "unverified-cleanup" (service
// account: query-users, view-users, manage-users; k8s/scripts/sites.mjs) signs in with
// UNVERIFIED_CLEANUP_CLIENT_SECRET. Logs counts and user ids, never an e-mail address.
// Plain Node, no dependencies. DRY_RUN=true lists without deleting.
import { readdirSync, readFileSync } from 'node:fs';

const KEYCLOAK_URL = required('KEYCLOAK_URL');
const SECRET = required('UNVERIFIED_CLEANUP_CLIENT_SECRET');
const MAX_AGE_HOURS = Number(process.env.MAX_AGE_HOURS ?? 24);
const DRY_RUN = process.env.DRY_RUN === 'true';
const CONFIG_DIR = process.env.CONFIG_DIR ?? '/config';
const PAGE = 100;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

async function token(realm) {
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: 'unverified-cleanup', client_secret: SECRET });
  return (await call(`${KEYCLOAK_URL}/realms/${realm}/protocol/openid-connect/token`, { method: 'POST', body })).access_token;
}

/** Every account of the realm that is unverified, waits for VERIFY_EMAIL and is older than the cutoff. */
async function expired(realm, headers, cutoff) {
  const found = [];
  for (let first = 0; ; first += PAGE) {
    const users = await call(`${KEYCLOAK_URL}/admin/realms/${realm}/users?emailVerified=false&briefRepresentation=false&first=${first}&max=${PAGE}`, { headers });
    for (const user of users) {
      const waiting = !user.emailVerified && (user.requiredActions ?? []).includes('VERIFY_EMAIL');
      if (waiting && !user.serviceAccountClientId && user.createdTimestamp < cutoff) found.push(user);
    }
    if (users.length < PAGE) return found; // collected first: deleting while paging would skip some
  }
}

const realms = readdirSync(CONFIG_DIR)
  .filter((name) => /^customers-[\w-]+\.json$/.test(name))
  .map((name) => JSON.parse(readFileSync(`${CONFIG_DIR}/${name}`, 'utf8')).realm)
  .sort();
const cutoff = Date.now() - MAX_AGE_HOURS * 3_600_000;
let failed = 0;
for (const realm of realms) {
  try {
    const headers = { authorization: `Bearer ${await token(realm)}` };
    const users = await expired(realm, headers, cutoff);
    for (const user of users) {
      if (!DRY_RUN) await call(`${KEYCLOAK_URL}/admin/realms/${realm}/users/${user.id}`, { method: 'DELETE', headers });
      console.log(`${realm}: ${DRY_RUN ? 'would delete' : 'deleted'} ${user.id} (created ${new Date(user.createdTimestamp).toISOString()})`);
    }
    console.log(`${realm}: ${users.length} account(s) never activated within ${MAX_AGE_HOURS} h${DRY_RUN ? ' (dry run)' : ''}`);
  } catch (error) {
    failed++;
    console.error(`${realm}: ${error.message}`); // the other realms still run
  }
}
if (!realms.length) console.log(`no customers-<id>.json in ${CONFIG_DIR}: nothing to do`);
process.exitCode = failed ? 1 : 0;
