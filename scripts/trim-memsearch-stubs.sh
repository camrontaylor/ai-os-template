#!/usr/bin/env bash
# trim-memsearch-stubs.sh - Safely remove empty "## Session HH:MM" stub blocks
# from the memsearch shadow memory files (.memsearch/memory/*.md).
#
# Why: the memsearch Claude Code plugin writes a "## Session HH:MM" heading on
# every session start, even when the session captures nothing. Those empty
# headings pile up (hundreds a day on a busy multi-session setup), pollute the
# "# Recent Memory" cold-start injection, and skew the search index because the
# plugin and AI-OS share one collection. This tool strips ONLY the empty
# headings. Real session summaries (blocks with ### content) are kept untouched.
#
# Safety: no hard delete. Before any file is rewritten, the original is copied to
# ~/.Trash so the removed content stays recoverable, per the no-hard-delete rule.
#
# Usage:
#   bash scripts/trim-memsearch-stubs.sh [--dry-run] [--reindex] [FILE ...]
#     --dry-run   Show what would be removed; write nothing, back up nothing.
#     --reindex   After trimming, re-index the cleaned memory dir so search is clean.
#     FILE ...    Specific files to trim; default = every .md in the shadow dir.
set -euo pipefail

DRY_RUN=0
REINDEX=0
NO_BACKUP=0
FILES=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    --reindex) REINDEX=1 ;;
    --no-backup) NO_BACKUP=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) FILES+=("$a") ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
MEMORY_DIR="$ROOT/.memsearch/memory"
if [ ! -d "$MEMORY_DIR" ]; then
  echo "No memsearch memory dir at $MEMORY_DIR - nothing to trim."
  exit 0
fi

if [ ${#FILES[@]} -eq 0 ]; then
  while IFS= read -r f; do FILES+=("$f"); done < <(find "$MEMORY_DIR" -maxdepth 1 -type f -name '*.md' | sort)
fi
if [ ${#FILES[@]} -eq 0 ]; then
  echo "No .md files in $MEMORY_DIR - nothing to trim."
  exit 0
fi

TRASH=""
PY_ARGS=()
if [ "$DRY_RUN" -eq 1 ]; then
  PY_ARGS+=(--dry-run)
  echo "DRY RUN - no files will be changed."
elif [ "$NO_BACKUP" -eq 1 ]; then
  # Used by the frequent SessionEnd janitor: removed blocks are provably empty
  # (no body), so there is nothing to recover and no Trash copy is made.
  :
else
  TRASH="$HOME/.Trash/aios-memsearch-trim-$(date +%Y%m%d-%H%M%S)"
  PY_ARGS+=(--trash-dir "$TRASH")
fi

python3 "$ROOT/scripts/lib/trim-memsearch-stubs.py" ${PY_ARGS[@]+"${PY_ARGS[@]}"} "${FILES[@]}"

if [ "$REINDEX" -eq 1 ] && [ "$DRY_RUN" -eq 0 ]; then
  COLL="$(bash "$ROOT/scripts/lib/memsearch-collection.sh" "$ROOT" 2>/dev/null || true)"
  MS=""
  if command -v memsearch >/dev/null 2>&1; then
    MS="memsearch"
  elif command -v uvx >/dev/null 2>&1; then
    MS="uvx --from memsearch[onnx] memsearch"
  fi
  if [ -n "$MS" ]; then
    echo "Re-indexing cleaned memory into collection ${COLL:-default} (this can take a minute)..."
    if GLOG_minloglevel=3 GRPC_VERBOSITY=NONE $MS index "$MEMORY_DIR" ${COLL:+--collection "$COLL"} >/dev/null 2>&1; then
      echo "Re-index complete."
    else
      echo "Re-index skipped or failed (non-fatal) - the nightly index job will refresh it."
    fi
  else
    echo "memsearch not found - skipped re-index. The nightly index job will refresh it."
  fi
fi

if [ -n "$TRASH" ] && [ -d "$TRASH" ]; then
  echo "Backups of every changed file: $TRASH"
fi
echo "Done."
