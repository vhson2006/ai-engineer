// Local staging mirrors prod (ADR 0018): the same settings, other values. CI (job k8s) refuses a
// key that one of overlays/staging and overlays/prod has and the other doesn't (env/<app>.env,
// urls.env), unless it is listed below WITH its reason. Plain Node: node k8s/scripts/env-parity.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const overlays = join(import.meta.dirname, '..', 'overlays');

/** Keys only one environment has, and why. `*` = every file. */
const ONLY = {
  staging: {
    '*': { NODE_EXTRA_CA_CERTS: 'trusts the local CA (staging: cert-manager with a private CA)' },
    'deployment-service.env': {
      STORAGE_ENDPOINT: 'SeaweedFS in the cluster (prod: the provider default, DigitalOcean Spaces)',
      STORAGE_FORCE_PATH_STYLE: 'SeaweedFS needs path-style bucket URLs',
    },
    'content-service.env': {
      STORAGE_ENDPOINT: 'SeaweedFS in the cluster',
      STORAGE_FORCE_PATH_STYLE: 'SeaweedFS needs path-style bucket URLs',
    },
    'ai-service.env': {
      STORAGE_ENDPOINT: 'SeaweedFS in the cluster',
      STORAGE_FORCE_PATH_STYLE: 'SeaweedFS needs path-style bucket URLs',
    },
    'render-worker.env': { RENDER_IGNORE_CERT_ERRORS: "headless Chrome doesn't read NODE_EXTRA_CA_CERTS: the local CA" },
    'urls.env': { '/^[A-Z]+_(HOST|URL)$/': 'the business sites staging runs (k8s/sites); prod runs none yet' },
  },
  prod: {
    'deployment-service.env': {
      PGSSLMODE: 'managed Postgres over verified TLS',
      STORAGE_PUBLIC_OBJECT_ACL: 'Spaces publishes objects one by one (public-read)',
    },
    'content-service.env': { PGSSLMODE: 'managed Postgres over verified TLS', STORAGE_PUBLIC_OBJECT_ACL: 'Spaces: public-read objects' },
    'ai-service.env': { PGSSLMODE: 'managed Postgres over verified TLS', STORAGE_PUBLIC_OBJECT_ACL: 'Spaces: public-read objects' },
    'render-worker.env': {
      STORAGE_PUBLIC_OBJECT_ACL: 'Spaces: public-read objects',
      RENDER_ACK_WAIT_MS: 'prod sizing of the render queue; staging keeps the default',
    },
  },
};

const keys = (file) =>
  existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => line.slice(0, line.indexOf('=')))
    : null;

function allowed(env, file, key) {
  const rules = { ...ONLY[env]['*'], ...ONLY[env][file] };
  return Object.keys(rules).some((rule) => (rule.startsWith('/') ? new RegExp(rule.slice(1, -1)).test(key) : rule === key));
}

const files = [...new Set(['urls.env', ...['staging', 'prod'].flatMap((env) => readdirSync(join(overlays, env, 'env')).map((name) => `env/${name}`))])];
const problems = [];
for (const file of files) {
  const staging = keys(join(overlays, 'staging', file));
  const prod = keys(join(overlays, 'prod', file));
  if (!staging || !prod) {
    problems.push(`${file}: exists in ${staging ? 'staging' : 'prod'} only`);
    continue;
  }
  const name = file.replace(/^env\//, '');
  for (const key of staging) if (!prod.includes(key) && !allowed('staging', name, key)) problems.push(`${file}: ${key} in staging only`);
  for (const key of prod) if (!staging.includes(key) && !allowed('prod', name, key)) problems.push(`${file}: ${key} in prod only`);
}

// An exception nothing needs any more is removed: the list stays the truth.
for (const [env, other] of [['staging', 'prod'], ['prod', 'staging']]) {
  for (const [name, rules] of Object.entries(ONLY[env])) {
    const targets = name === '*' ? files.map((file) => file.replace(/^env\//, '')) : [name];
    for (const key of Object.keys(rules).filter((rule) => !rule.startsWith('/'))) {
      const used = targets.some((target) => {
        const file = target === 'urls.env' ? target : `env/${target}`;
        const mine = keys(join(overlays, env, file)) ?? [];
        const theirs = keys(join(overlays, other, file)) ?? [];
        return mine.includes(key) && !theirs.includes(key);
      });
      if (!used) problems.push(`ONLY.${env}['${name}'].${key}: no longer a difference, remove it`);
    }
  }
}

if (problems.length) {
  console.error(
    `env-parity: ${problems.length} difference(s) between staging and prod. Add the key to the other ` +
      `environment, or to ONLY in k8s/scripts/env-parity.mjs with the reason:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(`env-parity: ${files.length} files, staging and prod have the same settings (explained exceptions aside)`);
