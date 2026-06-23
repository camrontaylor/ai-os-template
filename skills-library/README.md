# Skills Library

A staging area for skills collected from elsewhere - used before, might be useful later, or
clearly wanted but not yet adapted. It sits **below** the live catalog and feeds into it.

```
backlog ──────► triage ──────► review ──────► live  (.claude/skills/{cat}-{name})
dump            I refine it    you sign        curated, registered, auto-routed
everything,     into "ours"    off here        (the existing system - unchanged)
raw, inert      + interview
```

This is a deliberate tier under AI-OS's existing ladder (`.claude/skills/` ←
`_catalog/catalog.json`). It is **inert by default**: nothing here is auto-loaded at session
start, auto-discovered by Claude Code, or touched by skill reconciliation. The only file read
at runtime is `INDEX.md`, and only on the Task-Routing fallback (see `AGENTS.md → Skills
Library`).

---

## The four stages

| Stage | Folder | Meaning | Auto-routed? |
|-------|--------|---------|:---:|
| **backlog** | `backlog/` | Raw dump, grouped by source. Candidates, not capabilities. | No |
| **triage** | `triage/` | You move a candidate here to signal interest - this is what triggers the assessment. | No |
| **review** | `review/` | The `ASSESSMENT.md` (intent, dependencies, grain-fit, past uses, per-piece dispositions) + a Notion task, waiting on your sign-off. | No |
| **live** | `.claude/skills/` | Registered, curated, the real catalog. | Yes |

A skill only crosses each line deliberately - and only reaches **live** after you sign off on
its `review/<skill>/ASSESSMENT.md`.

---

## How it's managed (`meta-skill-intake` owns this)

The stages are triggers, not just folders:

1. **backlog (automatic default).** Any skill or repo brought into a session lands here,
   inert and registered. Never `skills add`, never into Claude. No assessment yet.
2. **triage (your trigger).** When you move a candidate into `triage/`, that fires the
   assessment. Nothing is assessed until you do this.
3. **assess.** `meta-skill-intake` reads the whole candidate (every sub-skill of a repo) and
   reasons against AI-OS - inferred intent, a dependency map (have/need), a grain-check
   against AI-OS principles, real past-use cases mined from `context/memory/`, and per-piece
   dispositions (NEW / MERGE / REDUNDANT / DE-TAILOR / SYNERGY). Analysis only; nothing is
   restructured here.
4. **review.** The `ASSESSMENT.md` moves to `review/` and a task is added to your Notion
   Tasks dashboard (today's list) so it surfaces for sign-off.
5. **promote | park.** On your sign-off the recommendations are executed (decompose / bundle
   / merge / de-tailor / register, with per-agent targeting). Rejected candidates are parked,
   never deleted.

**Optional cron:** the `skills-library-*` jobs (currently disabled) can scan and pre-stage on
a schedule. They predate this assess flow and need a rewrite before being enabled.

---

## Promotion = your existing bar

Registration runs the normal pipeline: `meta-skill-creator` + the full checklist (category
prefix, frontmatter < 1024 chars, Skill Registry + Context Matrix rows, `context/learnings.md`
section, humanizer gate for publishable text, declared dependencies). The library is a head
start, not a shortcut around registration. New categories (e.g. `sec`, `eng`) are added only
when the first skill in that domain is actually promoted.

---

## Status vocabulary (in `INDEX.md` / `.catalog.json`)

`backlog` → `triage` → `review` → `promoted:{cat}-{name}` | `parked`

`Active dup?` flag = a skill of that name/function is already live in the session (most of the
marketing set). Routing skips those - kept only so the backlog is a complete record.

A skill is never deleted (no-hard-delete rule) - parked, not removed.

## Files

- `INDEX.md` - the human catalog routing reads (the only file consulted at runtime)
- `.catalog.json` - machine mirror
- `sources.json` - upstream repos, licenses, commit SHAs, provenance
- `backlog/`, `triage/`, `review/`, `live/` - the staging stages (each has its own README explaining what happens at that stage)

## Not to be confused with

`.claude/skills/_catalog/catalog.json` - AI-OS's registry of *first-party optional* skills.
This library is *third-party / collected* candidates: different source, trust level, pipeline.

## Provenance & licensing

See `sources.json`. The cybersecurity, marketing, and thinking-partner packs are MIT
licensed with upstream attribution preserved, so they are safe to redistribute. Only
vendor publish-safe (MIT, Apache, BSD) packs into this library; keep anything
all-rights-reserved out of a public template.
