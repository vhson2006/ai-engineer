#!/usr/bin/env node
// Runs a k8s/scripts/*.sh script with the RIGHT bash, from the npm scripts in the root package.json:
//   node k8s/scripts/sh.mjs k8s/scripts/port-forward.sh [args...]
//
// Why: npm runs scripts through cmd.exe on Windows, where `bash` often resolves to WSL
// (C:\Windows\System32\bash.exe or WindowsApps\bash.exe). Inside the WSL distro there is usually
// no kubectl, or a different kubeconfig, so the scripts fail ("kubectl: command not found") or
// talk to the wrong cluster. On Windows we use Git Bash; elsewhere, plain `bash`.
// Override with K8S_BASH=/path/to/bash if needed.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function findBash() {
  if (process.env.K8S_BASH) return process.env.K8S_BASH;
  if (process.platform !== 'win32') return 'bash';
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs')];
  for (const root of roots.filter(Boolean)) {
    const candidate = join(root, 'Git', 'bin', 'bash.exe');
    if (existsSync(candidate)) return candidate;
  }
  console.error('Git Bash not found. Install Git for Windows, set K8S_BASH, or use the PowerShell script (k8s/scripts/port-forward.ps1).');
  process.exit(1);
}

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error('usage: node k8s/scripts/sh.mjs <script.sh> [args...]');
  process.exit(2);
}

const child = spawn(findBash(), [script, ...args], { stdio: 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
// Ctrl+C reaches the whole console group (bash runs its own cleanup trap); just wait for it.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
