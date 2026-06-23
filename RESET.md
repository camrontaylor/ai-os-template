# AI-OS - Standalone Template

A clean, self-contained copy of AI-OS with no personal data and no link to any
private account, client, or repository. Use it to spin up a fresh, empty AI-OS.

## What this is

- The full AI-OS system: every skill, script, hook, doc, the Command Centre app,
  the skills library, the cron runtime, and the memory system.
- No personal data: no brand context, no clients, no memory, no projects, no
  private profile.
- No git remote by default, and a clean public history with only template work.
- Tool-agnostic: works the same in Claude Code, Codex, and Cursor.

## How to start from this template

1. Clone or copy this folder to where you want your install to live, for example:
   `git clone https://github.com/camrontaylor/ai-os-template.git ~/Desktop/my-ai-os`
   or `cp -R ai-os-template ~/Desktop/my-ai-os`.
2. Open it: `cd ~/Desktop/my-ai-os && bash scripts/centre.sh`
3. Then start Claude Code: `claude`
4. If your first message is setup-focused, Claude runs onboarding (`/start-here`),
   which sets up your brand, picks your skills, and explains the system step by
   step. If you start with a real task, Claude does the task first and offers
   onboarding afterward.

This never touches any existing install. It is a separate, blank copy.

## What you fill in

Onboarding writes these for you, or you can edit them by hand:

- `context/USER.md` - who you are.
- `brand_context/` - your voice, positioning, and ideal customer (per brand).
- `context/operator/` - optional deeper profile (identity, voice range, influences).
- `.env` - optional API keys. Copy `.env.example` to `.env` and fill what you want.
  Every key is optional; skills tell you when one would help.

## Notes

- No cloud backup is configured. To back yours up, create your own private GitHub
  repo and add it as `origin`. Onboarding walks you through this.
- The Command Centre logo (`command-centre/public/logo.png`) is the generic AI-OS
  logo. Swap it for your own if you like.
- Add a client workspace any time with `bash scripts/add-client.sh "Client Name"`.
