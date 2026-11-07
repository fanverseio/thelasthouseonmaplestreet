#!/usr/bin/env node
// Fails if tracked or staged files contain credentials, or if a real .env file is tracked or staged.
// Usage: node scripts/check-secrets.mjs            (tracked + staged files)
//        node scripts/check-secrets.mjs --staged   (staged files only, for pre-commit use)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNonEmptySecretsInEnvExample, isForbiddenEnvFile, scanText } from './lib/secret-patterns.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagedOnly = process.argv.includes('--staged');
const MAX_BYTES = 1024 * 1024;

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
const files = new Set(stagedOnly ? staged : [...git(['ls-files']), ...staged]);

const problems = [];
for (const file of files) {
  if (isForbiddenEnvFile(file)) {
    problems.push(`${file}: environment files with real values must not be committed (only .env.example)`);
    continue;
  }
  const full = path.join(root, file);
  if (!existsSync(full) || statSync(full).size > MAX_BYTES) continue;
  const text = readFileSync(full, 'utf8');
  if (text.includes('\u0000')) continue; // binary
  for (const finding of scanText(text)) problems.push(`${file}:${finding.line}: possible ${finding.name}`);
  if (path.basename(file) === '.env.example') {
    for (const finding of findNonEmptySecretsInEnvExample(text)) {
      problems.push(`${file}:${finding.line}: ${finding.name} must be empty in .env.example`);
    }
  }
}

if (problems.length > 0) {
  console.error('Secret scan failed:');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('Remove the value, rotate the credential if it was real, and keep secrets in .env only.');
  process.exit(1);
}
console.log(`Secret scan passed (${files.size} files).`);
