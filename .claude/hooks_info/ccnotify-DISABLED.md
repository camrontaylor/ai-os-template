# ccnotify - DISABLED (2026-06-15)

The custom native-macOS notification system (`ccnotify`) is **turned off**.
the maintainer is relying on Claude Code's and the Codex desktop app's own built-in
notifications instead.

## What was disabled

The `run-ccnotify.js` hook was removed from three events in `.claude/settings.json`
(at the root and in every `clients/*/.claude/settings.json` copy):

- `UserPromptSubmit`
- `Stop`
- `Notification`

Nothing else was touched. The `session-sync-*` hooks that shared those events were
**kept**. The scripts themselves (`run-ccnotify.js`, `ccnotify.py`, `ccnotify.db`)
were left in place untouched, so re-enabling is just re-wiring the hooks.

## How to re-enable (easiest: ask Claude "re-enable ccnotify notifications")

Re-add this object as the **first** entry in each of the three hooks arrays in the
root `.claude/settings.json` (swap the event name per block):

```json
{
  "type": "command",
  "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/run-ccnotify.js\" UserPromptSubmit"
}
```

- `UserPromptSubmit` block -> arg `UserPromptSubmit`
- `Stop` block -> arg `Stop`
- `Notification` block -> arg `Notification`

Then propagate to client folders with `bash scripts/update.sh` (or re-add the same
entries to each `clients/*/.claude/settings.json`).

Delete this file once notifications are back on.
