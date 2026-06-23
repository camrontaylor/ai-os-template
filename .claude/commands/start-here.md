# /start-here

The optional first-run setup flow. It sets up the user's brand, picks their skills,
turns on the memory system, and explains how AI-OS works. Run it once per workspace.

Setup is recommended but never mandatory before doing useful work. If the user would
rather work than set up, do the task they asked for first using sensible defaults, then
offer to run `/start-here` afterward so future output sounds like them. Only run this
flow proactively when the user greets, asks to get started or set up, or has no task
(see First-Run Behaviour in `CLAUDE.md`). The user can run `/start-here` any time.

## Guard

Check whether `brand_context/` contains populated brand files (`voice-profile.md`,
`positioning.md`, or `icp.md`).
- **Populated** -> say "You're already set up. Just tell me what you're working on."
  and **stop**. Do not run any steps below.
- **Empty** (only `README.md` and/or `_templates/`) -> continue to First-Run Mode.
Ignore `brand_context/_templates/`; those are examples, not live brand files.

If `.claude/skills/_catalog/installed.json` is missing or has `selection_pending: true`,
the user has not chosen skills yet. Make sure Step 6 runs before you finish.

## Always

Create today's memory file per the Daily Memory section of `CLAUDE.md`:
- If `context/memory/{YYYY-MM-DD}.md` does not exist, create it with a `## Session - {HH:MM}` block.
- If it exists, append a new `## Session - {HH:MM}` block.
- Fill `### Goal` once the user states what they are working on.

---

## First-Run Mode

### Step 1: Intro and routing

First detect the workspace:
- If the current path contains `/clients/`, this is a **brand workspace** (a personal
  brand, your company, or a client). Read that folder's `AGENTS.md` for its name, frame
  everything around that one brand, skip the routing below, and go straight to Step 2.
- Otherwise this is the **root workspace** (the operating system itself).

Give a short, genuine intro (4 to 6 sentences, not a feature dump):
- AI-OS is a business operating system that learns your brand and gets sharper each
  session. It runs the same in Claude Code, Codex, and Cursor.
- It builds a brand foundation from a few questions, then you pick which skills to keep.
- It remembers. Each session is logged, and a nightly memory loop keeps it searchable.
- Skills can be built for any domain as your needs grow.

**If this is the root workspace, route before building anything.** AI-OS keeps each
brand in its own folder under `clients/`. The workspace ships three example folders that
map the common setup:
- `clients/personal/` - your personal brand (you as an individual)
- `clients/your-company/` - your own company or agency
- `clients/example-client/` - a client you do work for

Ask one routing question: "Are you setting up a single brand, or do you run a few (a
personal brand, a company, clients you serve)?"
- **Single brand** -> build it here at the root. Continue to Step 2. Mention they can
  delete the `clients/` example folders they do not need.
- **A few brands** -> each gets its own folder, so do not build at the root. Point them
  to start with one: "Open the folder you want to set up first and I onboard it
  automatically. For example: `cd clients/your-company && claude`, and I run /start-here
  for that brand. Each folder works the same way. Come back to the root for shared skills
  and the Command Centre." Then stop here; the per-folder onboarding takes over there.

End with the first question (single-brand or brand-workspace path). Do not list skills
yet; that happens in Step 6 once the system can frame them for the user's actual business.

### Step 2: Core questions (one at a time)

Ask up to four, in order, waiting for each answer. Never dump all four at once. If an
earlier answer already covered a later question, skip it and say what you picked up.

1. "What does your business do? Give me the one-sentence version."
2. "Who is your ideal customer - who do you help?" (skip if Q1 already made this clear)
3. "What makes you different from the alternatives?"
4. "How do you want to come across?" Offer these tones with one-line examples, and say
   they can pick one, mix, or describe their own:
   > **Direct** - gets to the point. "Here's what works. Do this, skip that."
   > **Warm** - friendly and approachable. "I've been there. Let me show you what helped."
   > **Authoritative** - expert and data-backed. "The data is clear on this."
   > **Playful** - casual and witty. "Nobody wakes up excited about admin. That's the point."
   > **Provocative** - challenges assumptions. "You don't have a hiring problem. You have an automation problem."
   > **Empathetic** - leads with understanding. "Scaling alone is exhausting. You shouldn't need a team of ten."

   Then offer the deeper option once:
   > "If you're starting from zero on voice, I can run a deeper voice extraction
   > (about 20 minutes) instead of the quick version. Want the deep one or keep it quick?"

   Capture the tone answer and a `deep_voice` flag: yes, no, or unset.

### Step 3: Brand assets and links

Ask: "Got a website, LinkedIn, YouTube, or other links I should know about?"

If yes:
- Save them to `brand_context/assets.md`.
- Try WebFetch to pull content for voice extraction.
- If WebFetch fails (heavy JavaScript or bot blocking), check `.env` for
  `FIRECRAWL_API_KEY`. If present, use the `tool-firecrawl-scraper` skill to scrape
  and pull brand assets (logo, colors, fonts). If missing, tell them once: "Adding a
  free Firecrawl key to `.env` lets me read tougher sites and pull your brand assets
  automatically. firecrawl.dev, 500 credits a month free. For now I'll work with what
  I can reach."
- Pull 5 to 10 strong sentences that show their voice.

If no: skip extraction but still create `brand_context/assets.md` with empty fields.

### Step 4: Build brand_context/

Run the three foundation skills, reading each `SKILL.md` for the full method:
- `.claude/skills/mkt-brand-voice/` -> `voice-profile.md` + `samples.md`
- `.claude/skills/mkt-positioning/` -> `positioning.md`
- `.claude/skills/mkt-icp/` -> `icp.md`

Voice routing:
- If a URL scraped well or the user pasted usable copy, use Extract or Auto-Scrape mode.
- Otherwise use Build mode: `deep_voice = yes` goes deep, `deep_voice = no` goes quick,
  `deep_voice = unset` offers the choice once.

Then create `context/learnings.md` with a section header per installed skill.

### Step 5: Show results and fill USER.md

Show real excerpts, not just filenames:
> **Your voice:** [two-sentence excerpt from voice-profile.md]
> **Your positioning:** [one-line statement]
> **Your ideal customer:** [primary pain]
> Saved in `brand_context/`. I'll use this in every skill from now on.

Update `context/USER.md` with their name, business, role, and the communication
signals you observed. Continue straight into Step 6 in the same reply.

### Step 6: Pick skills (do not skip)

Now that the brand is built, briefly say what each category does for this business,
then read `.claude/skills/_catalog/catalog.json` and present the optional skills as a
numbered checklist grouped by category (Content and Copy, Research and Strategy,
Visual and Video, Utility, Operations). Note which need an API key.

Tell them everything is pre-selected and they can remove what they do not need:
> "Tell me which to remove (for example 'remove 5, 6, 7') or say 'keep all'."

Then run the selector with their choice:
```bash
python3 scripts/select-skills.py --remove "skill-a,skill-b"   # or --remove none
```
It resolves dependencies, removes folders, and updates `installed.json`. Read
`.claude/skills/_catalog/selection-result.json` and confirm: "All set, N skills ready."

### Step 7: How it works (do not skip)

This is their orientation. Cover these, briefly and naturally:

**1. Three ways to work.**
> - Single task: just ask. A post, an email, some research, done.
> - Planned project: bigger work with several deliverables. I scope it and write a brief.
> - GSD project: complex multi-phase builds with full structured planning.
> Tell me what you're working on and I'll suggest the right level. See
> `docs/projects-guide.md`.

**2. The Command Centre.**
> "AI-OS has a dashboard for scheduled jobs, clients, and tasks. Start it with
> `bash scripts/centre.sh`, then open http://localhost:3000. After the first launch you
> can just run `centre`."

**3. Multiple clients (mention only if they signal an agency, clients, or multiple brands).**
> "You can run a separate workspace per client. Say 'add a client' or run
> `bash scripts/add-client.sh \"Name\"`. Each gets its own brand, memory, and outputs
> while sharing the same skills. Build a skill once, every client benefits. See
> `docs/multi-client-guide.md`."

**4. Sessions and memory.**
> "When you're done, just say so ('that's it', 'done for today', 'thanks') and I save
> what we did, the decisions, and any open threads. Next time I pick up where we left off.
> To turn on the nightly memory upkeep: run `claude setup-token` once, then
> `bash scripts/enable-cron.sh <token>`. The system works without it; this just keeps
> memory and search fresh automatically. See `docs/memory-and-cron.md`."

**5. Versions and safety.**
> "Ask me to 'save a version' or 'go back to yesterday's' any time and I handle the
> history for you, no git needed. And the system archives instead of deleting, so work
> is never lost."

### Step 8: First recommendation

End with ONE recommendation tied to their business, not a menu:
> "Given you're [situation], I'd start with [skill] because [reason]."

### Step 9: Back up your work

Once they have brand data worth protecting, offer a private backup:
> "Your brand data and outputs live on this machine only. Want to back them up to a
> private GitHub repo only you can see?"

If yes and the `gh` CLI is available:
```bash
gh repo create my-ai-os --private --source=. --remote=origin && git push -u origin main
```
If `gh` is not available, give the manual path: create a private repo on GitHub, then
`git remote add origin <your-repo-url> && git push -u origin main`. Reassure them it is
private. Skip this if they would rather wait.

---

## Anti-patterns

1. Never ask more than four questions before doing real work.
2. Never present all questions at once. Ask one, wait, ask the next.
3. Never present a skill menu and ask them to choose. Recommend.
4. Never rebuild `brand_context/` without asking first.
5. Never give a generic recommendation. Tie it to their business.
6. Never silently produce generic output when context is missing. Name the gap.
7. Never hardcode a skill list. Read `.claude/skills/` and the catalog.
8. Frame gaps as opportunities, not failures.
