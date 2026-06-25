#!/usr/bin/env bash
# memory-search.sh - sandbox-safe markdown recall for AI-OS memory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ] || [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/memory-search.sh \"query\" [top-k]" >&2
  exit 64
fi

QUERY="$1"
TOP_K="${2:-10}"

python3 "$ROOT/scripts/memory-search.py" "$QUERY" "$TOP_K" --root "$ROOT"
