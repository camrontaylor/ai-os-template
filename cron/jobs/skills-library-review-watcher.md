---
name: Skills-Library Review Watcher
time: '08:00'
days: daily
active: 'false'
model: sonnet
notify: on_error
description: 'Daily: applies your notes in skills-library/review (refines drafts), and re-alerts on items awaiting you'
timeout: 12m
retry: '1'
---
STALE - DISABLED: this job predates the meta-skill-intake assess flow. It looks for review/*/REVIEW.md; the flow now produces ASSESSMENT.md. It is active:false; rewrite it before enabling.

You are running as a scheduled job for AI-OS.

Read CLAUDE.md for system context, then `skills-library/README.md` for the pipeline and rules.

Task: keep the review loop moving. For each item awaiting the user, either apply their notes
(refinement round) or re-alert that it's still waiting. You operate ONLY on draft files inside
`skills-library/review/` and `skills-library/triage/`. You NEVER edit `.claude/skills/`, never
promote a skill live, and never delete anything.

Steps:

1. List `skills-library/review/*/REVIEW.md` (ignore `_TEMPLATE.md`, `README.md`, `_QUEUE.md`).
   If none, output "No items in review." and stop.

2. For each `REVIEW.md`, read it and classify by the `DECISION:` line and the `## My notes / context` block:

   a. **DECISION: Changes** OR non-empty `## My notes / context` (with no Approve/Park) →
      **Refinement round.** Read the notes + any inline answers. Revise the drafted `SKILL.md`
      (and `WORKING.md` if present) in that review folder to apply them. Then:
      - increment the `**Revision:** N` counter in the header,
      - append a dated entry to `## Revision log` summarising what you changed,
      - MOVE the user's note text into that Revision log entry and clear the
        `## My notes / context` block back to empty (so the same notes aren't re-applied tomorrow),
      - reset `DECISION:` to empty and add a line at the top of the file:
        `> Revised {date} per your notes - ready for re-review.`
      Keep edits bounded to the draft. Do not invent scope the notes didn't ask for.

   b. **DECISION: Approve** → do NOT promote (promotion is interactive). Add it to an
      "approved, ready to promote" list for the summary.

   c. **DECISION: Park** → leave the files in place (never delete). Note it for the summary;
      the live session will flip its `INDEX.md` status to `parked`.

   d. **No decision, no notes** → it's still waiting on the user. Compute days waiting from the
      `**Staged:**` date. Count it; flag any waiting > 3 days as a re-alert.

3. Refresh `context/MEMORY.md` under `## Active Threads`:
   - First read the file and check `wc -c` (cap is 2,500 chars).
   - Replace any existing line starting `Skills-library review:` (dedupe - do not append a new
     one each day). New line, omitting any zero buckets:
     `Skills-library review: {A} awaiting you ({R} >3 days), {B} refined & ready for re-review, {C} approved & ready to promote - see skills-library/review/`
   - If everything is empty, remove the line entirely. Stay under the cap; consolidate stale
     `## Active Threads` lines first if needed.

4. Output a one-paragraph summary: what you refined, what's waiting, what's approved.

Error handling: if `skills-library/review/` is missing, output "No review folder - nothing to
do." and stop. Never delete files. Never edit `.claude/skills/`. Never promote.
