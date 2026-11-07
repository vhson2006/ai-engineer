// Runs the dev server of every web app at once, with prefixed, colored output:
//   npm run dev                   all apps (portfolio-web :3000, admin-web :3100)
//   npm run dev -- admin-web      only the apps named
// Ctrl+C (or one app exiting) stops them all, child processes included (Windows too).
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const all = readdirSync(join(root, 'apps')).filter((name) => existsSync(join(root, 'apps', name, 'package.json')));
const wanted = process.argv.slice(2);
const apps = wanted.length ? all.filter((name) => wanted.includes(name)) : all;
if (apps.length === 0) {
  console.error(`No app matches ${wanted.join(', ')}. Apps: ${all.join(', ')}`);
  process.exit(1);
}

const COLORS = [36, 35, 33, 32, 34]; // cyan, magenta, yellow, green, blue
const width = Math.max(...apps.map((name) => name.length));
const children = [];
let stopping = false;

for (const [index, app] of apps.entries()) {
  const prefix = `\x1b[${COLORS[index % COLORS.length]}m${app.padEnd(width)} │\x1b[0m `;
  // One command string (app names are folder names): npm is npm.cmd on Windows, so a shell is needed.
  const child = spawn(`npm run dev -w ${app}`, {
    cwd: root,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const pipe = (stream, target) => {
    let rest = '';
    stream.on('data', (chunk) => {
      const lines = (rest + chunk).split(/\r?\n/);
      rest = lines.pop() ?? '';
      for (const line of lines) target.write(prefix + line + '\n');
    });
    stream.on('end', () => rest && target.write(prefix + rest + '\n'));
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`${prefix}exited (${code ?? 'signal'}): stopping the others`);
      stop(code ?? 1);
    }
  });
  children.push(child);
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // On Windows, killing the shell leaves `next dev` running: kill the whole process tree.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
