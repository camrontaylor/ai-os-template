#!/usr/bin/env bash
# worktree-done.sh - finish with an AI-OS worktree, losing nothing.
#
# Removes the worktree folder. If its branch has unique commits, they are archived
# as a git tag first (never hard-deleted, per AI-OS rules); a throwaway branch with
# no unique commits is just dropped. The symlinks inside the worktree vanish with
# the folder - the real brain in the primary checkout is never touched.
#
# Usage:  bash scripts/worktree-done.sh <name>

set -uo pipefail
NAME="${1:-}"
[[ -z "$NAME" ]] && { echo "usage: bash scripts/worktree-done.sh <name>" >&2; exit 2; }

ROOT="$(cd "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/.." 2>/dev/null && pwd)"
[[ -z "${ROOT:-}" ]] && { echo "not inside a git repo." >&2; exit 1; }
REPO="$(basename "$ROOT")"
DIR="$HOME/Desktop/Worktrees/$REPO/$NAME"
BRANCH="work/$NAME"

[[ -d "$DIR" ]] || { echo "no worktree at $DIR" >&2; exit 1; }

# Remove the worktree first (frees the branch so it can be archived/dropped).
git -C "$ROOT" worktree remove "$DIR" --force 2>/dev/null || {
  echo "could not remove worktree at $DIR (uncommitted work?). Commit or resolve, then retry." >&2
  exit 1
}
git -C "$ROOT" worktree prune 2>/dev/null || true

# Preserve any unique commits on the branch, then drop the branch.
if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  ahead="$(git -C "$ROOT" rev-list --count "main..$BRANCH" 2>/dev/null || echo 0)"
  if [[ "${ahead:-0}" -gt 0 ]]; then
    bash "$ROOT/scripts/archive-branch.sh" "$BRANCH" "auto-archived on worktree-done" || true
  else
    git -C "$ROOT" branch -D "$BRANCH" >/dev/null 2>&1 || true
  fi
fi

echo "Removed worktree $DIR."
echo "(Branch $BRANCH: archived as a tag if it had commits, otherwise dropped. Your brain is untouched.)"
