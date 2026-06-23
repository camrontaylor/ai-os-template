# clients/

This folder maps how AI-OS separates the brands you work with. The root of the workspace is the operating system itself - shared skills, scripts, and methodology, with no single brand's voice. Each brand gets its own folder here, fully self-contained (its own `brand_context`, memory, and projects) while sharing the root skills.

## The folders shipped as examples

| Folder | What it is for |
|--------|----------------|
| `personal/` | Your personal brand - you as an individual. |
| `your-company/` | Your own company or agency - the business you run. |
| `example-client/` | A client you do work for. Copy it per client, or generate fresh ones. |

These three map the common setup: your personal brand, your business, and the clients you serve. Keep the ones you need, rename them, and delete the rest. They are blank templates - nothing here holds real data.

## Adding a real client

From the root of the workspace:

```bash
bash scripts/add-client.sh "Client Name"
```

That builds a fresh client folder with the full structure, already named, with onboarding wired in.

## How onboarding works per folder

Every folder here is self-onboarding. Open one:

```bash
cd clients/personal
claude
```

Claude sees the empty `brand_context/` and offers `/start-here` for that brand. If your first message is setup-focused, onboarding starts immediately. If your first message is a real task, Claude does the task first with sensible defaults and offers onboarding afterward. Folders already filled in skip straight to work.

## What shares, what is separate

- **Shared (at the root):** skills, scripts, methodology, the Command Centre, the cron runtime. Build a skill once and every brand benefits.
- **Separate (per folder):** brand voice, positioning, ideal customer, memory, projects, and scheduled jobs.

Full guide: `docs/multi-client-guide.md`.
