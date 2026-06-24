---
name: meta-find-skills
description: Find the right skill for what the user wants to do, searching AI-OS's own curated sources before reaching outside. Triggers on "find a skill", "find-skills", "is there a skill for", "do we have a skill for", "find me a skill for X", "what skill handles X", "search for a skill", "I wish I had a skill for", "can the system already do X", "extend my capabilities". Searches in order live AI-OS skills, the Skills Library backlog (skills-library/INDEX.md), the optional-skills catalog (_catalog/catalog.json), and usage/tier data; only as a last resort searches the external ecosystem, and then vendors the find into the backlog rather than installing it into the menu. Does NOT trigger for building a brand-new skill from scratch (use meta-skill-creator), ranking skills by usage (skill-tiers), or installing a specific named optional skill (add-skill.sh).
---

# Find Skills

The front door to the AI-OS skill system. When someone wants a capability, this
finds whether it already exists - live, parked, or installable - before anyone
reaches outside or builds from scratch.

## When to use

- "find a skill for X", "is there a skill for X", "do we have a skill for X"
- "I need to do X" where a skill might already cover it
- "extend my capabilities" / "I wish I had a skill for X"

## When NOT to use

- Building a brand-new skill from scratch -> `meta-skill-creator`
- Ranking which skills get used most -> `python3 scripts/skill-tiers.py`
- Installing a specific named optional skill -> `bash scripts/add-skill.sh <name>`

## The one hard rule

NEVER install an external skill globally (`npx skills add -g`, or any global
install that drops commands into the `/` picker). That is what floods the menu,
and it is the exact problem AI-OS exists to prevent. Outside finds always enter
through the backlog (inert), then the review pipeline, then live. AI-OS stays the
curated source of truth; nothing skips the line.

## Search order (stop at the first real match)

Search the cheapest, most-curated source first. Recommend ONE path with its command.

### 1. Live AI-OS skills (already have it?)
Search `.claude/skills/*/SKILL.md` frontmatter and the AGENTS.md Skill Registry for
a trigger match. If one exists, name it and use it. Done.

### 2. Skills Library backlog (a parked candidate?)
Search `skills-library/INDEX.md` (the vendored candidates, ~118 of them). If one fits:
- offer to **trial it in place** by reading its SKILL.md straight from
  `skills-library/backlog/...` (stays parked, NOT promoted), or
- if it keeps proving useful, **promote** it through triage -> review -> live.
Never run a backlog skill silently as if it were curated.

### 3. Optional AI-OS catalog (an off-the-shelf AI-OS skill?)
Check `.claude/skills/_catalog/catalog.json`. If a fit exists, install it with
`bash scripts/add-skill.sh <name>` - the supported, registered path.

### 4. Usage signal (already leaning on something un-graduated?)
Run `python3 scripts/skill-tiers.py`. If the need maps to a Tier A/B graduation
candidate the user already uses, recommend graduating that into AI-OS rather than
finding something new.

### 5. External ecosystem (last resort, backlog-bound)
Only if steps 1-4 turn up nothing. Use the open ecosystem to FIND, never to install:
- check the leaderboard at https://skills.sh first (most-installed, battle-tested),
- else `npx skills find <query>` to search by keyword,
- verify quality before recommending: install count (prefer 1K+), source reputation
  (vercel-labs, anthropics, microsoft over unknown authors), repo stars.
Then **vendor the chosen candidate into `skills-library/backlog/`** (inert, recorded
in INDEX.md) so it enters the pipeline. Do NOT `npx skills add -g`.

### 6. Nothing fits
Say so plainly. Offer to build a proper AI-OS skill with `meta-skill-creator`, or to
handle the task now with base knowledge. Never silently fall back to base knowledge
when a live skill or a fit-for-purpose backlog candidate exists.

## Output

One recommendation, not a menu (SOUL.md). Name the exact skill or candidate, its
source tier (live / backlog / catalog / external), and the single command or next
step. If you reached step 5, state the quality signals you checked.

## Why this shape

AI-OS already has the discovery primitives - the live registry, the backlog INDEX,
the optional catalog, the usage tiers, and `meta-skill-creator`. This skill is the
single front door over them, ordered so the curated, no-flood paths win and the
external ecosystem is a fallback that still respects the pipeline. See
`docs/skill-tiers.md` for the graduation rule this serves.
