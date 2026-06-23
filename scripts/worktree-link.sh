#!/usr/bin/env bash
# worktree-link.sh - make an AI-OS git worktree share the ONE real brain.
#
# Why this exists: git worktrees do NOT carry gitignored files. AI-OS keeps its
# live memory, secrets, and runtime state gitignored on purpose (they must not
# fork across branches). So a raw worktree would start with EMPTY memory and drift
# away from every other session. This script symlinks those per-machine, gitignored
# paths from the PRIMARY checkout into the worktree, so every session reads and
# writes the SAME brain.
#
# Safe: it only creates symlinks. It never deletes and never overwrites a real
# file - if a real (non-symlink) file or dir already sits at a target path, it is
# left untouched and reported. Idempotent: re-running fixes missing links and skips
# the ones already correct.
#
# Usage:  bash scripts/worktree-link.sh [worktree-path]   (defaults to current dir)

set -uo pipefail

# Primary checkout (the main worktree) = parent of the shared .git dir.
BASE="$(cd "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/.." 2>/dev/null && pwd)"
TARGET="${1:-$(pwd)}"
TARGET="$(cd "$TARGET" 2>/dev/null && pwd)"

if [[ -z "${BASE:-}" || -z "${TARGET:-}" ]]; then
  echo "worktree-link: not inside a git repo." >&2
  exit 0
fi

# Nothing to do when run inside the primary checkout itself - it IS the source.
if [[ "$BASE" == "$TARGET" ]]; then
  exit 0
fi

# Per-machine, gitignored paths that must be SHARED (not forked) across worktrees.
SHARED=(
  ".env"
  ".mcp.json"
  ".claude/settings.local.json"
  ".claude/skills/_catalog/installed.json"
  ".command-centre"
  ".memsearch"
  "context/MEMORY.md"
  "context/learnings.md"
  "context/memory"
  "context/transcripts"
  "context/_private"
  "context/notion"
)

# Per-client live memory (clients/<x>/context/...).
if [[ -d "$BASE/clients" ]]; then
  for cdir in "$BASE"/clients/*/; do
    [[ -d "$cdir" ]] || continue
    rel="clients/$(basename "$cdir")"
    SHARED+=(
      "$rel/context/MEMORY.md"
      "$rel/context/learnings.md"
      "$rel/context/memory"
      "$rel/context/_private"
    )
  done
fi

linked=0; kept=0; absent=0

# Symlink a single src -> dst, never clobbering a real file in the worktree.
link_one() {
  local src="$1" dst="$2" rel="$3"
  if [[ -L "$dst" && "$(readlink "$dst")" == "$src" ]]; then kept=$((kept+1)); return; fi
  if [[ -e "$dst" && ! -L "$dst" ]]; then
    echo "worktree-link: SKIP (real file present, not touched): $rel" >&2
    kept=$((kept+1)); return
  fi
  mkdir -p "$(dirname "$dst")"
  ln -sfn "$src" "$dst"
  linked=$((linked+1))
}

for rel in "${SHARED[@]}"; do
  src="$BASE/$rel"
  dst="$TARGET/$rel"
  # Only link things the primary actually has.
  [[ -e "$src" ]] || { absent=$((absent+1)); continue; }

  if [[ -d "$src" && ! -L "$src" && -d "$dst" && ! -L "$dst" ]]; then
    # Git materialized this dir in the worktree via a tracked placeholder
    # (e.g. .gitkeep). Don't replace the dir - link the gitignored files INSIDE it
    # so the real brain (daily logs, transcripts) is shared file-by-file. The
    # SessionStart hook re-runs each session, so newly added files get linked too.
    while IFS= read -r child; do
      [[ -z "$child" ]] && continue
      cname="$(basename "$child")"
      [[ "$cname" == ".gitkeep" ]] && continue
      link_one "$child" "$dst/$cname" "$rel/$cname"
    done < <(find "$src" -mindepth 1 -maxdepth 1 2>/dev/null)
  else
    # Clean case: target absent (or already a link) -> link the whole path.
    link_one "$src" "$dst" "$rel"
  fi
done

echo "worktree-link: $linked linked, $kept kept, $absent not in primary -> $TARGET"
