# Backlog (skills-library stage 1)

Where new skill candidates land first. Each pack here is a collection of source skills not yet evaluated or promoted to live use. The folder structure is `backlog/<pack-name>/<skill-name>/SKILL.md`.

## Current packs

| Pack | Source | Notes |
|------|--------|-------|
| `cybersecurity-skills` | Security audit + prompt injection | 29 skills. OWASP-style. |
| `marketing` | Marketing planning + ad creative | 44 skills. The biggest pack. |
| `thinking-partner` | 150+ mental models, bundled as one skill | 1 skill. Router + on-demand catalog. |

## Candidate sources (not yet vendored)

Repos worth turning into a skill later, but not yet pulled in. They are NOT in `INDEX.md` (no `SKILL.md` to route to yet). Full provenance lives in `../sources.json` under `candidates`.

| Repo | License | What it is | Skill idea to extract |
|------|---------|------------|-----------------------|
| [farzaa/clicky](https://github.com/farzaa/clicky) | MIT | macOS app: an on-screen AI buddy that sees your screen, talks, and points at UI. Not a `SKILL.md`. | A screen-aware teaching / guided-walkthrough buddy. Mine the approach, not the code. |
| [TheCraigHewitt/seomachine](https://github.com/TheCraigHewitt/seomachine) | MIT | Claude Code workspace for long-form SEO blog content: 24 commands, 11 agents, 26 skills, plus GA4/GSC/DataForSEO data tooling. | The SEO content pipeline (commands + agents + data integrations). The 26 skills mostly duplicate the marketing pack already here. |

## How a backlog skill graduates

```
backlog/<pack>/<name>/   ->   triage/<name>/   ->   review/<name>/   ->   live (.claude/skills/<category>-<name>/)
                              (sanity check)        (manual approval)        (rename + register)
```

Promotion is by hand, one skill at a time, because each one needs to be renamed to the AI-OS `{category}-{name}` convention, registered in `AGENTS.md`, and given a learnings section. The automated review and digest jobs (in `cron/jobs/`) ship with `active: false` until a hand-promotion is proven.

## Browsing tip

Backlog packs hold a LOT of skills. Use `find skills-library/backlog -name SKILL.md` to list them all, or `grep -l "<keyword>" skills-library/backlog/**/SKILL.md` to find ones matching an interest area.
