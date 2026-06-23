#!/usr/bin/env bash
# Print the saved versions of a file: index, date/time, label, size, newest last.
# Marks which snapshot (if any) matches the current file content.
# Numbering comes from index.md, so it matches restore.sh and diff.sh exactly.
# Usage: list.sh <path>
set -euo pipefail
OPS_VERSIONING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$OPS_VERSIONING_SCRIPT_DIR/_common.sh"

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  err "usage: list.sh <path>"
  exit 1
fi
if [ ! -f "$TARGET" ]; then
  err "file not found: $TARGET"
  exit 1
fi

# Normalise TARGET to an absolute path ONCE, dash-safe, so a name that starts with a
# dash (for example "-weird.md") is never eaten by dirname/basename, which would wrongly
# report a real saved history as "no versions yet".
TARGET="$(cd "$(dirname -- "$TARGET")" && pwd)/$(basename -- "$TARGET")"

VDIR="$(resolve_versions_dir "$TARGET")"
INDEX="$VDIR/index.md"

# Snapshot basenames in chronological order (oldest first), reconciled against disk.
NAMES=()
while IFS= read -r n; do
  [ -n "$n" ] && NAMES+=("$n")
done < <(list_snapshots "$VDIR")

if [ "${#NAMES[@]}" -eq 0 ]; then
  info "no versions yet"
  exit 0
fi

# Pull the stored pretty time and label for one filename out of index.md.
# Index rows look like: "N. <pretty time> - <label> - <size> bytes - `filename`".
# Reading them from the index (not re-deriving from the filename) keeps casing,
# empty-slug labels, and same-minute times exactly as snapshot.sh recorded them.
# Falls back to filename parsing only for a file the index somehow never recorded.
index_field() {
  local name="$1" which="$2" line
  if [ -f "$INDEX" ]; then
    line="$(grep -E '^[0-9]+\. ' "$INDEX" 2>/dev/null | grep -F "\`$name\`" | head -n1 || true)"
  fi
  if [ -n "$line" ]; then
    # Strip the leading "N. " then split on " - ": [0]=time [1]=label [2]=size...
    local body="${line#*. }"
    case "$which" in
      time)  printf '%s' "${body%% - *}" ;;
      label) body="${body#* - }"; printf '%s' "${body%% - *}" ;;
    esac
    return
  fi
  # Fallback: derive from the filename YYYY-MM-DD_HHMM[__slug][-k][EXT]. Pull the
  # leading date_time stamp by regex so date hyphens are not eaten as a collision tag.
  local stem stamp rest label
  stem="${name%.*}"; [ "$stem" = "$name" ] && stem="$name"
  case "$which" in
    time)
      stamp="$(printf '%s' "$name" | sed -nE 's/^([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}).*/\1/p')"
      if [ -z "$stamp" ]; then
        printf '%s' "$name"
      else
        printf '%s' "$stamp" | sed -E 's/_/ /; s/([0-9]{2})([0-9]{2})$/\1:\2/'
      fi
      ;;
    label)
      case "$stem" in
        *__*)
          rest="${stem#*__}"; label="${rest%-[0-9]*}"
          printf '%s' "$label" | tr '-' ' '
          ;;
        *) printf '(no label)' ;;
      esac
      ;;
  esac
}

info "versions of $(basename "$TARGET") (newest last):"
N=0
for name in "${NAMES[@]}"; do
  N=$((N + 1))
  f="$VDIR/$name"

  pretty="$(index_field "$name" time)"
  label="$(index_field "$name" label)"

  size="?"
  [ -f "$f" ] && size="$(file_size "$f")"

  mark=""
  if [ -f "$f" ] && cmp -s "$f" "$TARGET"; then
    mark="  <- matches the file now"
  fi

  info "  $N. $pretty - $label - ${size} bytes$mark"
done
