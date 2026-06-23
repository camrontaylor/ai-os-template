# Security

This document explains how AI-OS handles trust and access, so you can decide what you are comfortable running. It is meant to be plain and honest, not alarming.

## What this template is

AI-OS is a workspace template that runs an AI agent on your machine. By design, the agent has broad access to local files inside the workspace. It can read, write, and run scripts so it can act as a real assistant. That access is the point of the system, and it is also the main thing to be aware of. Run it on a machine and in a folder where that level of access is fine with you.

## Secrets and keys

Keep all API keys and secrets in a `.env` file. That file is gitignored and is never committed.

- `.env` holds your real keys. It stays local. Do not commit it.
- `.mcp.json` holds your real connector config. It stays local. Do not commit it.
- `.env.example` is the tracked template. It lists the keys with empty values so you know what to fill in.
- `.mcp.example.json` is the tracked template for connectors.

Rule of thumb: only the `.example` files belong in git. The real `.env` and `.mcp.json` never do. Before you push, check that neither real file is staged.

Never paste a real secret value into any tracked file, including memory files, notes, or docs. When you need to reference a key, reference the name of the variable (for example `OPENAI_API_KEY`), not the value.

## Scheduled jobs (cron) run unattended

AI-OS includes an optional scheduled-jobs runtime, often called cron. It lets the agent run jobs on a timer without a person watching. This is powerful and convenient, and it is also the highest-trust feature in the system. Understand the trade-off before you turn it on.

- It is off by default. Nothing runs on a schedule until you set it up and start it.
- Root-workspace jobs run the agent with permission prompts skipped. They use `--dangerously-skip-permissions` so an unattended job does not stall waiting for a human to click approve. That means a scheduled root job can take file and shell actions on its own.
- Client-workspace jobs are scoped to that single client's directory and run with `--permission-mode dontAsk`. They are limited to that client's folder rather than the whole workspace.

In short: a scheduled job acts on your behalf while you are away. Only enable cron once you accept that. If you are unsure, leave it off and run the agent interactively, where you can see and approve what it does.

## Reporting a vulnerability

If you find a security issue in the template itself, please report it privately first rather than opening a public bug with full details.

- Open a private security advisory on the repository if that option is available.
- Otherwise open an issue asking for a private channel to share the details, without posting the exploit publicly.

This is general guidance. There is no personal contact in this template by design.

## A short safety checklist

- Keep `.env` and `.mcp.json` out of git. Confirm before every push.
- Only commit the `.example` versions of those files.
- Leave cron off until you understand and accept that scheduled jobs run unattended.
- Run the workspace in a folder where broad agent file access is acceptable.
- Reference secret names in notes and memory, never the values.
