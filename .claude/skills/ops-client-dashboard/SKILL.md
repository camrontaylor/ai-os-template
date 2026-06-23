---
name: ops-client-dashboard
description: Read a configured client task dashboard headless. Shared across clients - use it from the root workspace or any client workspace. Use when the user wants to check, open, read, screenshot, or get an overview of a client's task board, kanban, backlog, what's in progress, or a deliverable's status. Triggers on, check the client dashboard, client task board, what's on the board, task dashboard, read the kanban, task board, what's in the backlog, screenshot the board, client tasks. The agent logs in as its own dashboard member via one durable shared session; re-auth is handled through a fresh invite sent to the agent inbox (ops-agent-email). Requires CD_HOST, CD_EMAIL, CD_DEFAULT_BOARD, and AGENTMAIL_API_KEY to be configured before use. Does NOT trigger for other tools or for building the dashboard tool itself.
---

# ops-client-dashboard

Read a configured client task board headless. This skill is intentionally thin: it knows how
to open a dashboard, keep a durable agent-owned browser session, screenshot the board, and
dump its text. Point it at your dashboard by setting `CD_HOST`, `CD_EMAIL`, and
`CD_DEFAULT_BOARD` in `.env`.

The agent signs in as its own dashboard user, not as the human owner. The deterministic
steps live in `scripts/`. This is a **root shared skill**: the same copy runs from the root
workspace or any `clients/*` workspace, with ONE shared login stored OUTSIDE any client at
`~/.agent-browser/profiles/client-dashboard`. On invoke, also read `SKILL.local.md` here if
it exists.

## How it works (plain English)
- The board is read headless: no window pops up. You ask, the agent opens the board, screenshots it,
  reads the cards, and reports.
- The agent is its own team member. It never uses your login or a stored password.
- **The login is durable**: one shared session, survives restarts, lasts weeks. The account has no
  password. When it eventually lapses, re-auth is a quick admin step: send a fresh invite to
  the agent email in the dashboard's Team settings, and the agent reads that invite from its
  own inbox and re-joins automatically (`relogin.sh`).

## View  ("check the client dashboard", "what's on the task board", "screenshot the board")
1. `bash scripts/view.sh` reads the default board from `CD_DEFAULT_BOARD`. For another
   client, pass the id or full URL: `bash scripts/view.sh <customer-id>` (for the default
   getorchestra-style backend, the id is in `.../dashboard/customer/<id>`).
2. It writes `~/.agent-browser/client-dashboard-out/board.png` and `board.txt`. Read both and summarise.
3. Exit code 2 means it could not authenticate even after a re-auth attempt; run `relogin.sh`.

## Status / Relogin
- `bash scripts/status.sh` reports valid or expired (and auto-renews if it can).
- `bash scripts/relogin.sh` re-establishes the session by reading the latest dashboard invite link from
  the agent inbox and completing the join. It needs a FRESH invite first (an admin re-invites the agent
  in Team settings), because the invited account has no password and no standard sign-in.

## Adding the agent to a new client board
The agent only sees clients it is assigned to (least privilege). To grant a new one, an admin opens the
dashboard's Team settings, finds the agent member, and assigns that client with the role needed
to read the full task board. Then `view.sh <new-id>` works.

## Rules
- ONE shared login at `~/.agent-browser/profiles/client-dashboard`; never copy session data into a
  client folder or git. Outputs go to `~/.agent-browser/client-dashboard-out/` (also outside git).
- Pass `--profile` to agent-browser ONLY on the daemon-booting open; later calls use the session alone.
  Always `close` before a fresh `open` (the scripts do this).
- No password anywhere; the invited account has none. Everyday access is the durable shared session.
  Re-auth on expiry needs a fresh admin invite, then the agent rejoins by reading it via
  `ops-agent-email` (needs `AGENTMAIL_API_KEY` reachable).
- Keep reads on-demand or daily; do not poll hard (paid SaaS).
- Keep this skill thin and backend-shaped by configuration. If your dashboard does not use
  getorchestra-style `dashboard/customer/<id>` URLs, pass full board URLs to `view.sh` or
  adapt only the URL builder in `scripts/view.sh`.

## Dependencies
- `agent-browser` CLI (required, v0.27.0+).
- `ops-agent-email` skill + `AGENTMAIL_API_KEY` (required for re-auth).
- The agent must be a `Member` of the dashboard team, assigned to the client(s) being read.

## Self-Update
After any login or read incident, append a dated line to `## Rules` above and to
`context/learnings.md` (`## ops-client-dashboard`).
