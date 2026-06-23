---
name: Weekly Skills-Library Digest
time: '09:00'
days: mon
active: 'false'
model: sonnet
notify: on_finish
description: 'Scans skills-library, ranks promotion candidates, and queues review proposals for the next session'
timeout: 10m
retry: '1'
---
STALE - DISABLED: this job predates the meta-skill-intake assess flow. It still references the old WORKING.md / _QUEUE.md / REVIEW.md stages. It is active:false; rewrite it to the backlog -> triage(trigger) -> assess -> ASSESSMENT.md + Notion-task flow before enabling.

You are running as a scheduled job for AI-OS.

Read CLAUDE.md for system context, then read `skills-library/README.md` for the
backlog → triage → review → live pipeline and the promotion rules.

Task: pre-stage promotion proposals so they get raised in the next interactive session. You
PREPARE a queue only - you do NOT move files, draft full SKILL.md files, or register anything.

Steps:

1. Read `skills-library/INDEX.md` and `skills-library/.catalog.json`. Build the candidate set:
   - **Triage skills** that already have a `WORKING.md` and a drafted SKILL.md → candidates to advance to `review/`.
   - **Backlog skills** with `Active dup? = no` (net-new). Skip anything with `Active dup? = yes`, status `parked`, or already `promoted`.

2. Read the last 7 days of session logs in `context/memory/*.md` (today and the 6 prior dated
   files, whichever exist). Look for tasks where no live skill fit but a backlog/triage skill
   plausibly would have. Treat those matches as strong promotion signals.

3. Rank candidates by: (a) recent-usage signal from step 2, then (b) intrinsic value
   (net-new capability you don't already have live). Keep the **top 3-5 only** - this is a
   nudge, not a backlog dump.

4. Overwrite `skills-library/review/_QUEUE.md` with a dated digest:
   - Heading: `# Skills-Library - Promotion Queue` and `_Generated {YYYY-MM-DD} by weekly cron_`
   - For each ranked candidate, a short block:
     - `### <slug>  →  proposed {cat}-{name}`  (suggest a category + name)
     - **Why now:** one line (cite the usage signal if any, else the value)
     - **Open questions for you:** 2-3 bullets I'll need answered to refine it
     - **Source:** owner/repo
   - If there are zero candidates, write a one-line "No new promotion candidates this week."

5. Surface it for next session: update `context/MEMORY.md` under `## Active Threads`.
   - Replace any existing line that starts with `Skills-library queue:` (do not append a new
     one each week - dedupe by replacing).
   - New line: `Skills-library queue: N promotion suggestion(s) ready in skills-library/review/_QUEUE.md`
     (use 0 and say "none this week" when empty).
   - First read `context/MEMORY.md` and check `wc -c`. Respect the 2,500-char cap: since you
     are replacing one line, this should not grow the file; if it would exceed the cap,
     consolidate stale `## Active Threads` lines first, then write. Never exceed the cap.

6. Output a one-paragraph summary of what you queued (or that nothing qualified).

Error handling: if `skills-library/` is missing, output "Skills-library not present - nothing
to scan." and stop. Never delete files. Never move skills between stages - that is interactive
work for a live session.
