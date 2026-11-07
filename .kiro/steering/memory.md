---
inclusion: always
---
# Development Memory

This project keeps its own memory in `.kiro/memory/`, so context survives between sessions and agents. It is plain markdown, committed to git, and works with any coding agent.

## Reading (start of a session)
- Read `.kiro/memory/MEMORY.md` before starting work. It is short on purpose.
- Read `.kiro/memory/dev-log.md` only if you need history (search it; do not load it whole).
- Memory is a hint, not authority. If it conflicts with the specs, steering or the code, the specs, steering and code win. Verify before relying on a remembered fact, and fix the memory if it is stale.

## Writing (only when needed)
Record an entry in `dev-log.md` when one of these happens, and nothing else:
- **decision**: the author decides something, or you make a significant technical choice.
- **milestone**: a tasks.md milestone or a group of tasks completes.
- **gotcha**: you hit a non-obvious problem and found the fix (tooling, platform, library).
- **spec-change**: a spec, steering or contract changes in a way others must know.
- **failed-approach**: an approach failed twice and you switched; note why.
- **handoff**: you stop with work unfinished; say what is next.
Do not record routine edits, file lists, command output, or anything already obvious from git history or the specs.

How to write:
1. Append one entry (2-5 lines) in the format at the top of `dev-log.md`. Never rewrite old entries.
2. If the fact will matter in future sessions, also update `MEMORY.md`: replace stale lines rather than adding, and keep the file under ~80 lines.
3. Never store secrets, API keys, access codes, tokens, `.env` values, cookies or personal data. Refer to variables by name only.
4. Do not commit or push memory changes on your own; they are committed with the related work.

## Optional: claude-mem
claude-mem (github.com/thedotmack/claude-mem) is not installed and is not required. If the author installs it later, keep this folder as the human-readable record; do not let the two diverge on decisions.

The author can ask for a memory update at any time ("record this in memory").