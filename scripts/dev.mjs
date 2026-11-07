#!/usr/bin/env node
// Starts the game client (Vite) and the local API server together, with prefixed logs.
// Ctrl+C stops both. If either one exits, the other is stopped too. No extra dependencies.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`[dev] Node ${process.versions.node} is too old. Install Node 24 LTS (22.18 minimum).`);
  process.exit(1);
}

const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    console.error(`[dev] Could not read .env: ${error.message}`);
    process.exit(1);
  }
}

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(viteBin)) {
  console.error('[dev] Dependencies are missing. Run: npm install');
  process.exit(1);
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

const services = [
  { name: 'api', code: 35, cwd: path.join(root, 'apps', 'server'), args: ['--watch', 'src/local.ts'] },
  { name: 'client', code: 36, cwd: path.join(root, 'apps', 'client'), args: [viteBin] },
];

const children = new Map();
let stopping = false;
let exitCode = 0;

function pipe(stream, prefix, target) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) target.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) target.write(`${prefix} ${buffer}\n`);
  });
}

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    // Kill the whole tree so `node --watch` cannot leave its worker holding the port.
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function stopAll(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children.values()) killTree(child);
  setTimeout(() => process.exit(exitCode), 3000).unref();
}

for (const service of services) {
  const prefix = color(service.code, `[${service.name}]`);
  const child = spawn(process.execPath, service.args, {
    cwd: service.cwd,
    env: { ...process.env, FORCE_COLOR: useColor ? '1' : '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.set(service.name, child);
  pipe(child.stdout, prefix, process.stdout);
  pipe(child.stderr, prefix, process.stderr);
  child.on('exit', (code, signal) => {
    children.delete(service.name);
    if (!stopping) {
      console.error(`[dev] ${service.name} stopped (${signal ?? `exit code ${code}`}). Stopping the other service.`);
      stopAll(code ?? 1);
    }
    if (children.size === 0) process.exit(exitCode);
  });
}

const port = process.env.PORT || '3000';
const clientPort = process.env.CLIENT_PORT || '5173';
console.log(`[dev] Starting client on http://localhost:${clientPort} and API on http://127.0.0.1:${port}. Press Ctrl+C to stop.`);

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
