# Triage (skills-library stage 2)

The trigger stage. Moving a candidate here from `backlog/` is how you tell `meta-skill-intake` to run a full assessment on it. Nothing is assessed while a skill sits in `backlog/`.

## What happens here

1. Copy a skill or repo folder from `backlog/<pack>/<name>/` into `triage/<name>/` (or just say "I moved X to triage").
2. `meta-skill-intake` reads the whole thing and reasons about it against AI-OS - inferred intent, dependency map (have/need), grain-check, real past-use cases from `context/memory/`, and per-piece dispositions.
3. It writes `review/<name>/ASSESSMENT.md`, moves the candidate to `review/`, and adds a task to your Notion Tasks dashboard. This stage is analysis only - nothing is restructured here.
