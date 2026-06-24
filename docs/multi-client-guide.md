# Running AI-OS for Multiple Clients

## The Key Principle

AI-OS has two layers:

1. **Shared methodology** - `AGENTS.md`, `CLAUDE.md`, `SOUL.md`, skills, scripts. Version-controlled and shared. Lives at the root of your AI-OS folder.
2. **Client data** - `brand_context/`, memory, learnings, projects, and cron jobs. Unique per client. Lives inside `clients/{client-name}/`.

Claude remains the primary runtime. The compatibility change is structural:
- `AGENTS.md` is now the canonical shared instruction file
- root `CLAUDE.md` imports `@AGENTS.md` for Claude Code
- each client gets its own `AGENTS.md` for client-specific instructions
- each client also gets a thin `CLAUDE.md` wrapper that imports the local `AGENTS.md`

Everyone starts as a solo operator working from the root folder. When you need a second client, run `add-client.sh` and AI-OS creates a client workspace with separate context and outputs.

---

## How the Shared Instructions Load

### Claude Code

Claude Code reads `CLAUDE.md` files from parent directories. In AI-OS:

```text
AI-OS/
├── CLAUDE.md                    <- imports root AGENTS.md
├── AGENTS.md                    <- canonical shared methodology
└── clients/
    └── client-one/
        ├── CLAUDE.md            <- imports client AGENTS.md
        ├── AGENTS.md            <- client-specific instructions
        └── ...
```

When you `cd clients/client-one && claude`:
- the root `CLAUDE.md` loads and imports the root `AGENTS.md`
- the client `CLAUDE.md` loads and imports the client `AGENTS.md`
- the result is shared methodology from the root plus client-specific instructions from the client folder

### Codex

Codex reads `AGENTS.md` directly, from the repo root down to the current directory.

When you work inside a client folder with Codex:
- root `AGENTS.md` provides the shared methodology
- client `AGENTS.md` provides the client-specific layer

No extra shim is needed for Codex.

---

## What's Shared vs What's Separate

| What | Where | How clients get it |
|------|-------|-------------------|
| `AGENTS.md` (shared methodology) | Root | Shared directly from the root |
| `CLAUDE.md` (shared wrapper) | Root | Auto-inherited by Claude Code |
| `context/SOUL.md` | Root | Read by Claude heartbeat fallback |
| `context/USER.md` | Root | Read by Claude heartbeat fallback |
| `.claude/skills/` | Root + each client | Copied on client creation, auto-synced on update |
| `scripts/` | Root + each client | Copied on client creation, auto-synced on update |
| `AGENTS.md` (client-specific) | Each client | Created by `add-client.sh` |
| `CLAUDE.md` (client wrapper) | Each client | Created by `add-client.sh` |
| `brand_context/` | Each client | Built automatically on first session |
| `context/MEMORY.md` | Root + each client | Root and clients each keep their own curated working scratchpad |
| `context/learnings.md` | Root + each client | Root has system-wide learnings; clients start with a copy and diverge |
| `context/memory/` | Root + each client | Root has system-wide memory; clients keep their own session history |
| `projects/` | Each client | Per-client deliverables |
| `.env` | Root + optional client overrides | Shared keys stay in the root `.env`; clients get overrides only when needed |
| `cron/jobs/` | Each client | Per-client scheduled tasks |

### What stays in sync automatically

- Shared methodology at the root
- Shared skills and scripts when you run `update.sh`
- Claude wrappers and client instruction backfills when `update-clients.sh` runs during updates

### What you manage separately

- Brand context
- Learnings
- Session memory
- Projects
- Cron jobs
- API keys if you want client-specific secrets

---

## How Skills Stay in Sync

Skills live in the root folder as the master copy. Each client folder gets its own working copy.

This happens automatically in two situations:
1. `add-client.sh` copies the latest skills into the new client folder
2. `update.sh` syncs skills, scripts, settings, hooks, and instruction-file backfills to every client folder

Always edit shared skills at the root level:

```text
Edit here:     AI-OS/.claude/skills/mkt-copywriting/SKILL.md
Not here:      AI-OS/clients/client-one/.claude/skills/mkt-copywriting/SKILL.md
```

Client-only skills are still fine. Create them directly in the client's `.claude/skills/` folder and `update.sh` will preserve them.

---

## Scenario 1: Solo Operator

```text
~/Projects/AI-OS/
├── AGENTS.md
├── CLAUDE.md
├── context/
├── brand_context/
├── .claude/skills/
├── projects/
├── cron/jobs/
└── .env
```

This is the default setup. You work directly from the root folder.

---

## Scenario 2: Multiple Clients

```text
~/Projects/AI-OS/
├── AGENTS.md
├── CLAUDE.md
├── context/
├── .claude/skills/
├── scripts/
└── clients/
    ├── client-one/
    │   ├── AGENTS.md
    │   ├── CLAUDE.md
    │   ├── .claude/skills/
    │   ├── scripts/
    │   ├── brand_context/
    │   ├── context/
    │   ├── projects/
    │   ├── cron/
    │   └── .env
    └── client-two/
        └── ...
```

### Adding a New Client

```bash
cd ~/Projects/AI-OS
bash scripts/add-client.sh "Client One"
```

This creates `clients/client-one/` with:
- a client `AGENTS.md` for client-specific instructions
- a client `CLAUDE.md` wrapper for Claude Code
- skills and scripts copied from root
- learnings seeded from root
- empty `brand_context/`, `projects/`, and `context/memory/` folders
- a copy of `.env` if one exists at the root

Then start working:

```bash
cd clients/client-one
claude
```

Claude automatically detects it's a new client and walks through the brand foundation.

### What Claude Sees in a Client Folder

When you `cd clients/client-one && claude`:
1. root `CLAUDE.md` loads and imports root `AGENTS.md`
2. client `CLAUDE.md` loads and imports client `AGENTS.md`
3. Claude heartbeat reads `context/SOUL.md` and `context/USER.md` from the root when needed
4. `brand_context/`, `context/memory/`, and `context/learnings.md` come from the client folder
5. `.claude/skills/` comes from the client folder

### What Codex Sees in a Client Folder

When you work in the same folder with Codex:
1. root `AGENTS.md` loads first
2. client `AGENTS.md` loads second
3. the same shared/client layering applies without needing `CLAUDE.md`

---

## Updating

```bash
cd ~/Projects/AI-OS
bash scripts/update.sh
```

That pulls the latest upstream changes and syncs client folders. It does not touch client data like brand context, memory, learnings, projects, or cron jobs.

Existing clients created before the `AGENTS.md` change are handled conservatively:
- if `AGENTS.md` is missing, `update-clients.sh` seeds it from the old client `CLAUDE.md`
- if the old client `CLAUDE.md` still matches the untouched scaffold, it is replaced with a wrapper automatically
- if the old client `CLAUDE.md` contains custom content, it is preserved and you can clean it up manually later

---

## Sharing API Keys

Clients inherit shared API keys from the root `.env` at runtime. `add-client.sh`
does **not** copy secrets into every client folder; when the root `.env` exists it
creates a small client `.env` for client-specific overrides only.

If one client needs its own key, add only that override:

```bash
printf 'FIRECRAWL_API_KEY=client-specific-key\n' >> clients/client-two/.env
```

Do not copy the full root `.env` unless you deliberately want duplicated secrets
and are prepared to keep them in sync yourself.

---

## Cron Across Clients

One managed cron runtime covers the root workspace plus every `clients/*` workspace. Start it once from the workspace root:

```bash
cd ~/Projects/AI-OS
bash scripts/start-crons.sh
```

The Command Centre UI also schedules root and client jobs while the server is running. If the UI and daemon coexist, a shared leader lock in `.command-centre/` ensures only one host schedules jobs at a time.

---

## Rules of Thumb

- Work from the root folder when you are operating for yourself
- Work from `clients/{slug}/` when you are operating for a specific client
- Edit shared methodology in root `AGENTS.md`
- Keep `CLAUDE.md` files as wrappers; do not put the canonical shared rules there
- Edit shared skills at the root
- Let client `AGENTS.md` files hold client-specific instructions
