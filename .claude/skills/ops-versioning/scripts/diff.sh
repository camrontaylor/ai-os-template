#!/usr/bin/env bash
# Show the difference between the current file and a saved version.
# Usage: diff.sh <path> [selector]
#   selector = an index number, or previous/last (default: most recent),
#              or a date substring.
# Uses git --no-pager diff --no-index when git is present; else plain diff -u.
# Never fails just because a diff was found (differences are expected).
set -euo pipefail
OPS_VERSIONING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$OPS_VERSIONING_SCRIPT_DIR/_common.sh"

TARGET="${1:-}"
SELECTOR="${2:-previous}"
if [ -z "$TARGET" ]; then
  err "usage: diff.sh <path> [selector]"
  exit 1
fi
if [ ! -f "$TARGET" ]; then
  err "file not found: $TARGET"
  exit 1
fi

# Normalise TARGET to an absolute path ONCE, dash-safe, so a name that starts with a
# dash (for example "-weird.md") is never eaten by dirname/basename.
TARGET="$(cd "$(dirname -- "$TARGET")" && pwd)/$(basename -- "$TARGET")"

VDIR="$(resolve_versions_dir "$TARGET")"

# Snapshots oldest first from index.md; numbering matches list.sh and restore.sh.
SNAPS=()
while IFS= read -r n; do
  [ -n "$n" ] && SNAPS+=("$VDIR/$n")
done < <(list_snapshots "$VDIR")
if [ "${#SNAPS[@]}" -eq 0 ]; then
  info "no versions yet - nothing to compare"
  exit 0
fi

CHOSEN=""
case "$SELECTOR" in
  previous|last)
    CHOSEN="${SNAPS[$(( ${#SNAPS[@]} - 1 ))]}"
    ;;
  -*|+*)
    # A signed / negative number like -1 is NOT a valid version. Reject it before the
    # substring branch so "-1" can't match a date fragment and diff the wrong copy.
    err "version '$SELECTOR' does not exist. Run list to see them."
    exit 1
    ;;
  *[!0-9]*)
    # Date/text substring; the list is chronological so the LAST match is the newest.
    # Try the selector as typed AND as a slug so multi-word labels (e.g. "monday
    # version" -> "monday-version") still match the slugified filename.
    SELECTOR_SLUG="$(slugify "$SELECTOR")"
    for f in "${SNAPS[@]}"; do
      bn="$(basename -- "$f")"
      case "$bn" in
        *"$SELECTOR"*) CHOSEN="$f"; continue ;;
      esac
      if [ -n "$SELECTOR_SLUG" ]; then
        case "$bn" in
          *"$SELECTOR_SLUG"*) CHOSEN="$f" ;;
        esac
      fi
    done
    if [ -z "$CHOSEN" ]; then
      err "no version matches '$SELECTOR'. Run list to see what is saved."
      exit 1
    fi
    ;;
  *)
    if [ "$SELECTOR" -lt 1 ] || [ "$SELECTOR" -gt "${#SNAPS[@]}" ]; then
      err "version $SELECTOR does not exist. There are ${#SNAPS[@]}."
      exit 1
    fi
    CHOSEN="${SNAPS[$(( SELECTOR - 1 ))]}"
    ;;
esac

info "comparing saved version ($(basename "$CHOSEN")) with the file now:"
info "  lines starting with - are the saved version, lines starting with + are the file now"

if command -v git >/dev/null 2>&1; then
  git --no-pager diff --no-index -- "$CHOSEN" "$TARGET" || true
else
  diff -u "$CHOSEN" "$TARGET" || true
fi
