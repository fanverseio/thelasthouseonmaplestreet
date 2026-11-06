# Submission Checklist (Kiroween 2026)

Deadline: **Friday Dec 4, 2026, 2:00 PM Pacific**. Re-read the Official Rules on the Devpost page before submitting; this list is a summary.

## Eligibility
- [ ] Project started on or after Oct 30, 2026 (this repo's first commit is after that date).
- [ ] Category chosen: Costume Contest (haunting, polished UI) or Frankenstein (stitched technologies). Pick one and note it in the write-up.
- [ ] Bonus prizes selected, if any, with their individual requirements met.

## Repository (public GitHub, not GitLab/Bitbucket)
- [ ] All source, assets and instructions needed to run it.
- [ ] Open source license file detected by GitHub and visible in the About section (LICENSE exists; confirm type).
- [ ] `.kiro/` committed at the root with specs, steering and hooks. NOT in `.gitignore`.
- [ ] README: setup, run, modes, controls, how to supply an API key locally, no-secrets note.
- [ ] `CREDITS.md` for third-party assets and fonts.
- [ ] No secrets in the repo or history (run a secret scan; rotate if anything leaked).
- [ ] Repo size sane (large files via LFS or excluded).

## Working app
- [ ] Public URL to the hosted build.
- [ ] Judge credentials and instructions entered in the Devpost form (judges only).
- [ ] Tested from a clean browser/network; Classic works without login.

## Demo video
- [ ] Under 3 minutes, public on YouTube.
- [ ] Shows the project working on the device it was built for.
- [ ] No third-party trademarks or copyrighted music.
- [ ] Shows: Classic highlights, the Angel conversation, a validated world action, a purify-or-destroy choice, both endings briefly, AI fallback.

## Write-up
- [ ] Features and functionality.
- [ ] How Kiro was used: specs (requirements/design/tasks and docs), steering files, hooks, MCP if used. Give concrete examples, and show the spec-to-code workflow.
- [ ] Mention AI safety design: LLM proposes, engine validates.

## Kiro usage evidence (build this up during development, not at the end)
- [ ] Steering files in `.kiro/steering/` actually used (product, tech, structure, canon).
- [ ] At least one useful hook (e.g. run tests on save, secret scan on commit, content validation on content change).
- [ ] Specs driving real tasks, with checked-off history.

## Final day
- [ ] Submit at least a few hours early; drafts can be saved on Devpost.
- [ ] Free Kiro credits request deadline: Dec 1, 12:00 PM PT, if needed.