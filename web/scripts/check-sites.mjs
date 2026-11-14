// Every business site (an app that depends on @web/site-kit, ADR 0042/0045) keeps the same shape,
// and never re-implements what the kit already does. Run by `npm run check` (CI): a site that
// fails names the file to add or remove. Plain Node, no dependencies.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const apps = join(import.meta.dirname, '..', 'apps');

/** Each site's own files: its facts, its configuration, the kit bound to it, its words. */
const REQUIRED = ['src/content/business.ts', 'src/website.ts', ['src/site.ts', 'src/site.tsx'], 'src/i18n/dictionaries.ts', 'src/proxy.ts', 'src/app/sitemap.ts', 'src/app/robots.ts', 'src/app/[lang]/not-found.tsx'];

/** What the kit does: a copy would drift (SEO, legal texts, articles, languages). */
const FORBIDDEN = [
  ['src/seo.ts', 'page metadata and JSON-LD: site.pageMetadata / site.structuredData'],
  ['src/i18n/locales.ts', 'languages: @web/site-kit/locales and defineWebsite (src/website.ts)'],
  ['src/i18n/messages.ts', 'getLocale/getMessages: site.getLocale / site.getMessages'],
  ['src/features/articles', 'the articles pages: site.routes.articlesIndex / topic / article'],
  ['src/features/legal', 'the legal pages: site.routes.legal(page)'],
];

/** Imports that bypass the kit (it reads the API and builds the metadata for the site). */
const FORBIDDEN_IMPORTS = [
  ['@web/core/content/site-articles', 'the site’s articles: site.articles / site.latestArticles'],
  ['@web/core/i18n/seo', 'page metadata: site.pageMetadata'],
];

/** The shared routes are one-line re-exports of the kit's (site.routes.*). */
const KIT_ROUTE = /site\.routes\./;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const problems = [];
const sites = readdirSync(apps).filter((name) => {
  const manifest = join(apps, name, 'package.json');
  return existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).dependencies?.['@web/site-kit'];
});

for (const name of sites) {
  const root = join(apps, name);
  const has = (path) => existsSync(join(root, path));
  for (const entry of REQUIRED) {
    const options = [entry].flat();
    if (!options.some(has)) problems.push(`${name}: missing ${options.join(' or ')}`);
  }
  for (const [path, instead] of FORBIDDEN) {
    if (has(path)) problems.push(`${name}: remove ${path} (the kit has it: ${instead})`);
  }
  const sources = files(join(root, 'src')).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const [module, instead] of FORBIDDEN_IMPORTS) {
      if (text.includes(`'${module}'`)) problems.push(`${name}: ${relative(root, file)} imports ${module} (use ${instead})`);
    }
  }
  if (!readFileSync(join(root, 'src/proxy.ts'), 'utf8').includes('siteProxy(')) problems.push(`${name}: src/proxy.ts must be the kit's siteProxy(website.routing)`);
  for (const route of ['sitemap.ts', 'robots.ts', '[lang]/not-found.tsx']) {
    const file = join(root, 'src/app', route);
    if (existsSync(file) && !KIT_ROUTE.test(readFileSync(file, 'utf8'))) problems.push(`${name}: src/app/${route} must re-export site.routes`);
  }
}

if (problems.length) {
  console.error(`check:sites: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`check:sites: ${sites.length} business sites on @web/site-kit (${sites.join(', ')})`);
