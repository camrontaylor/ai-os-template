#!/usr/bin/env bash
# base-return-to-main.sh - at SessionStart, return PRIMARY to main when safe,
# or surface a clear plain-English message about why it cannot.
#
# Why: a non-developer should always see "the folder" as main. If the primary
# was left on a side branch (by another session, an experiment, a worktree-done
# that missed), the next interactive session would commit work onto that branch
# - work the user cannot find. This script keeps the primary on main when it can,
# and tells the user (via a memory note Claude reads at startup) when it cannot.
#
# Hard rules: this is OBSERVE-AND-INFORM at SessionStart, not auto-mutate work.
#   - Only acts in the primary checkout; no-op in worktrees.
#   - Skips when AI_OS_AUTONOMOUS=1 (cron / headless).
#   - Single-instance via the same lock as base-autosave (mkdir).
#   - Does NOT commit anything at SessionStart. If the tree is dirty, it leaves
#     it dirty and writes a note for the user. SessionEnd will autosave later.
#   - Switches to main ONLY when: clean tree, not detached, no mid-op, main
#     exists, and HEAD is an ancestor of main (so no feature-branch commits are
#     silently abandoned).
#   - Messages go to .command-centre/branch-state.log so the next interactive
#     session can surface them. Stderr alone is swallowed by Claude's hook surface.

set -uo pipefail

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

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" || exit 0
[ "$BRANCH" = "HEAD" ] && exit 0
[ "$BRANCH" = "main" ] && exit 0  # already home -> silent no-op

GITDIR="$(git rev-parse --path-format=absolute --git-dir 2>/dev/null)" || exit 0
for marker in MERGE_HEAD rebase-merge rebase-apply CHERRY_PICK_HEAD; do
  if [ -e "$GITDIR/$marker" ]; then
    printf '[%s] mid-operation on %s (merge or rebase in progress); not switching\n' \
      "$(date '+%Y-%m-%d %H:%M')" "$BRANCH" >> "$LOGDIR/branch-state.log"
    exit 0
  fi
done

git show-ref --verify --quiet refs/heads/main || exit 0

# ------------------------------------------------------------ lock
LOCK="$LOGDIR/autosave.lock"
if ! mkdir "$LOCK" 2>/dev/null; then exit 0; fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM

# ------------------------------------------------------------ dirty tree?
# Do NOT auto-commit at SessionStart. Just tell the user.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  COUNT="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  printf '[%s] folder is on side branch %s with %s uncommitted change(s); not switching to main automatically. SessionEnd will save them on %s.\n' \
    "$(date '+%Y-%m-%d %H:%M')" "$BRANCH" "$COUNT" "$BRANCH" \
    >> "$LOGDIR/branch-state.log"
  exit 0
fi

# ------------------------------------------------------------ ancestor check
# If HEAD has commits ahead of main, do NOT silently switch (would abandon
# the branch tip from the user's view). Surface the state instead.
if ! git merge-base --is-ancestor HEAD main 2>/dev/null; then
  AHEAD="$(git rev-list --count main..HEAD 2>/dev/null || echo unknown)"
  printf '[%s] folder is on side branch %s with %s commit(s) ahead of main. Ask: "bring that work onto main" to merge it, or "archive that branch" to set it aside.\n' \
    "$(date '+%Y-%m-%d %H:%M')" "$BRANCH" "$AHEAD" \
    >> "$LOGDIR/branch-state.log"
  exit 0
fi

# ------------------------------------------------------------ safe switch
git checkout --quiet main 2>/dev/null || exit 0
printf '[%s] switched folder back to main (was on %s; no commits abandoned)\n' \
  "$(date '+%Y-%m-%d %H:%M')" "$BRANCH" \
  >> "$LOGDIR/branch-state.log"
exit 0
