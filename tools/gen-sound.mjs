#!/usr/bin/env node
// ElevenLabs sound effects and ambience loops (asset generation only; the game never calls ElevenLabs at runtime).
// Reads ELEVENLABS_API_KEY from .env. Never prints or writes the key.
//
//   node tools/gen-sound.mjs list [--only <prefix>]                 every cue: id, seconds, loop, bus, file state
//   node tools/gen-sound.mjs dry-run [--only <prefix>] [--force]    what `all` would generate and its credit estimate
//   node tools/gen-sound.mjs all [--only <prefix>] [--force] [--max-credits <n>]
//        generates every missing cue (skips cues whose final file exists unless --force); stops on the first API error
//   node tools/gen-sound.mjs one <cue_id> [--force]                 one cue
//   node tools/gen-sound.mjs account                                credits used and left
//
// Endpoint: POST /v1/sound-generation (text, duration_seconds, prompt_influence, loop, model eleven_text_to_sound_v2).
// Estimate: 40 credits per second of requested audio. --max-credits (default 25000) refuses a batch above that.
// Format: mp3_44100_64 for sfx, mp3_44100_128 for ambience. Raw takes: <RAW_ASSET_DIR>/sfx (git-ignored), then copied to
// apps/client/public/assets/audio/{sfx,amb}/<id>.mp3. The credit counter on the account lags, so the final read waits ~20 s.
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREDITS_PER_SECOND, cueFolder, MAX_SECONDS, MIN_SECONDS, SOUND_CUES } from './sound-cues.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));

const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY ?? '';
const MODEL = 'eleven_text_to_sound_v2';
const RAW_DIR = path.resolve(root, process.env.RAW_ASSET_DIR || './assets/raw', 'sfx');
const PUBLISH_ROOT = path.join(root, 'apps/client/public/assets/audio');
const FORMAT = { sfx: 'mp3_44100_64', amb: 'mp3_44100_128' };
const DEFAULT_MAX_CREDITS = 25000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const credits = (cue) => Math.round(cue.seconds * CREDITS_PER_SECOND);
const finalFile = (cue) => path.join(PUBLISH_ROOT, cueFolder(cue), `${cue.id}.mp3`);
const done = (cue) => existsSync(finalFile(cue)) && statSync(finalFile(cue)).size > 0;

function validate() {
  const seen = new Set();
  for (const c of SOUND_CUES) {
    if (!/^(sfx|amb)_[a-z0-9_]+$/.test(c.id)) fail(`Bad cue id: ${c.id}`);
    if (seen.has(c.id)) fail(`Duplicate cue id: ${c.id}`);
    seen.add(c.id);
    if (!(c.seconds >= MIN_SECONDS && c.seconds <= MAX_SECONDS)) fail(`${c.id}: seconds must be ${MIN_SECONDS}..${MAX_SECONDS}`);
    if ((c.bus === 'amb') !== c.id.startsWith('amb_')) fail(`${c.id}: bus does not match the id prefix`);
  }
}

async function api(pathname, init = {}) {
  if (!KEY) fail('ELEVENLABS_API_KEY is not set in .env.');
  const res = await fetch(`${API}${pathname}`, { ...init, headers: { 'xi-api-key': KEY, ...(init.headers ?? {}) } });
  if (!res.ok) {
    // The body is ElevenLabs' error JSON; it never contains the key.
    fail(`ElevenLabs ${res.status} on ${pathname}: ${(await res.text()).slice(0, 300)}`);
  }
  return res;
}

async function usage(label) {
  const s = await (await api('/v1/user/subscription')).json();
  console.log(`${label}: tier ${s.tier}, credits used ${s.character_count} of ${s.character_limit} (${s.character_limit - s.character_count} left).`);
  return s.character_count;
}

function select() {
  const only = arg('only')?.toLowerCase();
  return SOUND_CUES.filter((c) => !only || c.id.toLowerCase().startsWith(only));
}

async function generate(cue) {
  const format = FORMAT[cue.bus];
  const body = { text: cue.prompt, duration_seconds: cue.seconds, prompt_influence: cue.influence ?? 0.5, model_id: MODEL };
  if (cue.loop) body.loop = true;
  const res = await api(`/v1/sound-generation?output_format=${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body),
  });
  const audio = Buffer.from(await res.arrayBuffer());
  mkdirSync(RAW_DIR, { recursive: true });
  const raw = path.join(RAW_DIR, `${cue.id}.mp3`);
  writeFileSync(raw, audio);
  mkdirSync(path.dirname(finalFile(cue)), { recursive: true });
  copyFileSync(raw, finalFile(cue));
  console.log(`Saved ${cue.id} (${Math.round(audio.length / 1024)} KB, ${cue.seconds}s${cue.loop ? ', loop' : ''}, ${format}).`);
}

function plan() {
  const picked = select();
  const todo = picked.filter((c) => flag('force') || !done(c));
  const cost = todo.reduce((n, c) => n + credits(c), 0);
  return { picked, todo, cost };
}

validate();
const [command] = process.argv.slice(2);
switch (command) {
  case 'list': {
    for (const c of select()) console.log(`${c.id.padEnd(30)} ${String(c.seconds).padStart(4)} s  ${c.loop ? 'loop' : '    '}  ${c.bus}  ${done(c) ? 'done' : 'missing'}`);
    const { picked, todo, cost } = plan();
    console.log(`${picked.length} cues, ${picked.length - todo.length} done, ${todo.length} to generate (about ${cost} credits).`);
    break;
  }
  case 'dry-run': {
    const { picked, todo, cost } = plan();
    for (const c of todo) console.log(`  ${c.id} ${c.seconds}s -> ${credits(c)} credits`);
    console.log(`${picked.length} cues selected, ${todo.length} to generate, estimate ${cost} credits at ${CREDITS_PER_SECOND} per second (max ${arg('max-credits') ?? DEFAULT_MAX_CREDITS}).`);
    break;
  }
  case 'account':
    await usage('Account');
    break;
  case 'one': {
    const id = process.argv[3];
    const cue = SOUND_CUES.find((c) => c.id === id);
    if (!cue) fail(`Unknown cue id: ${id ?? '(none)'}. See: node tools/gen-sound.mjs list`);
    if (done(cue) && !flag('force')) fail(`${id} already exists. Use --force to regenerate.`);
    const before = await usage('Before');
    await generate(cue);
    await sleep(20000);
    const after = await usage('After');
    console.log(`Used ${after - before} credits (estimate ${credits(cue)}).`);
    break;
  }
  case 'all': {
    const { picked, todo, cost } = plan();
    const max = Number(arg('max-credits') ?? DEFAULT_MAX_CREDITS);
    console.log(`${picked.length} cues selected, ${todo.length} to generate (${picked.length - todo.length} already done), estimate ${cost} credits.`);
    if (cost > max) fail(`${cost} credits exceed the budget of ${max} (--max-credits). Nothing was generated.`);
    if (todo.length === 0) break;
    const before = await usage('Before');
    let n = 0;
    for (const c of todo) {
      await generate(c); // stops the run on the first API error (api() exits)
      n++;
      await sleep(300);
    }
    console.log(`Generated ${n} cues. Waiting 20 s for the usage counter...`);
    await sleep(20000);
    const after = await usage('After');
    console.log(`Used ${after - before} credits (estimate ${cost}).`);
    break;
  }
  default:
    console.log('Commands: list, dry-run, all, one <cue_id>, account. See the header of tools/gen-sound.mjs.');
}
