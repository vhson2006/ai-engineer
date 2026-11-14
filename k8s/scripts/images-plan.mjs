// Which images of k8s/images.json to build, as a GitHub Actions matrix (JSON on stdout). The ONE
// place that decides it, for .github/workflows/ci.yml (a pull request: build, no push) and
// images.yml (main: build, push, bump the prod tags). Plain Node + git, no dependencies.
//
//   node k8s/scripts/images-plan.mjs --since <ref>     images whose watched files changed since <ref>
//   node k8s/scripts/images-plan.mjs --since-deployed  per image, since the commit prod runs (its newTag
//                                                      in overlays/prod); a placeholder tag = changed
//   node k8s/scripts/images-plan.mjs --all             every image
// Options: --env prod|staging (only the images that run there, their SITE_URL from that
// environment's urls.env; default: all, SITE_URL of prod), --registry <prefix> (default local).
// An image of a `group` (the API images, one commit) pulls in the rest of its group. Changes to docs
// (*.md, docs/, .claude/) never count.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { siteUrl } from './site-url.mjs';

const root = join(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const env = option('env');
const registry = option('registry', 'local');
const { images } = JSON.parse(readFileSync(join(root, 'k8s/images.json'), 'utf8'));
const candidates = images.filter((image) => !env || (image.environments ?? ['prod', 'staging']).includes(env));

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
const isCommit = (ref) => {
  try {
    git('cat-file', '-e', `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};
const changedFiles = (ref) =>
  git('diff', '--name-only', ref, 'HEAD')
    .split('\n')
    .filter((file) => file && !/\.md$|(^|\/)docs\/|(^|\/)\.claude\//.test(file));
const touches = (image, files) => files.some((file) => new RegExp(image.watch).test(file));

/** The commit prod runs for an image: its newTag in overlays/prod/kustomization.yaml. */
function deployedTag(name) {
  const text = readFileSync(join(root, 'k8s/overlays/prod/kustomization.yaml'), 'utf8');
  const match = text.match(new RegExp(`- name: ${name}\\n(?:\\s+#.*\\n)*\\s+newName: [^\\n]+\\n(?:\\s+#.*\\n)*\\s+newTag: ([\\w.-]+)`));
  return match?.[1];
}

let changed;
if (args.includes('--all')) {
  changed = candidates;
} else if (args.includes('--since-deployed')) {
  changed = candidates.filter((image) => {
    const tag = deployedTag(image.name);
    return !tag || !isCommit(tag) || touches(image, changedFiles(tag));
  });
} else {
  const since = option('since');
  if (!since) throw new Error('give --since <ref>, --since-deployed or --all');
  const files = changedFiles(since);
  changed = candidates.filter((image) => touches(image, files));
}

const groups = new Set(changed.map((image) => image.group).filter(Boolean));
const matrix = candidates
  .filter((image) => changed.includes(image) || (image.group && groups.has(image.group)))
  .map((image) => ({
    name: image.name,
    context: image.context,
    file: image.dockerfile,
    target: image.target ?? '',
    args: [image.app && `APP=${image.app}`, image.siteUrl && `SITE_URL=${siteUrl(image, env ?? 'prod')}`].filter(Boolean).join('\n'),
    image: `${registry}/${image.name}`,
  }));
process.stdout.write(`${JSON.stringify(matrix)}\n`);
