# Submission Checklist (Kiroween 2026)

Deadline: **Friday 2026-12-04, 2:00 PM Pacific**. Aim to submit on 2026-12-03. Re-read the Official Rules on the Devpost page before submitting; this list is a summary, and the rules page could not be fetched automatically when this was written.

## Eligibility and category
- [ ] Project started on or after 2026-10-30 (first commit is after that date).
- [ ] Category: **Costume Contest** (a haunting, polished interface; the locket and the atmosphere are the showcase).
- [ ] Any bonus prizes selected, with their own requirements met.

## Repository (public GitHub)
- [ ] All source, final assets and instructions needed to run the game are committed (`apps/client/public/assets/` included; `assets/raw/` ignored).
- [ ] MIT `LICENSE` detected by GitHub and visible in the About section.
- [ ] `.kiro/` committed at the root with specs, steering and hooks; not in `.gitignore`.
- [ ] README complete and in sync with the real scripts, ports and env vars (`npm run check` passes).
- [ ] **Fresh-clone test passed** (`tasks.md` 10.4): a coding agent set up and ran the game from the README alone.
- [ ] `CREDITS.md` lists every third-party or generated asset and font.
- [ ] No secrets in the repo or its history (full-history scan run; keys rotated if anything leaked).
- [ ] Repository size reasonable.

## Working app
- [ ] Public Vercel URL; Classic Mode works with no login.
- [ ] Access codes (plain text) and instructions entered only in the private Devpost form: "Choose AI-Enhanced Mode, enter one of these codes."
- [ ] Hosted checklist in `hosting-ops.md` section 8 completed, tested from a clean browser on another network.
- [ ] Spend ceiling and provider dashboard cap set; the deployment stays online until the end of judging.

## Demo video
- [ ] Under 3 minutes, public on YouTube.
- [ ] Shows the game running in a desktop browser.
- [ ] Shows: the opening and the locket, a horror sequence, a purify-or-destroy choice, an AI conversation with a validated world action, the AI fallback, and **both endings** (briefly).
- [ ] No third-party trademarks, copyrighted music or unlicensed material.

## Write-up
- [ ] Features and the two modes.
- [ ] How Kiro was used, with concrete examples: steering files, the Kiro-native spec (requirements, design, tasks), the docs it references, the hooks (canon consistency, TypeScript check), the refinement workflow, and the spec-to-task workflow.
- [ ] The AI safety design: the LLM proposes, the engine validates.
- [ ] The agent-friendly README.

## Kiro usage evidence (collect during development)
- [ ] Steering files used throughout.
- [ ] Tasks checked off in `tasks.md` over time.
- [ ] Screenshots of hooks firing and of the task runner.

## Final days
- [ ] Free Kiro credits requested before 2026-12-01 12:00 PM PT, if needed.
- [ ] Devpost draft saved early and updated.
- [ ] Submitted before the deadline; confirmation received.