#!/usr/bin/env bash
# Shared helpers for ops-versioning scripts. Source this from the other scripts.
# Mirrors the agentic-os house style (ops-website/_common.sh): plain, parseable output.

info() { printf '   %s\n' "$*"; }
ok()   { printf 'OK   %s\n' "$*"; }
warn() { printf 'WARN %s\n' "$*"; }
err()  { printf 'ERR  %s\n' "$*" >&2; }

# Resolve this script directory the same way the ops-website scripts do.
OPS_VERSIONING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Echo the .versions/<basename>/ directory for a given file path.
# Snapshots for DIR/NAME.EXT live in DIR/.versions/NAME.EXT/.
# The "--" stops dirname/basename from eating a target whose name starts with a
# dash (for example "-weird.md"); without it BSD dirname reports "illegal option".
resolve_versions_dir() {
  local target="$1"
  local dir base
  dir="$(cd "$(dirname -- "$target")" && pwd)"
  base="$(basename -- "$target")"
  printf '%s\n' "$dir/.versions/$base"
}

# Turn a label into a safe slug: lowercase, spaces and junk to hyphens, trimmed.
slugify() {
  local raw="$1"
  printf '%s' "$raw" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

# Timestamp used in snapshot filenames: 2026-06-22_1430
now_stamp() {
  date +%Y-%m-%d_%H%M
}

# Echo every snapshot file actually on disk (basenames only), oldest first.
# Filenames start with a sortable stamp (YYYY-MM-DD_HHMM[...]), so a plain sort is
# chronological. The index and any in-progress temp index (index.md.tmp.*) are
# excluded. Prints nothing if the dir has no snapshots.
disk_snapshots() {
  local vdir="$1"
  if [ -d "$vdir" ]; then
    find "$vdir" -maxdepth 1 -type f \
      ! -name 'index.md' ! -name 'index.md.tmp.*' 2>/dev/null \
      | sort \
      | while IFS= read -r f; do basename -- "$f"; done || true
  fi
}

# List snapshot filenames (basenames only) in chronological order, oldest first.
# Both the index and the disk are reconciled, THEN the result is sorted strictly by
# the YYYY-MM-DD_HHMM stamp embedded in each filename, so order is correct even when
# the index lists real files in the wrong order.
#
# Why both sources: the on-disk files are the real history (a missing, header-only,
# truncated, or stale index must NEVER hide a frozen copy from list / restore / diff),
# while the index still decides the order WITHIN one minute (same-stamp ties), where a
# raw filename sort would be arbitrary. So we:
#   1. build the reconciled set = index order first, then any on-disk orphan, and
#   2. stable-sort that set by the leading stamp, keeping the step-1 order for ties.
# Echoes one basename per line; prints nothing if there are no snapshots.
list_snapshots() {
  local vdir="$1"
  local index="$vdir/index.md"

  # Indexed filenames, in index order.
  local indexed=""
  if [ -f "$index" ]; then
    indexed="$(grep -E '^[0-9]+\. ' "$index" 2>/dev/null \
      | sed -nE 's/.*`([^`]+)`.*/\1/p' || true)"
  fi

  # All files on disk, chronological.
  local ondisk
  ondisk="$(disk_snapshots "$vdir")"

  # Step 1: reconciled order = indexed (still on disk) first, then on-disk orphans.
  # We tag each line with the embedded stamp and a stable sequence number so step 2
  # can sort by stamp without losing the within-minute reconciled order. A file with
  # no parseable stamp gets a high sentinel stamp so it sorts last (after real dates),
  # never silently dropped.
  local seen name stamp seq=0
  reconciled() {
    while IFS= read -r name; do
      [ -z "$name" ] && continue
      if [ -e "$vdir/$name" ]; then
        stamp="$(printf '%s' "$name" | sed -nE 's/^([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}).*/\1/p')"
        [ -z "$stamp" ] && stamp="9999-99-99_9999"
        seq=$((seq + 1))
        printf '%s\t%010d\t%s\n' "$stamp" "$seq" "$name"
        seen="$seen
$name"
      fi
    done <<EOF
$indexed
EOF
    while IFS= read -r name; do
      [ -z "$name" ] && continue
      case "
$seen
" in
        *"
$name
"*) ;;                  # already emitted from the index
        *)
          stamp="$(printf '%s' "$name" | sed -nE 's/^([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}).*/\1/p')"
          [ -z "$stamp" ] && stamp="9999-99-99_9999"
          seq=$((seq + 1))
          printf '%s\t%010d\t%s\n' "$stamp" "$seq" "$name"
          ;;
      esac
    done <<EOF
$ondisk
EOF
  }

  # Step 2: stable sort by stamp (col 1) then by reconciled sequence (col 2), then
  # strip both helper columns, leaving just the basename in chronological order.
  reconciled | sort -t "$(printf '\t')" -k1,1 -k2,2n | cut -f3-
}

# Byte size of a file, portable across macOS (stat -f) and GNU (stat -c).
file_size() {
  local f="$1"
  if stat -f%z "$f" >/dev/null 2>&1; then
    stat -f%z "$f"
  else
    stat -c%s "$f"
  fi
}

# Return success if the path lives inside a separate/deploy git project that should
# NOT use file snapshots, and echo a one-word reason on stdout so the caller can word
# the refusal correctly. It returns FALSE (and echoes nothing) for ordinary documents
# that merely sit inside the AI-OS workspace, even though that workspace is itself a
# git repo with a remote. The old "any remote = deploy" rule wrongly caught every doc
# in AI-OS; we only refuse when one of these tighter signals holds:
#   1. the path is under projects/live/<name>/site  (the live site checkout)   -> "deploy"
#   3. that repo's top level carries a deploy marker (vercel.json/next.config.*) -> "deploy"
#   2. the file sits in a DIFFERENT git repo than the AI-OS workspace            -> "other-repo"
# Reason codes:
#   "deploy"     = a real website/app deploy project (rule 1 or 3) -> strong Live-flow wording.
#   "other-repo" = just a separate, non-deploy git repo (rule 2)   -> soft "separate project" wording.
is_deploy_repo() {
  local target="$1"
  local dir
  if [ -d "$target" ]; then
    dir="$(cd "$target" && pwd)"
  else
    dir="$(cd "$(dirname -- "$target")" && pwd)"
  fi

  # 1. Path-based signal: anything under projects/live/<name>/site.
  case "$dir" in
    */projects/live/*/site|*/projects/live/*/site/*) printf 'deploy\n'; return 0 ;;
  esac

  # Not in a git work tree -> a plain document; snapshot it.
  git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1

  local toplevel
  toplevel="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)"
  [ -z "$toplevel" ] && return 1

  # 3. An explicit deploy marker at the repo top level = a real website/app, even if
  #    it happens to be the same repo. Check this BEFORE the separate-repo rule so a
  #    nested product repo that DOES carry a marker still reads as a true deploy.
  if [ -f "$toplevel/vercel.json" ] \
     || ls "$toplevel"/next.config.* >/dev/null 2>&1; then
    printf 'deploy\n'
    return 0
  fi

  # The AI-OS workspace root: this scripts dir is .../AI-OS/.claude/skills/ops-versioning/scripts.
  local aios_root
  aios_root="$(cd "$OPS_VERSIONING_SCRIPT_DIR/../../../.." 2>/dev/null && pwd || true)"

  # 2. A different repo than AI-OS with no deploy marker: a separate project, but not
  #    necessarily a website/app. Refuse by default (safe), but say so softly.
  if [ -n "$aios_root" ] && [ "$toplevel" != "$aios_root" ]; then
    printf 'other-repo\n'
    return 0
  fi

  return 1
}
