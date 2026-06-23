---
name: ops-agent-email
description: The agent's own email inbox (AgentMail) at your-agent@agentmail.to. Root shared skill, available to every client in AI-OS. Use when the agent needs to read its own incoming mail, grab a magic-link or one-time code to log into a tool headless, send an email as the agent, or check whether a verification or invite email arrived. Triggers on, check the agent inbox, read the agent's email, get the magic link, grab the login link, agent email, agentmail, what's the agent's email address, send an email as the agent, did the verification email arrive, read the invite. Wraps the AgentMail REST API via scripts/agentmail.py (address, list, read, wait-for, send). Lets the agent complete tool logins by reading its own link, no shared human login, no password. Does NOT read the user's personal Gmail (separate connector). Does NOT trigger for marketing email campaigns or lifecycle sequences.
---

# ops-agent-email

The agent's own inbox, so it can act as a first-class identity online: sign up for tools, receive
invites and confirmations, and complete magic-link / one-time-code logins **by reading its own mail**.
No shared human inbox, no stored password. This is a **root shared skill**: one canonical copy at
`.claude/skills/ops-agent-email/`, copied into each client, all using the same AgentMail account.

The engine is `scripts/agentmail.py` (Python stdlib only, no SDK). On invoke, also read
`SKILL.local.md` here if it exists.

## Identity
- Address: `your-agent@agentmail.to` (AgentMail free tier: 3 inboxes, 3,000 emails/mo).
- Auth: `AGENTMAIL_API_KEY` in the repo-root `.env` (gitignored). The script finds it from any client
  copy by walking up to the root `.env`. Never commit it; reference by name only.

## Commands
- `python3 scripts/agentmail.py address` - print the agent's email address.
- `python3 scripts/agentmail.py list [--limit N]` - recent messages (subject, from, time).
- `python3 scripts/agentmail.py read [--from S] [--subject S]` - newest matching message as JSON:
  `subject`, `from`, `link` (best magic-link guess), `code` (6-digit), `body`.
- `python3 scripts/agentmail.py wait-for [--from S] [--subject S] [--timeout SEC]` - poll until a NEW
  matching message arrives, then return the same JSON. Use right after triggering a login email.
- `python3 scripts/agentmail.py send --to X --subject Y --text Z` - send as the agent.

## The login pattern (why this exists)
1. On the target tool, request a magic link / code to `your-agent@agentmail.to`.
2. `python3 scripts/agentmail.py wait-for --from <tool>` returns the `link` (or `code`).
3. Follow the link headless (agent-browser) or enter the code. Logged in, nothing expired.
This is exactly how `ops-client-dashboard` reads its dashboard invite/access links.

## Rules
- Read-only of the AGENT's own inbox. This is NOT the user's Gmail; never use it to read personal mail.
- Codes and magic links expire fast (5-15 min); `wait-for` checks message freshness, so trigger the
  email first, then call it.
- Keep the API key out of git and out of chat; it lives in root `.env` only.
- Free tier is capped (3 inboxes, 3,000 emails/mo, 100/day). For volume or a custom-domain address
  (e.g. agent@your-domain.com), upgrade to the $20/mo Developer plan.

## Dependencies
- `AGENTMAIL_API_KEY` in root `.env` (required). Sign up / manage at https://console.agentmail.to.
- Python 3 (stdlib only; no extra packages).

## Self-Update
After any inbox/login incident, append a dated line to `## Rules` above and to
`context/learnings.md` (`## ops-agent-email`).
