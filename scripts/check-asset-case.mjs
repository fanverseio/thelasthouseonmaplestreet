#!/usr/bin/env node
// Linux is case-sensitive, Windows is not. Fails when code names an asset file with different case
// than the file on disk. Checks full '/assets/...' paths exactly, and bare file names against the set of real names.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'apps/client/public');
const EXT = 'glb|ktx2|png|jpg|jpeg|webp|mp3|ogg|wav|mp4|webm';

function* walk(dir, skip = new Set(['node_modules', 'dist'])) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full, skip);
    else yield full;
  }
}

const real = new Set();
const realLower = new Map();
for (const file of walk(path.join(publicDir, 'assets'))) {
  const rel = path.relative(publicDir, file).split(path.sep).join('/');
  real.add('/' + rel);
  realLower.set(path.basename(file).toLowerCase(), path.basename(file));
}
const realNames = new Set([...real].map((p) => p.split('/').pop()));

const problems = [];
const srcDir = path.join(root, 'apps/client/src');
for (const file of walk(srcDir)) {
  if (!/\.(ts|tsx)$/.test(file) || /\.test\.(ts|tsx)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  const where = path.relative(root, file);
  for (const m of text.matchAll(new RegExp(`/assets/[\\w./-]+\\.(?:${EXT})\\b`, 'g'))) {
    if (!real.has(m[0])) problems.push(`${where}: ${m[0]} does not exist with this exact case`);
  }
  for (const m of text.matchAll(new RegExp(`['"\`]([\\w.-]+\\.(?:${EXT}))['"\`]`, 'g'))) {
    const name = m[1];
    if (realNames.has(name)) continue;
    const other = realLower.get(name.toLowerCase());
    if (other) problems.push(`${where}: "${name}" differs in case from file "${other}"`);
  }
}

if (problems.length) {
  console.error('Asset case check failed:\n' + problems.map((p) => '  ' + p).join('\n'));
  process.exit(1);
}
console.log(`Asset case check passed (${real.size} asset files).`);
