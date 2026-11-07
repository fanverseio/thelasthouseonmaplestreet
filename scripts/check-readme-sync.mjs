#!/usr/bin/env node
// Keeps README.md and .env.example in sync with package.json scripts and the env vars the code reads.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { envNamesReadInCode, findSyncProblems } from './lib/readme-sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const SOURCE_DIRS = ['apps', 'packages', 'scripts', 'api', 'tools'];
const SKIP = new Set(['node_modules', 'dist', 'coverage', 'public', 'e2e']);
const SOURCE_EXT = /\.(?:ts|tsx|mjs|js)$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (SOURCE_EXT.test(name) && !/\.test\.(?:ts|tsx|mjs)$/.test(name)) yield full;
  }
}

const codeEnvNames = new Set();
for (const dir of SOURCE_DIRS) {
  for (const file of walk(path.join(root, dir))) {
    for (const name of envNamesReadInCode(readFileSync(file, 'utf8'))) codeEnvNames.add(name);
  }
}

const pkg = JSON.parse(read('package.json'));
const problems = findSyncProblems({
  scripts: Object.keys(pkg.scripts ?? {}),
  readme: read('README.md'),
  envExample: read('.env.example'),
  codeEnvNames: [...codeEnvNames],
});

if (problems.length > 0) {
  console.error('README / .env.example sync check failed:');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('Update README.md and .env.example in the same change (see .kiro/steering/tech.md).');
  process.exit(1);
}
console.log('README and .env.example are in sync with package.json and the code.');
