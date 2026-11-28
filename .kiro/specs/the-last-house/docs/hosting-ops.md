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

## 3. AI login (two passphrases)
- Author decision (2026-11-28): judges unlock AI with **two passphrases that must both match** one account (replaces the single access code). Quotas are keyed by the account label.
- Accounts come from either source (both may be set):
  - `ACCESS_CODE_HASHES`: comma-separated `label:sha256hex`, hash = sha256(passphrase1 + "\n" + passphrase2). Preferred on Vercel, because no plain passphrase sits in env. `node tools/hash-access-code.mjs [label]` reads the pair from `.env` and writes the line to `asset_creation/access-hashes.txt` (gitignored); it prints no secret.
  - `PASSPHRASE_01` + `PASSPHRASE_02` (lower-case `passphrase_01`/`passphrase_02` also read): one plain pair, label `judges`.
  - `JUDGE_ACCOUNTS` is not read (it was empty in `.env`; no format was defined).
- Redeem (`POST /api/access/redeem { passphrase1, passphrase2 }`): hash the pair, constant-time compare against every account, then set the session cookie. 5 failed attempts per IP per 10 minutes, then 429.
- Rotating: replace the hash (or the plain pair) and redeploy. Revoking: remove it; existing cookies for that label stop working at once.

## 4. Sessions
- Stateless signed cookie `tlh_session` = base64url({ sid, label, exp }) + "." + HMAC-SHA256 with `SESSION_SECRET` (32+ chars). HttpOnly, SameSite=Lax, Path `/api`, Max-Age `SESSION_TTL_MINUTES` (120); `Secure` on hosted. Locally an empty secret means a random one per server start.
- No session record in Redis: the per-session chat count lives at `quota:sess:<sid>` with a 3 h TTL.
- An expired session returns `session_expired`; the locket then shows the login again.

## 5. Limits (Redis keys)
| Limit | Key | Default |
|---|---|---|
| Chats per code (lifetime) | `quota:chat:<label>` | `QUOTA_CHAT_PER_CODE` 150 |
| Chats per session | `quota:sess:<id>` | `QUOTA_CHAT_PER_SESSION` 40 |
| TTS characters per code | `quota:tts:<label>` | `QUOTA_TTS_CHARS_PER_CODE` 6000 |
| Rate per session and IP | `rate:<id>:<minute>` | `RATE_LIMIT_PER_MINUTE` 10 |
| Concurrent chats per code | `conc:<label>` (TTL 15 s) | `CONCURRENCY_PER_CODE` 1 |
| Concurrent chats overall | `conc:global` (TTL 15 s) | `CONCURRENCY_GLOBAL` 8 |
| Spend (USD micro-units) | `spend:total` | ceiling `AI_SPEND_CEILING_USD` 25 |
- Quotas are keyed by the code label, so clearing cookies or refreshing never resets them.
- Spend per request = inputTokens x `LLM_PRICE_INPUT_PER_MTOK` / 1e6 + outputTokens x `LLM_PRICE_OUTPUT_PER_MTOK` / 1e6. Added after each response. Checked before each request. When both prices are 0, a cautious default of 1 / 4 USD per million tokens is used.
- Rate key is `rate:<sid>:<ip>:<minute>`; redeem failures use `redeem:fail:<ip>:<10-minute window>`.
- The credit bar shows `remainingPct` of the ceiling (`GET /api/config/status` and every chat response carry `credits`).
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

## 9. Classic-only deploy (state before 2026-11-28)
No AI key, no Redis. `GET /api/config/status` must report `aiAvailable: false` (a test covers this; hosted AI also needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).

What the author does in Vercel (by hand):
1. Add New > Project > import `fanverseio/thelasthouseonmaplestreet`. Framework preset: Other. `vercel.json` sets install, build (`npm run build`) and output (`apps/client/dist`).
2. Settings > Environments > Production > Branch Tracking: set Production Branch to `feat/phase1-foundations` (the import screen cannot set it).
3. Settings > General: Node.js Version 24.x.
4. Settings > Environment Variables: add `APP_MODE` = `hosted` (plain, not secret). Nothing else is needed for Classic.
5. Firewall (Project > Firewall > Add Rule): deny all IPs except your own IPv4 and IPv6 (condition "IP Address" not equal to each, action Deny). Publish. Turn any VPN or Tailscale exit node off when opening the site. The rule covers previews too.
6. **Before judging: delete that firewall rule and publish**, then open the site from another network.
7. Verify: `/api/health` returns `"mode":"hosted"`; `/api/config/status` returns `"aiAvailable":false`; New Game > Classic starts; a cinematic video plays and seeks.

Notes:
- `npm run check` also runs `scripts/check-asset-case.mjs` (Linux is case-sensitive; Windows is not).
- Static `/assets/*.js|css` are cached immutable (hashed by Vite). Models, audio, textures and video are cached one day, because their file names are not hashed.
- `dist` is about 119 MB (84 MB video, 7 MB source maps).

## 10. Turning on hosted AI (by hand, in Vercel)

Code is ready (AI chat, login, Upstash store, limits, fail closed). Checked live on 2026-11-28 after commit 8b2ed5b: `/api/health` returns 200 with `"mode":"hosted"`, and `/api/config/status` returns `"aiAvailable":false,"loginRequired":true` (fail closed, no AI env yet). Before 8b2ed5b every hosted `/api` route returned 500 (ERR_MODULE_NOT_FOUND on the `.ts` import); the root `tsconfig.json` now sets `rewriteRelativeImportExtensions` and server code imports shared code through `apps/server/src/shared.ts`. Until every step below is done, hosted AI stays off and the game plays Classic.

1. **Upstash**: Vercel dashboard > Storage (or Marketplace) > Upstash for Redis > Create > connect it to this project (Production and Preview). The integration injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`); the server reads either pair. Nothing to copy by hand.
2. **Hash for the login pair**: on the author's machine run `node tools/hash-access-code.mjs` (it reads `PASSPHRASE_01`/`PASSPHRASE_02` or the lower-case names from `.env`). Open `asset_creation/access-hashes.txt` and copy its one line.
3. **Environment variables** (Settings > Environment Variables, Production; names only here, values from `.env` or step 2). Mark the key, secret and hash as Sensitive:
   - `APP_MODE` = `hosted` (already set)
   - `LLM_PROTOCOL`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`
   - `ACCESS_CODE_HASHES` = the line from step 2 (preferred), **or** `PASSPHRASE_01` and `PASSPHRASE_02` (plain pair)
   - `SESSION_SECRET` = a new random string of 32+ characters (for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, run in your own terminal)
   - Optional: `AI_SPEND_CEILING_USD` (default 25), `LLM_PRICE_INPUT_PER_MTOK`, `LLM_PRICE_OUTPUT_PER_MTOK` (defaults 1 and 4 when both are 0), `QUOTA_CHAT_PER_CODE` (150), `QUOTA_CHAT_PER_SESSION` (40), `RATE_LIMIT_PER_MINUTE` (10), `CONCURRENCY_PER_CODE` (1), `CONCURRENCY_GLOBAL` (8), `SESSION_TTL_MINUTES` (120)
4. **Redeploy** (Deployments > latest > Redeploy) so the functions read the new variables.
5. **Verify**: `/api/config/status` returns `"aiAvailable":true,"loginRequired":true`; New Game > AI-Enhanced Mode asks for two passphrases; a wrong pair is refused; the right pair starts the game; T, type, Enter gives a reply; the top-left bar shows `AI credits NN%`.
6. **Give judges access**: put the two passphrases in the private Devpost form (one pair is shared by all judges, so they share one quota label `judges`; raise `QUOTA_CHAT_PER_CODE` if needed, or add more `label:hash` entries for separate quotas).
7. Remember section 9 step 6: delete the IP firewall rule before judging.
