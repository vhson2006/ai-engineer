// k8s/images.json is the one list of images. CI (job k8s) checks that the rest agrees with it:
// every image is in the `images:` of overlays/prod and overlays/staging (and nothing else is), is
// run by a manifest (`image: <name>`), has its Dockerfile, and a web app's `app` is a workspace.
// Plain Node, no dependencies: node k8s/scripts/images-check.mjs (repo root).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const { images } = JSON.parse(readFileSync(join(root, 'k8s/images.json'), 'utf8'));
const names = images.map((image) => image.name);
const problems = [];

/** The names under the top-level `images:` of a kustomization.yaml. */
function overlayImages(overlay) {
  const text = readFileSync(join(root, 'k8s/overlays', overlay, 'kustomization.yaml'), 'utf8');
  const block = text.split(/^images:\s*$/m)[1]?.split(/^\S/m)[0] ?? '';
  return [...block.matchAll(/^ {2}- name: ([\w-]+)/gm)].map((m) => m[1]);
}

function yamlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return yamlFiles(path);
    return /\.ya?ml$/.test(name) ? [path] : [];
  });
}

for (const overlay of ['prod', 'staging']) {
  const listed = overlayImages(overlay);
  for (const name of names) if (!listed.includes(name)) problems.push(`overlays/${overlay}: images: has no entry for ${name}`);
  for (const name of listed) if (!names.includes(name)) problems.push(`overlays/${overlay}: images: lists ${name}, which k8s/images.json doesn't have`);
}

const manifests = yamlFiles(join(root, 'k8s')).map((file) => readFileSync(file, 'utf8')).join('\n');
for (const image of images) {
  if (!new RegExp(`^\\s*image: ${image.name}\\s*$`, 'm').test(manifests)) problems.push(`${image.name}: no manifest runs it (image: ${image.name})`);
  if (!existsSync(join(root, image.dockerfile))) problems.push(`${image.name}: ${image.dockerfile} not found`);
  if (image.app && !existsSync(join(root, image.context, 'apps', image.app, 'package.json'))) problems.push(`${image.name}: app ${image.app} is not a workspace of ${image.context}/apps`);
  try {
    new RegExp(image.watch);
  } catch {
    problems.push(`${image.name}: watch is not a valid regular expression`);
  }
}

if (problems.length) {
  console.error(`images-check: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`images-check: ${names.length} images, consistent with the overlays and manifests`);
