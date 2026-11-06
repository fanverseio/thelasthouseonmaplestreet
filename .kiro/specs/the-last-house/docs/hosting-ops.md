# Hosting and Ops Spec

## Requirements
- Judges can play the hosted build through Dec 4 and likely for a while after. Keep it up until results are announced.
- Judge credentials are private (Devpost form only). The GitHub repo must still work for anyone using their own key locally.
- The author's LLM key must not be exposed, and the bill must be bounded.

## Platform choice (decide, then record here)
Criteria: always-on or fast wake (free tiers that sleep give judges a slow cold start), persistent disk or small DB for usage counters, WebSocket not needed, HTTPS included, deploy from GitHub.
Options: Render (paid starter avoids sleep), Fly.io, Railway, small VPS. Recommended: a low-cost always-on instance with a persistent volume. Decision: TBD (author).

## Persistent usage ledger
In-memory counters reset on restart and would let the cap be bypassed. Use a small SQLite file or JSON file on a persistent volume:
- per-account: requests used, tokens used, last seen
- global: requests and tokens per UTC day
Write atomically; load on boot; fail closed (treat unreadable ledger as budget exhausted).

## Auth (hosted mode)
- 3 to 10 judge accounts generated up front. Store scrypt/argon2 hashes in an env var or secrets file, not in git.
- Login endpoint with throttling (5 attempts per IP per 10 min). Session cookie HttpOnly, Secure, SameSite=Lax, 8 h expiry.
- The game itself (static files) can be public. Only `/api/angel/*` requires login, so judges can still play Classic if the login fails. The login screen is part of "AI-Enhanced" mode selection.
- Provide a demo path in the Devpost notes: "Choose AI-Enhanced, log in with the credentials below".

## Budgets and limits (defaults, tune after measuring)
| Limit | Value |
|---|---|
| Chat requests per session | 30 |
| Chat requests per account total | 150 |
| Global requests per UTC day | 1500 |
| Per-IP rate | 10 requests / minute |
| max_tokens | 250 |
| Request body size | 16 KB |
On exceeding: return `budget_exhausted` (503), client switches to Classic and does not retry.
Also set a hard monthly spend cap in the LLM provider dashboard.

## Configuration (env)
`APP_MODE=local|hosted`, `PORT`, `LLM_PROVIDER`, `OPENAI_API_KEY` / `GEMINI_API_KEY` (hosted only), `JUDGE_ACCOUNTS` (hashes), `SESSION_SECRET`, `LEDGER_PATH`, `ELEVENLABS_API_KEY` (optional), `FEATURE_TTS`.
Local mode: key supplied through the UI, held in memory only. `.env.example` committed with empty values; `.env` ignored.

## Observability
- Log: request id, account id, route, status, latency, token counts. Never log player text bodies in full, keys, cookies or passwords.
- `/api/health` returns version and uptime.
- A daily glance at the ledger during judging; rotate the key after judging ends.

## Deployment checklist
1. Build client; server serves it.
2. Env vars set; no secrets in the repo (run secret scan).
3. HTTPS works; cookie flags verified in a clean browser.
4. Login, chat, fallback (kill the key), budget exhaustion all tested on the hosted URL.
5. Cold start time measured.
6. Credentials pasted into Devpost, tested from a different network.

## Local developer setup (README)
`npm install`, `npm run dev`, open the URL, choose AI-Enhanced, enter provider and key in the UI (held in server memory only).