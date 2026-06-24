#!/usr/bin/env bash
# base-autosave.sh - keep the PRIMARY checkout clean by committing leftover work.
#
# Shared, tool-neutral logic: Claude SessionEnd, Codex Stop, and any other tool's
# session-end adapter call this so the "clean primary" guarantee is not Claude-only.
#
# Why: the Claude Desktop stash prompt (#62142) fires on a dirty checkout. Keeping
# the primary committed means the next session always opens clean and is never
# blocked. The user never has to commit by hand.
#
# Safe by construction:
#   - Only runs in the primary checkout; no-op in worktrees (disposable).
#   - Skips when AI_OS_AUTONOMOUS=1 (cron / headless runs) so autonomous jobs
#     never commit onto the interactive user's history.
#   - Single-instance lock via mkdir so concurrent sessions cannot race on the
#     git index (Claude SessionEnd + Codex Stop in the same primary).
#   - Rate-limited to one run per 60 seconds so a tool whose Stop fires per-turn
#     does not reproduce the per-turn commit flood.
#   - No-op on a clean tree, detached HEAD, or mid merge/rebase/cherry-pick.
#   - `git add -A` respects .gitignore (brain, .env, .command-centre stay out).
#   - Skips files larger than MAX_BYTES (5 MB) using a cross-platform size check.
#     SKIPPED FILES ARE LOGGED to .command-centre/autosave-pending.log so the next
#     session can surface them to the user instead of dropping them in silence.
#   - If HEAD is NOT main on the primary, the commit still happens (the work is
#     preserved) but a warning is logged to .command-centre/branch-state.log so
#     the next session can surface "your folder is on branch X, not main".
#   - Never deletes, never pushes, never stashes, never switches branch.

set -uo pipefail
MAX_BYTES=$((5 * 1024 * 1024))    # skip files larger than 5 MB
MIN_INTERVAL=60                   # at most one autosave per 60 seconds

# ------------------------------------------------------------ headless skip
[ "${AI_OS_AUTONOMOUS:-}" = "1" ] && exit 0

# ------------------------------------------------------------ locate primary
COMMON="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || exit 0
[ -n "$COMMON" ] || exit 0
BASE="$(cd "$COMMON/.." 2>/dev/null && pwd)" || exit 0
TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ "$BASE" = "$TOP" ] || exit 0    # worktree -> leave it alone

cd "$BASE" || exit 0
LOGDIR="$BASE/.command-centre"
mkdir -p "$LOGDIR" 2>/dev/null

# ------------------------------------------------------------ rate limit
STAMP="$LOGDIR/autosave-last-run"
NOW="$(date +%s)"
if [ -f "$STAMP" ]; then
  LAST="$(cat "$STAMP" 2>/dev/null || echo 0)"
  if [ "$((NOW - LAST))" -lt "$MIN_INTERVAL" ]; then exit 0; fi
fi

# ------------------------------------------------------------ lock (mkdir is atomic)
LOCK="$LOGDIR/autosave.lock"
if ! mkdir "$LOCK" 2>/dev/null; then exit 0; fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM

# ------------------------------------------------------------ pre-commit safety
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" || exit 0
[ "$BRANCH" = "HEAD" ] && exit 0

GITDIR="$(git rev-parse --path-format=absolute --git-dir 2>/dev/null)" || exit 0
for marker in MERGE_HEAD rebase-merge rebase-apply CHERRY_PICK_HEAD; do
  [ -e "$GITDIR/$marker" ] && exit 0
done

[ -z "$(git status --porcelain 2>/dev/null)" ] && exit 0

git add -A 2>/dev/null || exit 0

# ------------------------------------------------------------ size guard (portable)
skipped=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  # wc -c works on macOS, Linux, and Git Bash; stat flags vary between them.
  sz="$(wc -c < "$f" 2>/dev/null | tr -d ' ')"
  if [ "${sz:-0}" -gt "$MAX_BYTES" ]; then
    git reset -q HEAD -- "$f" 2>/dev/null || true
    skipped="${skipped}${f} "
  fi
done < <(git diff --cached --name-only 2>/dev/null)

if [ -n "$skipped" ]; then
  # Log to a file the next SessionStart can surface to the user. Stderr alone
  # gets swallowed by Claude's hook surface, so we persist instead.
  printf '[%s] skipped over 5MB on branch %s: %s\n' "$(date '+%Y-%m-%d %H:%M')" "$BRANCH" "$skipped" \
    >> "$LOGDIR/autosave-pending.log"
fi

# Nothing left after the size guard -> stop.
git diff --cached --quiet 2>/dev/null && { date +%s > "$STAMP" 2>/dev/null || true; exit 0; }

# ------------------------------------------------------------ off-main warning
# If the primary is on a non-main branch, the work is preserved (it is still
# committed) but we tell the next session so the user is not surprised by
# "where is my work" - they will see a plain note that says "you are on X".
if [ "$BRANCH" != "main" ]; then
  printf '[%s] autosaved %s file(s) on side branch %s (not main)\n' \
    "$(date '+%Y-%m-%d %H:%M')" \
    "$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')" \
    "$BRANCH" \
    >> "$LOGDIR/branch-state.log"
fi

TS="$(date +'%Y-%m-%d %H:%M')"
git commit -q -m "chore: autosave [$TS]" 2>/dev/null || true
date +%s > "$STAMP" 2>/dev/null || true
exit 0
