#!/usr/bin/env node
// Makes the ACCESS_CODE_HASHES entry for the AI login pair in .env (PASSPHRASE_01 + PASSPHRASE_02,
// or the lower-case names). Hash = sha256(passphrase1 + "\n" + passphrase2), the same as the server.
// Writes `label:sha256hex` to asset_creation/access-hashes.txt (gitignored). Prints only the file path,
// never a passphrase or hash, so nothing secret lands in a terminal log.
// Usage: node tools/hash-access-code.mjs [label]   (label default: judges)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const p1 = (process.env.passphrase_01 ?? process.env.PASSPHRASE_01 ?? '').trim();
const p2 = (process.env.passphrase_02 ?? process.env.PASSPHRASE_02 ?? '').trim();
if (!p1 || !p2) {
  console.error('Set PASSPHRASE_01 and PASSPHRASE_02 in .env first.');
  process.exit(1);
}
const label = (process.argv[2] ?? 'judges').trim();
if (!/^[a-z0-9_-]{1,32}$/i.test(label)) {
  console.error('Label: letters, digits, _ or -, up to 32 characters.');
  process.exit(1);
}
const hash = createHash('sha256').update(`${p1}\n${p2}`, 'utf8').digest('hex');
const outDir = path.join(root, 'asset_creation');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'access-hashes.txt');
writeFileSync(out, `${label}:${hash}\n`, { mode: 0o600 });
console.log(`Wrote the ACCESS_CODE_HASHES value to ${path.relative(root, out)} (gitignored). Paste its line into Vercel.`);
