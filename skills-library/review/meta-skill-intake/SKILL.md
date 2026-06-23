---
name: meta-skill-intake
description: >
  Owns the skills-library pipeline with an intelligence layer. Use when the user brings in an
  outside skill or repo, moves a candidate to triage, asks to assess one, or decides whether
  to promote it. Triggers: pasting a repo/skill, "vendor this to backlog", "I moved X to
  triage", "assess X", "what's the potential of X", "should I promote X", "what parts of X are
  worth keeping". Step 1 (automatic): any new skill/repo in a session routes to
  skills-library/backlog/ (inert, never `skills add` or into Claude). Step 2: moving a
  candidate into skills-library/triage/ triggers a full assessment - read its whole contents
  and reason against AI-OS (live skills, conventions, SOUL/USER, connectors, cron, memory) for
  intent, dependencies, grain-fit, past use cases, and per-piece dispositions. The ASSESSMENT.md
  then moves to review/ and a task is added to the user's Notion dashboard. Never auto-promotes.
---

# Meta Skill Intake

Owns `skills-library/` end to end with an intelligence layer. Moves candidates through
`backlog -> triage -> assess -> review -> promote | park` without ever auto-injecting into
Claude. The library is the staging tier below `.claude/skills/`.

## The pipeline

| Step | Stage | Trigger | What happens |
|------|-------|---------|--------------|
| 1 | **backlog** (default) | **Automatic** - any skill or repo brought into a session | Vendor it into `skills-library/backlog/<name>/` (tarball, never `skills add`, never `.claude/skills/`). Register: `INDEX.md` row, `sources.json` entry, `LICENSES.md` row. Change nothing in the content. No assessment yet. |
| 2 | **triage** | **User moves a candidate into `skills-library/triage/`** (a deliberate "I'm interested") | This is the trigger for the assessment. Nothing is assessed until it reaches triage. |
| 3 | **assess** | Fires on triage | The intelligence layer (below). For a repo, assess the entirety of all its skills - do NOT decompose, bundle, or restructure here; that is a promote-time action. This step only produces the analysis. |
| 4 | **review** | Assessment complete | Move the candidate + its `ASSESSMENT.md` into `skills-library/review/`, then **add a task to the user's Notion dashboard** (below) so it surfaces in their day. |
| 5 | **promote / park** | User sign-off | On approval, EXECUTE the recommendations - decompose / bundle / merge / de-tailor / register via `meta-skill-creator`, with per-agent targeting. On rejection, park (status `parked`, never delete). |

## The intelligence layer (assess)

Read EVERYTHING in the candidate - every `SKILL.md`, every `references/` file, scripts,
evals, README. For a repo, cover every sub-skill. Then reason about it against the live
system. Load for context: the **Skill Registry + Context Matrix**, `context/SOUL.md` +
`context/USER.md`, `context/learnings.md`, relevant `brand_context/`, `docs/connectors.md`,
the cron runtime, and `context/memory/` + `context/transcripts/` (for real past use cases).

Write `review/<candidate>/ASSESSMENT.md` (one section per sub-skill if a repo) with:

1. **Snapshot** - source, license, size, vendored date, status (from `sources.json`).
2. **Inferred intent and potential** - why the user likely grabbed this, and the upside *for
   them specifically*, given their work, connected tools, and how AI-OS runs. Concrete.
3. **Capability decomposition** - every discrete piece (workflow, reference, script, method).
   One row each: what it does, how novel.
4. **Dependency map** - every MCP, `.env` key, service, and sibling skill it needs, each
   marked **have** (already in AI-OS) or **need (blocking)**. This is what makes integration
   predictable.
5. **Grain-check** - does any piece fight how AI-OS works? Check against: no-hard-delete, the
   single USER/memory model, the tool-agnostic contract, the category system, the humanizer
   gate, the voice rules. Flag conflicts explicitly - value is not enough if it breaks a principle.
6. **Past-use-case examples** - mine `context/memory/`, transcripts, and learnings for a few
   real moments where this skill would have been used (cite the date/decision). If none fit,
   theorise the most likely future trigger. Makes the value concrete, not abstract.
7. **Per-piece disposition** - `NEW` / `MERGE -> {live-skill}` / `REDUNDANT ({skill})` /
   `DE-TAILOR` / `SYNERGY -> {AI-OS system}`. Granularity is the point: one candidate can
   resolve into several destinations.
8. **Recommendation + open questions** - overall verdict, the concrete promote plan (name,
   category, what to strip, what to merge where, which agents), and the questions the user
   must answer to sign off. Thorough enough that approval makes integration mechanical.

## Adding the Notion review task (step 4)

When a candidate reaches review, create one task in the user's **Tasks** database so it
appears in today's list:

- Resolve the dashboard: `notion-search "dashboard"` → the **Tasks** data source
  (currently `collection://YOUR-NOTION-TASKS-COLLECTION-ID`; re-resolve if it moves).
- Create a page in that data source: `Task` = "Review skill: `<name>` - see
  skills-library/review/`<name>`/ASSESSMENT.md", status (`""`) = `Today`,
  `date:Date:start` = today. Report the Notion URL back.

## Rules

- **Never auto-inject.** Intake stops at backlog. Assess stops at review. Live happens only
  after sign-off (AGENTS.md Skills Library).
- **Triage is the human's trigger.** Do not assess a backlog skill until it is moved to triage.
- **Assess analyses; promote acts.** No decompose/bundle/merge/de-tailor until promotion.
- **No hard deletes.** Rejected candidates are parked.
- **Promotion runs the full registration bar** via `meta-skill-creator` (category prefix,
  frontmatter < 1024 chars, Skill Registry + Context Matrix rows, learnings section,
  humanizer gate, per-agent targeting).
- **Ground every disposition** in the specific live skill or AI-OS subsystem it was checked
  against. No ungrounded verdicts.
