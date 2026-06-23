# ASSESSMENT: meta-skill-intake

**Staged:** 2026-06-22 · **Status:** awaiting your sign-off · **Proposed live name:** `meta-skill-intake`

## What it is

The skill that owns the skills-library pipeline (intake / assess / trial / promote / park)
with an **intelligence layer** built into the `assess` step. It is the operational owner the
workflow was missing - until now the pipeline was prose in AGENTS.md plus my discretion, with
nothing that actually ran it.

## Why it exists

You asked for intelligence in the intake process: not just filing a backlog skill, but
reading its full contents and reasoning about *why you grabbed it*, its real potential for
you, and a part-by-part breakdown against how AI-OS works and what you already run - so that
"only this one method is worth taking, and it should merge into an existing skill, not be
promoted whole" becomes a concrete output in the review folder. This skill encodes that.

## What promoting it changes

- Adds `meta-skill-intake` to `.claude/skills/` (one entry), Skill Registry, Context Matrix,
  and a `context/learnings.md` section.
- Future intake routes through it: vendor-to-backlog, then an `ASSESSMENT.md` per candidate.
- It calls `meta-skill-creator` at promotion time for registration; it does not replace it.

## Decisions for you

1. **Name / category:** `meta-skill-intake` (system/meta). Good, or prefer another?
2. **Naming (resolved in QA):** the single review-folder artifact is `ASSESSMENT.md` (this
   file) - it holds the analysis plus the sign-off questions. AGENTS.md, the README, and the
   crons were aligned to this name; the old `REVIEW.md` convention is retired.
3. **Scope of the first run:** I have done `planner` as the worked example (see
   `review/planner/ASSESSMENT.md`). Do you want me to assess the rest of the backlog next
   (cybersecurity 29, marketing 44, thinking-partner), or only specific packs?

## Revision log

- 2026-06-22 v0.1 - drafted, staged for review with the planner assessment as the worked example.
- 2026-06-22 v0.2 - QA pass: trimmed frontmatter under 1024 chars, unified the review artifact name to ASSESSMENT.md across AGENTS.md/README/crons, flagged the stale crons as disabled.
