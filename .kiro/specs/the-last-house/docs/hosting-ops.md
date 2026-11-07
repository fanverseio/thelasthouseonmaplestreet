# Hosting and Ops

## 1. Requirements
- Hosted on Vercel through the end of the judging stage.
- Classic Mode needs no login and starts immediately.
- AI-Enhanced Mode is unlocked by a private access code given to judges in the Devpost form.
- The provider key stays server-side. One fixed provider. No client-supplied URLs or keys.
- Quotas, rate limits, concurrency limits and a global spend ceiling persist across restarts and refreshes.
- Any failure falls back to Classic Mode without losing progress.
- Out of scope: Google OAuth, registration, daily free credits, cloud saves.

## 2. Topology
```
Vercel project (repo root)
  static: apps/client/dist  (Vite build)
  functions: /api/*.ts -> apps/server/src/handlers/*
  env: LLM_*, ACCESS_CODE_HASHES, SESSION_SECRET, UPSTASH_*, limits, ELEVENLABS_* (optional)
Upstash Redis (Vercel Marketplace integration)
LLM provider (fixed by env)
```
- `vercel.json` sets the build command, output directory and per-function `maxDuration` (30 s for chat and TTS).
- The Marketplace integration may inject `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The server reads `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` and falls back to the `KV_*` names.

## 3. Access codes
- 8 codes by default (one per judge, plus spares). Each is 20+ random characters, generated locally.
- `tools/hash-access-code` (planned) prints `label:sha256hex` for a code. Only these pairs go into `ACCESS_CODE_HASHES`. Plain codes go only into the Devpost form.
- Redeem: hash the submitted code, constant-time compare against every entry, then create a session. 5 failed attempts per IP per 10 minutes, then 429.
- Rotating a code: replace its hash and redeploy. Revoking: remove it.

## 4. Sessions
- A random 128-bit ID in cookie `tlh_session`, signed with `SESSION_SECRET`. HttpOnly, Secure, SameSite=Lax, Path `/api`, Max-Age `SESSION_TTL_MINUTES` (120).
- Redis key `sess:<id>` -> `{ label, createdAt, chats }` with the same TTL.
- An expired session returns `session_expired`; the player can enter the code again.

## 5. Limits (Redis keys)
| Limit | Key | Default |
|---|---|---|
| Chats per code (lifetime) | `quota:chat:<label>` | `QUOTA_CHAT_PER_CODE` 150 |
| Chats per session | `sess:<id>.chats` | `QUOTA_CHAT_PER_SESSION` 40 |
| TTS characters per code | `quota:tts:<label>` | `QUOTA_TTS_CHARS_PER_CODE` 6000 |
| Rate per session and IP | `rate:<id>:<minute>` | `RATE_LIMIT_PER_MINUTE` 10 |
| Concurrent chats per code | `conc:<label>` (TTL 15 s) | `CONCURRENCY_PER_CODE` 1 |
| Concurrent chats overall | `conc:global` (TTL 15 s) | `CONCURRENCY_GLOBAL` 8 |
| Spend (USD micro-units) | `spend:total` | ceiling `AI_SPEND_CEILING_USD` 25 |
- Quotas are keyed by the code label, so clearing cookies or refreshing never resets them.
- Spend per request = inputTokens x `LLM_PRICE_INPUT_PER_MTOK` / 1e6 + outputTokens x `LLM_PRICE_OUTPUT_PER_MTOK` / 1e6. Added after each response. Checked before each request.
- **Fail closed**: if Redis is unreachable or the ledger cannot be read, return `not_configured` and the game plays Classic.
- Also set a hard monthly spend limit in the provider's dashboard.

## 6. Cost estimate (verify prices before launch)
- Per chat: ~1,500 input tokens and <= 250 output tokens.
- Per judge: assume ~20 chats per session -> ~30k input + ~5k output tokens.
- 8 codes x 150 chats = 1,200 chats maximum -> ~1.8M input + ~0.3M output tokens. With a small model this is a few US dollars; the 25 USD ceiling is a hard stop either way.

## 7. Logging and privacy
- Log request ID, route, status, latency, token counts and the code label. Never log player text in full, keys, codes, cookies or passwords.
- Player text is sent to the configured provider only to generate the reply. A one-line privacy note on the access-code screen says so.

## 8. Deployment checklist
1. `npm run build` passes locally; `vercel.json` points at `apps/client/dist`.
2. Env vars set in Vercel (Production). No secrets in the repo (secret scan).
3. Upstash integration connected; the health route reports `mode: hosted`.
4. Redeem a code; chat works; refresh keeps the quota; a second code has its own quota.
5. Force failures: wrong code, expired session, quota at 0, ceiling at 0, provider key removed, Redis env removed. Each falls back to Classic.
6. `/api/config/llm` returns 404 in production.
7. Cookie flags verified in a clean browser. Cold start time measured.
8. Codes pasted into the Devpost form and tested from another network.
9. Keep the deployment up until judging ends; check the spend counter daily; rotate the provider key afterwards.