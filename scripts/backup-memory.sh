#!/usr/bin/env bash
#
# backup-memory.sh - branch-independent backup of the live (gitignored) memory layer.
#
# WHY THIS EXISTS
#   context/MEMORY.md, context/learnings.md, context/memory/ (and the per-client
#   equivalents under clients/*/context/) are deliberately gitignored. See the
#   ".gitignore" block "Live operational memory - per-machine, must not fork
#   across branches". Keeping them out of git stops them forking across branches
#   and stops a `git stash --include-untracked` sweeping them away. The trade-off
#   is that git is then NOT their backup. This script restores that safety net by
#   mirroring them to a location OUTSIDE the working tree, so a branch switch, a
#   stash, or a dead disk cannot take them with it. The no-fork guarantee stays
#   intact because nothing here is tracked by or committed to git.
#
# HOW IT WORKS
#   Each run writes an append-only, dated snapshot under
#   ~/.ai-os-memory-backup/snapshots/<timestamp>/ that mirrors the repo's relative
#   paths. Unchanged files are hardlinked against the previous snapshot
#   (rsync --link-dest), so a full point-in-time history costs almost no disk.
#   Nothing is ever deleted - this honours the AI-OS no-hard-delete rule.
#   A "latest" symlink always points at the newest snapshot.
#
# USAGE
#   bash scripts/backup-memory.sh            # take a snapshot (default)
#   bash scripts/backup-memory.sh list       # list snapshots, newest first
#   bash scripts/backup-memory.sh restore            # restore newest snapshot into the repo
#   bash scripts/backup-memory.sh restore <stamp>    # restore a specific snapshot
#
#   Destination override: set AI_OS_MEMORY_BACKUP_DIR to use a different folder
#   (for example an external drive or a synced folder).

set -euo pipefail

# --- locate the repo from this script, so it works from any cwd or branch ------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DEST_ROOT="${AI_OS_MEMORY_BACKUP_DIR:-$HOME/.ai-os-memory-backup}"
SNAP_DIR="$DEST_ROOT/snapshots"
LATEST_LINK="$DEST_ROOT/latest"

# --- the live memory layer: root + every client -------------------------------
# Only relative paths, so rsync -R preserves the structure under the snapshot.
# Emits a flat list of FILES (relative to repo root). Directories are expanded
# with find, because --files-from does not reliably recurse into listed dirs
# (openrsync does not), which would silently drop the daily logs.
collect_sources() {
  cd "$REPO_ROOT"
  local p
  for p in context/MEMORY.md context/learnings.md context/memory; do
    if [ -d "$p" ]; then find "$p" -type f
    elif [ -e "$p" ]; then printf '%s\n' "$p"; fi
  done
  shopt -s nullglob
  local c sub
  for c in clients/*/context; do
    for sub in MEMORY.md learnings.md memory; do
      if [ -d "$c/$sub" ]; then find "$c/$sub" -type f
      elif [ -e "$c/$sub" ]; then printf '%s\n' "$c/$sub"; fi
    done
  done
  shopt -u nullglob
}

write_readme() {
  cat > "$DEST_ROOT/README.md" <<'EOF'
# AI-OS live memory backup

Branch-independent backups of the gitignored "live memory layer" from AI-OS:
`context/MEMORY.md`, `context/learnings.md`, `context/memory/`, and the same files
under each `clients/*/context/`.

These files are gitignored on purpose (they must not fork across branches), so git
does not back them up. This folder does.

- `snapshots/<timestamp>/` - immutable, dated point-in-time copies. Never edited,
  never deleted. Unchanged files are hardlinked between snapshots, so history is
  cheap.
- `latest` - a symlink to the newest snapshot.

## Restore

```
cd <your AI-OS repo>
bash scripts/backup-memory.sh list            # see what's available
bash scripts/backup-memory.sh restore         # newest snapshot back into the repo
bash scripts/backup-memory.sh restore <stamp> # a specific snapshot
```

Restore takes a fresh backup of the current files first, then copies the snapshot
back without deleting anything, so you can never lose your current state by
restoring an old one.
EOF
}

cmd_backup() {
  mkdir -p "$SNAP_DIR"
  write_readme

  local stamp snapshot prev n
  stamp="$(date +%Y-%m-%d_%H%M%S)"
  snapshot="$SNAP_DIR/$stamp"
  # avoid clobbering if two runs land in the same second
  n=2
  while [ -e "$snapshot" ]; do snapshot="$SNAP_DIR/${stamp}-$n"; n=$((n+1)); done

  # previous snapshot (absolute) for hardlink dedup, if any
  prev=""
  if [ -L "$LATEST_LINK" ]; then
    prev="$(cd "$DEST_ROOT" && readlink "$LATEST_LINK" 2>/dev/null || true)"
    case "$prev" in
      /*) : ;;                          # already absolute
      *)  prev="$DEST_ROOT/$prev" ;;    # make absolute
    esac
    [ -d "$prev" ] || prev=""
  fi

  local sources
  sources="$(collect_sources)"
  if [ -z "$sources" ]; then
    echo "backup-memory: no live memory files found under $REPO_ROOT - nothing to back up."
    return 0
  fi

  cd "$REPO_ROOT"

  # Skip if nothing changed since the latest snapshot. Keeps the history
  # meaningful (one snapshot per real change) when called often, e.g. from a
  # SessionStart hook. Hash covers every source's path + contents.
  local current_hash=""
  if command -v shasum >/dev/null 2>&1; then
    current_hash="$(printf '%s\n' "$sources" | sort | while IFS= read -r f; do [ -n "$f" ] && shasum "$f" 2>/dev/null; done | shasum 2>/dev/null | awk '{print $1}')"
  fi
  if [ -n "$current_hash" ] && [ -n "$prev" ] && [ -f "$prev/.manifest-hash" ] \
     && [ "$(cat "$prev/.manifest-hash" 2>/dev/null)" = "$current_hash" ]; then
    echo "backup-memory: no changes since $(basename "$prev") - skipped."
    return 0
  fi

  mkdir -p "$snapshot"

  if command -v rsync >/dev/null 2>&1; then
    # -a archive, -R keep relative paths, --link-dest hardlink unchanged files
    local linkopt=()
    [ -n "$prev" ] && linkopt=(--link-dest="$prev")
    # ${arr[@]+...} guard keeps this safe under bash 3.2 + set -u when the array is empty
    printf '%s\n' "$sources" | rsync -aR --files-from=- ${linkopt[@]+"${linkopt[@]}"} "$REPO_ROOT/" "$snapshot/"
  else
    # fallback: plain recursive copy (full copy each run, no dedup)
    local f
    while IFS= read -r f; do
      mkdir -p "$snapshot/$(dirname "$f")"
      cp -R "$f" "$snapshot/$(dirname "$f")/"
    done <<< "$sources"
  fi

  ln -sfn "$snapshot" "$LATEST_LINK"
  [ -n "$current_hash" ] && printf '%s' "$current_hash" > "$snapshot/.manifest-hash"

  local file_count size
  file_count="$(find "$snapshot" -type f -o -type l | wc -l | tr -d ' ')"
  size="$(du -sh "$DEST_ROOT" 2>/dev/null | cut -f1 | tr -d ' ')"
  echo "backup-memory: snapshot $stamp - $file_count files. Total backup store: ${size:-?} at $DEST_ROOT"
}

cmd_list() {
  if [ ! -d "$SNAP_DIR" ]; then
    echo "backup-memory: no backups yet at $DEST_ROOT"
    return 0
  fi
  echo "Snapshots in $DEST_ROOT (newest first):"
  ls -1 "$SNAP_DIR" | sort -r | while IFS= read -r s; do
    [ -n "$s" ] || continue
    local sz
    sz="$(du -sh "$SNAP_DIR/$s" 2>/dev/null | cut -f1 | tr -d ' ')"
    printf '  %s  (%s)\n' "$s" "${sz:-?}"
  done
}

cmd_restore() {
  local stamp="${1:-}"
  local snapshot
  if [ -z "$stamp" ]; then
    [ -L "$LATEST_LINK" ] || { echo "backup-memory: no snapshots to restore."; exit 1; }
    snapshot="$(cd "$DEST_ROOT" && readlink "$LATEST_LINK")"
    case "$snapshot" in /*) : ;; *) snapshot="$DEST_ROOT/$snapshot" ;; esac
  else
    snapshot="$SNAP_DIR/$stamp"
  fi
  [ -d "$snapshot" ] || { echo "backup-memory: snapshot not found: $snapshot"; exit 1; }

  echo "backup-memory: snapshotting current state before restore..."
  cmd_backup

  echo "backup-memory: restoring $snapshot into $REPO_ROOT (no deletions)..."
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "$snapshot/" "$REPO_ROOT/"
  else
    cp -R "$snapshot/." "$REPO_ROOT/"
  fi
  echo "backup-memory: restore complete. Your prior state was saved as a fresh snapshot first."
}

case "${1:-backup}" in
  backup|"")  cmd_backup ;;
  list)       cmd_list ;;
  restore)    shift || true; cmd_restore "${1:-}" ;;
  *)          echo "usage: backup-memory.sh [backup|list|restore [<stamp>]]"; exit 2 ;;
esac
