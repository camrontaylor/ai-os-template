# CLAUDE.md

This file keeps Claude Code compatible with the client-specific instructions in `AGENTS.md`.

@AGENTS.md

---

## Claude Runtime

### Session Type Detection

Scan this client's `brand_context/` for populated `.md` files (ls, not read).
- **No files** -> first run -> onboarding is deferrable, not forced. If the first message is a concrete task or question, do that task now using sensible defaults, then offer to run `/start-here` for this client afterward so future output is on-brand. If the user greets, asks to get started or set up, or has no task, run `/start-here` to build this client's brand foundation.
- **Files exist** -> returning mode -> follow the root `CLAUDE.md` runtime (silent startup, daily memory, wrap-up).

This block only adds the deferrable first-run trigger so a new client workspace can onboard itself without blocking quick tasks. The full runtime (returning mode, memory, greeting, wrap-up) lives in the root `CLAUDE.md`.
