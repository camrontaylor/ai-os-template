#!/usr/bin/env bash
# Save the CURRENT content of a file as a new immutable timestamped snapshot.
# Usage: snapshot.sh <path> [label] [--force]
# Snapshots live in DIR/.versions/<basename>/ and are NEVER modified or deleted.
# Inside a deploy/live repo this refuses (exit 0) and points to the Live Project flow.
set -euo pipefail
OPS_VERSIONING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$OPS_VERSIONING_SCRIPT_DIR/_common.sh"

FORCE=0
TARGET=""
LABEL=""
for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    FORCE=1
  elif [ -z "$TARGET" ]; then
    TARGET="$arg"
  elif [ -z "$LABEL" ]; then
    LABEL="$arg"
  fi
done

if [ -z "$TARGET" ]; then
  err "usage: snapshot.sh <path> [label] [--force]"
  exit 1
fi
if [ ! -f "$TARGET" ]; then
  err "file not found: $TARGET"
  exit 1
fi

# Normalise TARGET to an absolute path ONCE, dash-safe, so every later dirname/
# basename and the deploy check can never eat a name that starts with a dash
# (for example "-weird.md"). After this, TARGET no longer has a bare leading dash.
TARGET_DIR="$(cd "$(dirname -- "$TARGET")" && pwd)"
TARGET="$TARGET_DIR/$(basename -- "$TARGET")"

# Deploy / live outputs use the Live Project flow, not file snapshots.
if [ "$FORCE" -eq 0 ]; then
  DEPLOY_REASON="$(is_deploy_repo "$TARGET" || true)"
  if [ "$DEPLOY_REASON" = "deploy" ]; then
    warn "this looks like a website or app (a deploy project)."
    warn "those use the Live Project flow, not file snapshots."
    warn "to save or roll one back, use the ops-website skill (working vs live, gated ship, rollback)."
    info "if you really want a plain file snapshot here, re-run with --force."
    exit 0
  elif [ "$DEPLOY_REASON" = "other-repo" ]; then
    warn "this file is inside a separate project (its own git repo), not the AI-OS workspace."
    warn "snapshots are off by default for files in a separate project."
    info "if you really want a plain file snapshot here, re-run with --force."
    exit 0
  fi
fi

VDIR="$(resolve_versions_dir "$TARGET")"
if ! mkdir -p "$VDIR" 2>/dev/null; then
  err "could not create the place where saved copies live next to this file."
  err "nothing was saved. check that the folder this file is in can be written to."
  exit 1
fi
# If the snapshot folder exists but is read-only, fail LOUDLY and early: the whole
# promise is that the old copy is frozen first, so a silent no-save is the worst case.
if [ ! -w "$VDIR" ]; then
  err "I can't save a copy here - the saved-copies folder is locked (read-only)."
  err "nothing was saved. unlock it and try again."
  exit 1
fi

EXT=""
BASE="$(basename -- "$TARGET")"
case "$BASE" in
  *.*) EXT=".${BASE##*.}" ;;
esac

STAMP="$(now_stamp)"
SLUG=""
if [ -n "$LABEL" ]; then
  SLUG="$(slugify "$LABEL")"
fi

# Build the snapshot filename: STAMP[__SLUG]EXT, disambiguated if the minute repeats.
build_name() {
  local n="$1"
  local name="$STAMP"
  [ -n "$SLUG" ] && name="${name}__${SLUG}"
  [ "$n" -gt 1 ] && name="${name}-${n}"
  printf '%s%s' "$name" "$EXT"
}

# Claim a free snapshot name ATOMICALLY, then fill it via a temp-then-rename copy.
# Two problems are solved here:
#   1. Race (lost snapshots): a check-then-act loop ([ -e ] then cp) lets two parallel
#      saves in the same minute pick the same free name and clobber each other. Instead
#      we RESERVE the name with `set -o noclobber` (an O_EXCL create that fails if the
#      name already exists), so only one process can win each name; losers bump N and
#      retry. This makes concurrent saves never overwrite one another.
#   2. Partial snapshot on interrupt: cp writes in place under the final name, so a cp
#      killed midway leaves a truncated file under a valid version name. Instead we copy
#      to a temp file in the same folder, then `mv` it onto the reserved name (mv within
#      one folder is atomic), so an interrupted copy never surfaces as a real version.
N=1
SNAP=""
while :; do
  CANDIDATE="$VDIR/$(build_name "$N")"
  # Reserve the name: noclobber makes ">" fail if the file already exists.
  if ( set -o noclobber; : > "$CANDIDATE" ) 2>/dev/null; then
    SNAP="$CANDIDATE"
    break
  fi
  N=$((N + 1))
done

# Copy into a private temp file, then atomically move it onto the reserved name.
SNAP_TMP="$SNAP.partial.$$"
trap 'rm -f "$SNAP_TMP"' EXIT
if ! cp "$TARGET" "$SNAP_TMP" 2>/dev/null; then
  rm -f "$SNAP" "$SNAP_TMP" 2>/dev/null || true   # release the empty reserved name
  err "I couldn't save a copy of this file."
  err "nothing was saved. check that the saved-copies folder can be written to."
  exit 1
fi
if ! mv -f "$SNAP_TMP" "$SNAP" 2>/dev/null; then
  rm -f "$SNAP" "$SNAP_TMP" 2>/dev/null || true
  err "I couldn't finish saving a copy of this file."
  err "nothing was saved. check that the saved-copies folder can be written to."
  exit 1
fi

# Turn a snapshot filename back into its pretty time and label, used to (re)build
# index rows for any on-disk copy the index never recorded. Filenames are
# YYYY-MM-DD_HHMM, then an optional "__slug", then an optional "-k" collision tag,
# then the extension. We pull the leading date_time stamp by regex so the date
# hyphens are never mistaken for the collision tag.
pretty_time_from_name() {
  local name="$1" stamp
  stamp="$(printf '%s' "$name" | sed -nE 's/^([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}).*/\1/p')"
  if [ -z "$stamp" ]; then
    printf '%s' "$name"   # unrecognised name: show it as-is rather than mangle it
    return
  fi
  printf '%s' "$stamp" | sed -E 's/_/ /; s/([0-9]{2})([0-9]{2})$/\1:\2/'
}
label_from_name() {
  local name="$1" stem rest label
  stem="${name%.*}"; [ "$stem" = "$name" ] && stem="$name"
  case "$stem" in
    *__*)
      rest="${stem#*__}"          # everything after the "__" slug separator
      label="${rest%-[0-9]*}"     # drop a trailing "-k" collision tag if present
      printf '%s' "$label" | tr '-' ' '
      ;;
    *) printf '(no label)' ;;
  esac
}

# Rebuild the human-readable index from the files actually on disk, oldest first.
# This is the fix for index/filesystem drift: prior snapshots (legacy dirs with no
# index, or the auto-before-restore copy that restore.sh writes) are reconciled in
# BEFORE the new entry is numbered, so NUM and the listing always include them.
# Source of each row's time and label, in priority order:
#   - the copy we just wrote: the user's real $LABEL (keeps casing and empty slugs),
#   - a file ALREADY in the old index: reuse that row's stored time and label so an
#     index rebuild never lowercases or flattens a label it recorded correctly,
#   - an orphaned on-disk file the index never knew: derive from its filename.
INDEX="$VDIR/index.md"
OLD_INDEX=""
[ -f "$INDEX" ] && OLD_INDEX="$(cat "$INDEX")"

# Read "time" or "label" for a filename out of the OLD index text. Empty if absent.
old_index_field() {
  local name="$1" which="$2" line body
  [ -z "$OLD_INDEX" ] && return
  line="$(printf '%s\n' "$OLD_INDEX" | grep -E '^[0-9]+\. ' | grep -F "\`$name\`" | head -n1 || true)"
  [ -z "$line" ] && return
  body="${line#*. }"
  case "$which" in
    time)  printf '%s' "${body%% - *}" ;;
    label) body="${body#* - }"; printf '%s' "${body%% - *}" ;;
  esac
}

# Sweep any stale temp index left behind by a previously killed run, so the debris
# never accumulates. These are excluded from listing anyway, this just tidies them.
rm -f "$VDIR"/index.md.tmp.* 2>/dev/null || true

TMP_INDEX="$INDEX.tmp.$$"
# Extend the EXIT trap so an interrupted index rebuild leaves no .tmp.PID behind.
trap 'rm -f "$SNAP_TMP" "$TMP_INDEX"' EXIT
{
  printf '# Versions of %s\n\n' "$BASE"
  printf 'Frozen copies of this file, oldest first. Never edited, never deleted.\n\n'
} > "$TMP_INDEX"

NUM=0
CUR_BASE="$(basename -- "$SNAP")"
PRETTY_TIME="$(printf '%s' "$STAMP" | sed -E 's/_/ /; s/([0-9]{2})([0-9]{2})$/\1:\2/')"
LABEL_TEXT="${LABEL:-(no label)}"
while IFS= read -r name; do
  [ -z "$name" ] && continue
  f="$VDIR/$name"
  [ -e "$f" ] || continue
  NUM=$((NUM + 1))
  size="$(file_size "$f")"
  if [ "$name" = "$CUR_BASE" ]; then
    ptime="$PRETTY_TIME"; ltext="$LABEL_TEXT"
  else
    ptime="$(old_index_field "$name" time)";  [ -z "$ptime" ] && ptime="$(pretty_time_from_name "$name")"
    ltext="$(old_index_field "$name" label)"; [ -z "$ltext" ] && ltext="$(label_from_name "$name")"
  fi
  printf '%s. %s - %s - %s bytes - `%s`\n' "$NUM" "$ptime" "$ltext" "$size" "$name" >> "$TMP_INDEX"
done < <(list_snapshots "$VDIR")

mv "$TMP_INDEX" "$INDEX"

# The version number of the copy we just wrote is its position in the rebuilt index.
SAVED_NUM="$(grep -E '^[0-9]+\. ' "$INDEX" 2>/dev/null \
  | grep -nF "\`$CUR_BASE\`" | head -n1 | cut -d: -f1 || true)"
[ -z "$SAVED_NUM" ] && SAVED_NUM="$NUM"

ok "saved version $SAVED_NUM"
info "$SNAP"
