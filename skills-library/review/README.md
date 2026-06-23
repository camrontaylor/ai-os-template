# Review (skills-library stage 3)

The sign-off stage. A candidate here has an `ASSESSMENT.md` (the intelligence analysis + open questions) and a task on your Notion dashboard. You review and decide; live happens only on your sign-off.

## What happens here

You read the `ASSESSMENT.md`, then approve / request changes / park. **On your sign-off**, promotion runs:

1. Rename the folder to the AI-OS convention: `<category>-<name>` (categories: `mkt`, `str`, `ops`, `viz`, `acc`, `meta`, `tool`).
2. Update the `name:` in the YAML frontmatter to match the new folder name.
3. Make sure the SKILL.md follows the AI-OS pattern: under 1024-char description, trigger phrases, output path, learnings reference, dependencies declared.
4. Test it once by hand against a real task.
5. If it works: move to `.claude/skills/<category>-<name>/` (NOT `live/`; live is the active AI-OS skills dir), and register it in `AGENTS.md` (Skill Registry table + Context Matrix), in `.claude/skills/_catalog/catalog.json`, and add a learnings section in `context/learnings.md`.

## Why the live folder is empty

Skills do not stay in `skills-library/live/` once promoted. The real live home is the AI-OS-wide `.claude/skills/` directory, where AI-OS picks them up by trigger word. The `live/` here is just a holding pen for the final pre-move test.
