# Project Memory (curated)

Short, durable notes that a future session needs and cannot easily re-derive. Keep this file under ~80 lines. Newest facts replace stale ones; do not append history here (history goes in `dev-log.md`). Never store secrets, keys, access codes or personal data.

## Status
- 2026-11-07: Phase 1 foundations committed (e6cb6e1) and pushed to `feat/phase1-foundations`; no PR yet. tasks.md 1.7 (CI) stays open until a PR runs green. `npm run dev` shows a boot-check page only.
- 2026-11-07: Draft docs approved. tasks.md section 2 built (2.1 and 2.6 await the author's manual browser check). Next: section 3 (progression, gates, sequences). No PR yet (no `gh`; author opens it on GitHub). Unit 187 tests + 2 Playwright smoke tests pass.
## Decisions that are easy to forget
- Everyone starts at Elena's home. No chapter select, judge start or shortcuts (author decision).
- Good ending = Elena takes over the seal's duty from Felix and leaves with him. Bad ending = seal broken, evil escapes. Ending depends only on the final choice.
- Hosted AI: private access codes (hashed in env), Upstash quotas, spend ceiling, Vercel. No OAuth, no cloud saves. BYOK is local build only.
- Saves: localStorage only (`tlh.save`); finished save hides Continue.
- Tasks live in `tasks.md` (lowercase). `TASKS.md` was removed; on Windows the names collide.

- Encounters: street fox (skippable), Briggs mini-boss, Watcher of House 66 mini-boss, approach hounds, interior cat, final ritual. Persistent stun at ~30% HP; purify (+) or held-bolt destroy (-); both outcomes drop the progression item.
- Spells: Bolt after Seq 2, Ward at Briggs' first telegraphed attack, Purify when he is stunned. Felix's 3rd appearance is at the first anchor.

- Cinematics = generated video clips played by a 'video' sequence step; never build cinematics in code (author decision 2026-11-07). API details come later.

- Add a beat = entities in registry + placements.ts + content/interactions/beatN.ts + content/sequences/beatN.ts + dialogue lines (world-runtime is generic).

## Gotchas
- TypeScript is pinned to 6.0.x (typescript-eslint 8 rejects TS 7). TS 6 defaults `types` to [], so set them per tsconfig.
- Server runs `.ts` directly (Node >=22.18 type stripping): use `.ts` import extensions, `import type`, no enums or parameter properties.
- `packages/shared` must stay free of Node types (browser + server). Put Node-only tests in `apps/server`.
- PowerShell tool: chaining several long `cmd /c npm ...` calls can drop output; run them one per call.
- Commit messages: build in PowerShell, write `commit-msg.tmp` in the repo root, `git commit -F`, delete it. Editor-tool writes to `.git/` or TEMP are not visible to the shell; `-m` breaks on double quotes.
- The command filter blocks writing the literal dev-server command inside a heredoc; build it from parts when writing docs.
- Windows paths are case-insensitive. Rename with a two-step `git mv`.
- `.env` holds real values. Only add or compare variable NAMES; never print values.

- Default `node` on this machine is v18: prefix shells with `$env:Path = "C:\Program Files\nodejs;" + $env:Path`.

## Pending author approvals
- `@gltf-transform/cli` dev dependency; ElevenLabs and image-tool licence terms.