#!/usr/bin/env bash
# Restore a saved version over the current file.
# Usage: restore.sh <path> <selector>
#   selector = an index number from list.sh, previous/last/back/undo (go back one
#              step: the newest saved version that differs from the current file),
#              or a date substring (for example 2026-06-22).
# ALWAYS snapshots the current file first (label auto-before-restore) so nothing is lost.
set -euo pipefail
OPS_VERSIONING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$OPS_VERSIONING_SCRIPT_DIR/_common.sh"

TARGET="${1:-}"
SELECTOR="${2:-}"
if [ -z "$TARGET" ] || [ -z "$SELECTOR" ]; then
  err "usage: restore.sh <path> <selector>   (index | previous | last | back | undo | date)"
  exit 1
fi
if [ ! -f "$TARGET" ]; then
  err "file not found: $TARGET"
  exit 1
fi

# Normalise TARGET to an absolute path ONCE, dash-safe, so a name that starts with a
# dash (for example "-weird.md") is never eaten by dirname/basename and an existing
# saved history is never wrongly reported as empty.
TARGET="$(cd "$(dirname -- "$TARGET")" && pwd)/$(basename -- "$TARGET")"

VDIR="$(resolve_versions_dir "$TARGET")"

# Collect snapshots oldest first from index.md; index 1 = oldest, matching list.sh.
SNAPS=()
while IFS= read -r n; do
  [ -n "$n" ] && SNAPS+=("$VDIR/$n")
done < <(list_snapshots "$VDIR")
if [ "${#SNAPS[@]}" -eq 0 ]; then
  err "no versions yet for $(basename "$TARGET") - nothing to restore"
  exit 1
fi

# Resolve the selector to one snapshot path.
CHOSEN=""
case "$SELECTOR" in
  previous|last|back|undo)
    # "go back" / "undo": the newest saved version that DIFFERS from the current file.
    # If the user just saved the current state, the newest snapshot equals the file,
    # so skip those and land on the version before the current one (what a person means
    # by "go back" or "undo"), not a copy identical to what is already on screen.
    for (( i=${#SNAPS[@]} - 1; i >= 0; i-- )); do
      if ! cmp -s "${SNAPS[$i]}" "$TARGET"; then
        CHOSEN="${SNAPS[$i]}"
        break
      fi
    done
    if [ -z "$CHOSEN" ]; then
      err "this file already matches your most recent saved version - nothing earlier to go back to."
      info "to jump to a specific older one, see the versions and pick it by number."
      exit 1
    fi
    ;;
  -*|+*)
    # A signed / negative number like -1 is NOT a valid version. Reject it here, before
    # the substring branch, so its "-1" can never be matched as a filename fragment (a
    # date like 2026-06-16 contains "-1") and silently restore the wrong copy.
    err "version '$SELECTOR' does not exist. Run list to see them."
    exit 1
    ;;
  *[!0-9]*)
    # Not a pure number: treat as a date/text substring; pick the newest match.
    # The list is chronological (oldest first), so the LAST iteration match is the
    # newest. We try the selector as typed, AND as a slug (lowercase, spaces/junk ->
    # hyphens) so a spoken multi-word label like "monday version" matches the on-disk
    # slug "monday-version".
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
    # Pure number: 1-based index into the oldest-first list.
    if [ "$SELECTOR" -lt 1 ] || [ "$SELECTOR" -gt "${#SNAPS[@]}" ]; then
      err "version $SELECTOR does not exist. There are ${#SNAPS[@]}. Run list to see them."
      exit 1
    fi
    CHOSEN="${SNAPS[$(( SELECTOR - 1 ))]}"
    ;;
esac

# If we can't write the target, stop BEFORE taking the auto-before-restore snapshot.
# Otherwise the final cp fails with a raw "Permission denied" AND we leave behind a
# pointless "auto before restore" copy that just duplicates the unchanged current file.
if [ ! -w "$TARGET" ]; then
  err "I can't change this file - it's set to read-only. Unlock it and try again. Nothing was changed."
  exit 1
fi

# Always save the current file first so nothing is ever lost.
SAVE_OUT="$(bash "$OPS_VERSIONING_SCRIPT_DIR/snapshot.sh" "$TARGET" "auto before restore" --force)"
SAVED_NUM="$(printf '%s\n' "$SAVE_OUT" | sed -nE 's/^OK   saved version ([0-9]+)$/\1/p')"

# Copy the chosen snapshot over the current file. The writability check above plus
# the auto-before-restore snapshot mean the current copy is safe even if this fails.
if ! cp "$CHOSEN" "$TARGET" 2>/dev/null; then
  err "I couldn't put the older copy back over this file. Nothing was changed."
  err "your current copy is safe - it was saved first as version ${SAVED_NUM:-?}."
  exit 1
fi

ok "restored: $(basename "$CHOSEN")"
info "your previous current file was saved first as version ${SAVED_NUM:-?} (label: auto before restore)"
info "the file now matches that older version. nothing was deleted."
