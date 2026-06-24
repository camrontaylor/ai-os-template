# AI-OS Template Stress Test vs Agentic OS Template

Date: 2026-06-24

Compared repositories:

- Current template: `<current-ai-os-template>`
- Baseline template: `<baseline-agentic-os-template>`

Scope note: this audit compares the current filesystem state, not only committed
`HEAD`. The current `ai-os-template` worktree was dirty during the audit, with a
large set of skill, doc, script, and template changes already present.

Remediation update: after this audit, the Command Centre test runner was changed
to run Node test files sequentially and `npm test` now passes `142/142`. The
Codex/Cursor adapter contract was also addressed by unignoring the intended
`.codex/` adapter files, adding `.cursor/rules/ai-os.mdc`, and removing local
absolute paths from `.codex/hooks.json`. The Google Fonts item remains noted
below as an original audit finding, but was explicitly deferred.

## Executive Verdict

`ai-os-template` is directionally stronger than `agentic-os-template`: it is more
tool-agnostic, has a richer self-maintenance layer, has local Codex adapters,
has a broader Command Centre surface, has client/brand scaffolding, and includes
a real health-check skill.

After remediation, the two highest-priority blockers from this audit are closed:
the Command Centre test suite passes and the Codex/Cursor adapter files are no
longer ignored. Remaining release concerns are narrower:

- The production build passes only when network is available for Google Fonts.
  This item was explicitly deferred.
- The build emits Turbopack/NFT tracing warnings that suggest overly broad
  server output tracing.
- The repo is in a dirty transition state, so the intended shipped skill set and
  docs should be settled before tagging a release.

## Stress Test Results

### Current `ai-os-template`

Command: `bash .claude/skills/meta-systems-check/scripts/check.sh`

Result: `HEALTHY`

- `0` critical
- `0` warnings
- `3` info
- `7` OK

Info items:

- `17 of 17` optional API keys are not set.
- Brand onboarding has not been run.
- `VERSION` is `0.2.3`, but `CHANGELOG.md` has no matching heading.

Command: `npm test` from `command-centre/`

Original result: failed.

- `139` tests
- `127` pass
- `12` fail

Failure clusters:

- Missing test stubs: `@/lib/clients`, `@/lib/pasted-text`, and
  `@/lib/api-error`.
- Chat draft storage expectations fail in `chat-drafts.test.cjs`.
- Cron log segmentation expectation fails in `task-logs.test.cjs`.
- Several chat-store tests fail because the harness cannot load `chat-store.ts`
  after the `@/lib/api-error` dependency was added.

Interpretation: some failures are test-harness drift, but at least the chat draft
and cron log failures look like behavior-contract changes. The suite needs to be
green before this is described as ready for external template users.

Remediation result: passed after making `scripts/run-tests.cjs` run Node test
files with `--test-concurrency=1`.

- `142` tests
- `142` pass
- `0` fail

Command: `npm run build` from `command-centre/`

Sandbox result: failed because `next/font` could not fetch Inter from Google
Fonts.

Network-enabled result: passed.

Build warnings:

- Turbopack reported `Encountered unexpected file in NFT list`.
- The trace points through `src/app/api/gsd/files/route.ts` and `next.config.ts`.

Interpretation: the app can build with network access, but the template is not
offline-build safe, and the output tracing warnings should be resolved before a
release meant for other machines.

### Baseline `agentic-os-template`

Command: `bash .claude/skills/meta-systems-check/scripts/check.sh`

Result: unavailable. The baseline has no `meta-systems-check` skill/script.

Command: `npm run test:cron` from `command-centre/`

Result: failed.

- `51` tests
- `38` pass
- `13` fail

Failure cluster:

- All observed failures were caused by `better-sqlite3` being compiled for a
  different Node module ABI: `NODE_MODULE_VERSION 137` vs required `127`.

Interpretation: the baseline is less testable out of the box in this local
environment. It likely needs `npm rebuild` or `npm install` before its cron tests
can say anything meaningful about behavior.

## Meaningful Differences

| Area | `ai-os-template` | `agentic-os-template` | Net read |
| --- | --- | --- | --- |
| Project identity | Renamed and reframed as AI-OS, a tool-agnostic agent workspace. | Still Claude-first Agentic OS. | Good direction for multi-agent use, but compatibility naming should be documented. |
| Core instructions | `AGENTS.md` is much larger: 873 lines vs 540. Adds Thinking Discipline, tool-agnostic runtime contract, session title fence, skill library policy, worktree policy, and Next Actions footer. | Simpler operating rules with no thinking discipline, no session title fence, no Next Actions footer, and no worktree policy. | Current is stronger as an operating system, but harder to keep internally consistent. |
| Tool adapters | Current has local `.codex/config.toml`, `.codex/hooks.json`, and 23 `.codex/hooks/*` files. `.gitignore` now unignores those intended adapter files, and `.codex/hooks.json` no longer contains local absolute paths. | No `.codex` adapter files. | Current has the better adapter implementation and is ready to ship it once the changed files are staged/committed. |
| Cursor support | Current now includes `.cursor/rules/ai-os.mdc` as a thin adapter back to `AGENTS.md`. | Missing Cursor adapter. | Current now satisfies its Cursor adapter contract. |
| Hook surface | Current has 23 `.claude/hooks` and 23 `.codex/hooks`, including autosave, worktree data linking, overwrite guard, footer checks, and session title hints. | Baseline has 15 `.claude/hooks` and no Codex hook mirror. | Current is operationally stronger, but hook drift risk is higher. |
| Health checking | Current has `meta-systems-check` and a read-only install health script. | Baseline lacks this. | Clear win for current. |
| Skills | Current has 25 live skills. Adds `meta-find-skills`, `meta-systems-check`, `meta-worktree`, `ops-agent-email`, `ops-versioning`, and the live ad creative engines for Codex, fal, and Figma. | Baseline has fewer system-maintenance skills and older tool-specific design/video capabilities. | Current is more self-maintaining and ad-creative focused; baseline keeps older external-tool integrations. |
| Skill staging | Current has `skills-library/` with 325 files plus `.agents/` skill material. | Baseline has no comparable staging library. | Current has a real promotion pipeline; footprint and curation burden are much higher. |
| Command Centre routes | Current adds `/api/connectors`, `/api/memory`, `/api/skills/catalog`, and `/api/skills/library`. | Baseline lacks those API routes. | Current exposes more of the operating system in the UI. |
| Command Centre UI | Current adds connectors, memory, project, skills-library/workspace views, shadcn UI primitives, theme provider, and theme toggle. | Baseline has the older UI surface. | Current is more app-like and maintainable, but the larger UI surface contributes to failing tests. |
| Package scripts | Current adds `npm test` and `postinstall`. | Baseline only has `test:cron`. | Current is more CI-ready in intent, but CI currently fails. |
| Dependencies | Current adds `class-variance-authority`, `clsx`, `cmdk`, `js-yaml`, `next-themes`, `radix-ui`, `sonner`, `tailwind-merge`, `tw-animate-css`, and `shadcn`. Baseline has `gray-matter` instead. | Baseline has fewer UI dependencies and less design-system machinery. | Current has a better modern UI stack, with more dependency surface. |
| Fonts/build | Current uses one Google font family, Inter. | Baseline uses Inter, Space Grotesk, and Epilogue from Google Fonts. | Current is simpler, but both depend on network font fetches unless fonts are vendored or replaced. |
| Docs | Current has 12 docs files, adding connectors, memory/cron, skills catalog, skill tiers, team sharing, worktree workspace, and coexistence mode. | Baseline has 4 docs files. | Current is substantially better documented, but docs now need stricter contract checks. |
| Scripts | Current has 106 script files vs baseline's 82. Adds memory backup, worktree helpers, team sharing, memsearch reindex, Notion sync, and autosave/return-to-main utilities. | Baseline has fewer operational scripts plus an older `scripts/admin/n8n-webhook-template.json`. | Current supports more workflows; the script surface needs dedicated regression coverage. |
| Client scaffolding | Current includes `clients/README.md`, example client folders, per-client `.claude/commands`, brand templates, and reference docs. | Baseline does not ship the same client scaffold files in the compared filesystem. | Good for onboarding and multi-client usage, but review examples carefully before public release. |
| Brand context | Current ships `brand_context/_templates/*`. | Baseline has less visible brand scaffolding. | Current is more template-ready for first-run onboarding. |
| External services | Current documents 17 `.env.example` keys. Baseline documents 12. Current adds AgentMail, fal, Figma, Notion, and Firecrawl while removing older video/design integrations. | Baseline has fewer current ops/design integrations. | Current has broader integrations; service registry and actual skill consumers should be reconciled. |
| Memory recall | Current has stronger memory docs and memsearch collection helper. Semantic search was blocked in sandbox by Milvus Lite lock permissions, so the audit used raw markdown memory as degraded mode. | Baseline has older memory docs. | Current is stronger, but Codex memory-search commands should request escalation first, as `AGENTS.md` now says. |
| Naming | Current still contains many `AGENTIC_OS_*` env names, `agentic_os_*` shell functions, and legacy `agentic-os` cache/test paths. | Baseline uses Agentic OS naming throughout. | Not inherently bad if kept as a backward-compatible API. It should be documented as legacy compatibility, not accidental stale branding. |

## Release Blockers For `ai-os-template`

1. Keep `command-centre/npm test` green.
   - Current remediation result: `142/142` passing.
   - The runner now uses `--test-concurrency=1` because the previous failures
     reproduced as cross-file isolation issues, while focused files passed.

2. Resolve the Codex/Cursor adapter contract mismatch.
   - Current remediation result: intended `.codex/` files are unignored,
     `.codex/hooks.json` is template-safe, and `.cursor/rules/ai-os.mdc` exists.

3. Remove the offline-build dependency on Google Fonts.
   - Prefer a vendored local font or a system font stack for the template.

4. Resolve the Turbopack/NFT tracing warnings.
   - Investigate dynamic filesystem imports through `src/app/api/gsd/files/route.ts`.
   - Keep server file tracing scoped to known directories.

5. Decide and document legacy naming.
   - Keep `AGENTIC_OS_*` as the compatibility environment namespace, or migrate
     it deliberately with aliases.
   - Do not leave it as ambiguous rename debt.

6. Settle the dirty worktree before release.
   - The audit saw many modified/deleted/untracked skills and docs.
   - That may be intentional, but a template release should have a clean diff and
     an updated `CHANGELOG.md` heading for `0.2.3`.

## What Current Does Better

- It can explain its own health through `meta-systems-check`.
- It has a real local Codex adapter surface instead of just saying Codex can
  read `AGENTS.md`, though that surface still needs to be tracked before release.
- It treats AI-OS as a shared agent operating system, not only a Claude Code
  project template.
- It has better documentation for memory, connectors, worktrees, teams, skill
  tiers, and skill staging.
- It has richer Command Centre capabilities for memory, connectors, skill
  libraries, and project views.
- It ships more practical setup scaffolding for clients and brand context.

## What Baseline Still Does Better

- It is smaller and easier to reason about.
- It has fewer hooks, scripts, dependencies, and policy surfaces to keep aligned.
- Its failures in this audit were mostly environmental native-module failures,
  while current has several first-party test-contract failures.
- It does not yet carry the same Cursor-adapter overpromise, because it does not
  claim as much explicit tool-agnostic parity.

## Bottom Line

Use `ai-os-template` as the future base. The test-suite and adapter-contract
blockers from this audit are addressed. The remaining release work is to settle
the dirty transition state, decide whether to address or accept the Turbopack
tracing warnings, and handle the deferred font/build portability item if it
matters for the release target.
