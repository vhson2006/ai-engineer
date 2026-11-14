// The public origin a Next.js image is built for (SITE_URL, ADR 0021): its `siteUrl` in
// k8s/images.json names a key of the environment's urls.env, e.g. "{NAILS_URL}". The ONE place a
// host is written stays urls.env (route, APP_URL, Keycloak redirects AND the baked SITE_URL): moving
// a site to its own domain is a urls.env change. Used by images-plan.mjs, staging.sh, images-check.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');

/** KEY=value pairs of k8s/overlays/<env>/urls.env. */
export function urls(env) {
  const file = join(root, 'k8s/overlays', env, 'urls.env');
  if (!existsSync(file)) throw new Error(`no ${file}`);
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );
}

/** The image's SITE_URL in `env` ('' when it bakes none); throws on a key urls.env lacks. */
export function siteUrl(image, env) {
  if (!image.siteUrl) return '';
  const values = urls(env);
  return image.siteUrl.replace(/\{([A-Z0-9_]+)\}/g, (_, key) => {
    if (!values[key]) throw new Error(`${image.name}: siteUrl needs ${key}, which overlays/${env}/urls.env doesn't have`);
    return values[key];
  });
}
