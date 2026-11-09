#!/usr/bin/env node
// ElevenLabs voice tool (asset generation only; the game never calls ElevenLabs at runtime).
// Reads ELEVENLABS_API_KEY from .env. Never prints or writes the key.
//
//   node tools/gen-voice.mjs account                 plan tier and characters left
//   node tools/gen-voice.mjs models                  text-to-speech models
//   node tools/gen-voice.mjs voices [--search word]  voices you can use (id, name, labels)
//   node tools/gen-voice.mjs sample --voice <id|character> [--model <id>] --text "..." [--name file]
//   node tools/gen-voice.mjs line <vo_line_id> [--voice <id>] [--model <id>]
//   node tools/gen-voice.mjs design --describe "..." --text "<100+ chars>" [--name prefix]   3 designed previews
//   node tools/gen-voice.mjs keep --generated <generated_voice_id> --name "TLH Felix"         save a preview as a voice
//
// Characters map to ELEVENLABS_VOICE_ID_<NAME> (ANGEL, ELENA, FELIX, GARTNER, BRIGGS, WATCHER, ROSALIND, SMOKE).
// Output: <RAW_ASSET_DIR>/vo/ (git-ignored). Approved takes are copied to apps/client/public/assets/audio/vo/ later.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));

const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY ?? '';
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const OUT_DIR = path.resolve(root, process.env.RAW_ASSET_DIR || './assets/raw', 'vo');

const VOICE_ENV = {
  angel: process.env.ELEVENLABS_VOICE_ID_ANGEL,
  elena: process.env.ELEVENLABS_VOICE_ID_ELENA,
  felix: process.env.ELEVENLABS_VOICE_ID_FELIX,
  gartner: process.env.ELEVENLABS_VOICE_ID_GARTNER,
  briggs: process.env.ELEVENLABS_VOICE_ID_BRIGGS,
  watcher: process.env.ELEVENLABS_VOICE_ID_WATCHER,
  rosalind: process.env.ELEVENLABS_VOICE_ID_ROSALIND,
  smoke: process.env.ELEVENLABS_VOICE_ID_SMOKE,
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function api(pathname, init = {}) {
  if (!KEY) fail('ELEVENLABS_API_KEY is not set in .env.');
  const res = await fetch(`${API}${pathname}`, { ...init, headers: { 'xi-api-key': KEY, ...(init.headers ?? {}) } });
  if (!res.ok) {
    // The body is ElevenLabs' error JSON; it never contains the key.
    const body = (await res.text()).slice(0, 300);
    fail(`ElevenLabs ${res.status} on ${pathname}: ${body}`);
  }
  return res;
}

/** Character name or raw voice id -> voice id. */
function resolveVoice(value) {
  if (!value) return undefined;
  const mapped = VOICE_ENV[value.toLowerCase()];
  if (mapped) return mapped;
  if (value.toLowerCase() in VOICE_ENV) fail(`No voice set for "${value}". Set ELEVENLABS_VOICE_ID_${value.toUpperCase()} in .env, or pass a voice id.`);
  return value;
}

async function speak(voiceId, text, model, fileName) {
  const res = await api(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model }),
  });
  const audio = Buffer.from(await res.arrayBuffer());
  mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, fileName.endsWith('.mp3') ? fileName : `${fileName}.mp3`);
  writeFileSync(file, audio);
  console.log(`Saved ${path.relative(root, file)} (${Math.round(audio.length / 1024)} KB, ${text.length} chars, model ${model}).`);
}

const safeName = (s) => s.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 60);

const [command] = process.argv.slice(2);
switch (command) {
  case 'account': {
    const s = await (await api('/v1/user/subscription')).json();
    console.log(`Tier: ${s.tier}. Characters used ${s.character_count} of ${s.character_limit} (${s.character_limit - s.character_count} left).`);
    if (s.next_character_count_reset_unix) console.log(`Resets: ${new Date(s.next_character_count_reset_unix * 1000).toISOString().slice(0, 10)}.`);
    console.log(`Voice cloning allowed: ${Boolean(s.can_use_instant_voice_cloning)}.`);
    break;
  }
  case 'models': {
    const models = await (await api('/v1/models')).json();
    for (const m of models.filter((x) => x.can_do_text_to_speech)) {
      console.log(`${m.model_id.padEnd(30)} ${m.name}${m.model_id === DEFAULT_MODEL ? '  (default)' : ''}`);
    }
    break;
  }
  case 'voices': {
    const search = arg('search');
    const q = new URLSearchParams({ page_size: '100', ...(search && { search }) });
    const data = await (await api(`/v2/voices?${q}`)).json();
    for (const v of data.voices ?? []) {
      const l = v.labels ?? {};
      const tags = [l.gender, l.age, l.accent, l.description ?? l.descriptive, l.use_case ?? l.use_cases].filter(Boolean).join(', ');
      console.log(`${v.voice_id}  ${String(v.name).padEnd(28)} ${v.category ?? ''}  ${tags}`);
    }
    console.log(`${(data.voices ?? []).length} voices.`);
    break;
  }
  case 'sample': {
    const voice = resolveVoice(arg('voice'));
    const text = arg('text');
    if (!voice || !text) fail('Usage: sample --voice <id|character> --text "..." [--model <id>] [--name file]');
    const model = arg('model') ?? DEFAULT_MODEL;
    await speak(voice, text, model, arg('name') ?? `sample_${safeName(arg('voice'))}_${safeName(model)}`);
    break;
  }
  case 'line': {
    const lineId = process.argv[3];
    if (!lineId?.startsWith('vo_')) fail('Usage: line <vo_line_id> [--voice <id|character>] [--model <id>]');
    const { getLine } = await import('../apps/client/src/content/dialogue/index.ts');
    const line = getLine(lineId);
    if (!line) fail(`Unknown line id: ${lineId}`);
    const voice = resolveVoice(arg('voice') ?? line.speaker);
    const model = arg('model') ?? DEFAULT_MODEL;
    await speak(voice, line.text, model, lineId);
    break;
  }
  case 'library': {
    // The public Voice Library (community voices). `add` copies one into the account so it can be used.
    const q = new URLSearchParams({ page_size: '30', ...(arg('search') && { search: arg('search') }), ...(arg('age') && { age: arg('age') }), ...(arg('gender') && { gender: arg('gender') }), ...(arg('accent') && { accent: arg('accent') }), ...(arg('use') && { use_cases: arg('use') }) });
    const data = await (await api(`/v1/shared-voices?${q}`)).json();
    for (const v of data.voices ?? []) {
      console.log(`${v.voice_id}  owner=${v.public_owner_id}  ${String(v.name).slice(0, 34).padEnd(34)} ${[v.gender, v.age, v.accent, v.use_case].filter(Boolean).join(', ')}`);
    }
    console.log(`${(data.voices ?? []).length} voices.`);
    break;
  }
  case 'add': {
    const owner = arg('owner');
    const id = arg('id');
    const name = arg('name');
    if (!owner || !id || !name) fail('Usage: add --owner <public_owner_id> --id <voice_id> --name "TLH Felix"');
    const res = await api(`/v1/voices/add/${encodeURIComponent(owner)}/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: name }),
    });
    console.log(`Added "${name}": ${(await res.json()).voice_id}`);
    break;
  }
  case 'remove': {
    // Delete a voice from the account (frees a custom voice slot). Premade voices cannot be removed.
    const id = arg('id');
    if (!id) fail('Usage: remove --id <voice_id>');
    await api(`/v1/voices/${encodeURIComponent(id)}`, { method: 'DELETE' });
    console.log(`Removed voice ${id}.`);
    break;
  }
  case 'design': {
    // Voice Design: a text description -> 3 preview voices (saved as mp3); keep one with `keep`.
    const description = arg('describe');
    const text = arg('text');
    if (!description || !text || text.length < 100) fail('Usage: design --describe "..." --text "<at least 100 chars>" [--name prefix]');
    const res = await api('/v1/text-to-voice/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_description: description, text, model_id: arg('model') ?? 'eleven_multilingual_ttv_v2' }),
    });
    const data = await res.json();
    mkdirSync(OUT_DIR, { recursive: true });
    const prefix = safeName(arg('name') ?? 'design');
    (data.previews ?? []).forEach((p, i) => {
      const file = path.join(OUT_DIR, `${prefix}_${i + 1}.mp3`);
      writeFileSync(file, Buffer.from(p.audio_base_64, 'base64'));
      console.log(`Preview ${i + 1}: ${path.relative(root, file)}  generated_voice_id=${p.generated_voice_id}`);
    });
    break;
  }
  case 'keep': {
    // Save a designed preview as a permanent voice in the account; prints the new voice id.
    const generated = arg('generated');
    const name = arg('name');
    if (!generated || !name) fail('Usage: keep --generated <generated_voice_id> --name "TLH Felix" [--describe "..."]');
    const res = await api('/v1/text-to-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_name: name, voice_description: arg('describe') ?? name, generated_voice_id: generated }),
    });
    const v = await res.json();
    console.log(`Saved voice "${name}": ${v.voice_id}`);
    break;
  }
  default:
    console.log('Commands: account, models, voices [--search word], sample, line, design, keep. See the header of tools/gen-voice.mjs.');
}
