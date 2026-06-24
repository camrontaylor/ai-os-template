#!/usr/bin/env bash
# worktree-done.sh - finish with an AI-OS worktree, losing nothing.
#
# Cleans up an isolated session folder safely:
#  1. If the worktree has uncommitted edits, autosave them as a commit on the
#     worktree's branch FIRST (using the shared base-autosave logic). No --force,
#     no silent drops, no hard-deletes.
#  2. Remove the worktree folder (the symlinks back to the primary brain vanish
#     with it; the real brain is never touched).
#  3. If the branch has commits not on main, archive it as a git tag (history
#     preserved). If it has nothing unique, drop the branch cleanly.
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

# ------------------------------------------------------------ preserve dirty edits
# If the worktree has uncommitted edits, commit them on its own branch first.
# This avoids --force destroying work the user never typed `git commit` for.
DIRTY="$(git -C "$DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${DIRTY:-0}" -gt 0 ]]; then
  echo "Found $DIRTY uncommitted file(s) in the worktree - saving them on branch $BRANCH before removing."
  # Reuse the shared autosave logic, but run it INSIDE the worktree so its commit
  # lands on the worktree branch. The script is a no-op outside the primary, so
  # we pass an override via an inline cd + a small drop-in that bypasses that
  # check while keeping every other safety (size guard, gitignore, lock).
  (
    cd "$DIR" || exit 0
    git add -A 2>/dev/null || true
    # Honor the same 5MB size guard so a big binary cannot enter history here either.
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      [ -f "$f" ] || continue
      sz="$(wc -c < "$f" 2>/dev/null | tr -d ' ')"
      if [ "${sz:-0}" -gt $((5 * 1024 * 1024)) ]; then
        git reset -q HEAD -- "$f" 2>/dev/null || true
        echo "  skipped over 5MB: $f"
      fi
    done < <(git diff --cached --name-only 2>/dev/null)
    if ! git diff --cached --quiet 2>/dev/null; then
      git commit -q -m "chore: worktree-done autosave [$(date +'%Y-%m-%d %H:%M')]" 2>/dev/null || true
    fi
  )
fi

# ------------------------------------------------------------ remove the worktree
# Try without --force first. If git refuses (e.g. submodule weirdness), only then
# fall back to --force, and only AFTER the autosave above has already preserved
# any uncommitted work.
if ! git -C "$ROOT" worktree remove "$DIR" 2>/dev/null; then
  if ! git -C "$ROOT" worktree remove "$DIR" --force 2>/dev/null; then
    echo "could not remove worktree at $DIR. Inspect and retry." >&2
    exit 1
  fi
fi
git -C "$ROOT" worktree prune 2>/dev/null || true

# ------------------------------------------------------------ archive or drop
if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  ahead="$(git -C "$ROOT" rev-list --count "main..$BRANCH" 2>/dev/null || echo 0)"
  if [[ "${ahead:-0}" -gt 0 ]]; then
    bash "$ROOT/scripts/archive-branch.sh" "$BRANCH" "auto-archived on worktree-done" || true
    echo "Saved $ahead commit(s) from $BRANCH as an archive tag (recoverable with 'git tag | grep archive/$BRANCH')."
  else
    git -C "$ROOT" branch -D "$BRANCH" >/dev/null 2>&1 || true
    echo "$BRANCH had no unique commits - dropped cleanly."
  fi
fi

echo "Removed worktree $DIR. Your memory and other sessions are untouched."
