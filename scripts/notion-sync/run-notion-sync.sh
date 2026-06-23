#!/usr/bin/env bash
#
# run-notion-sync.sh - run the credit-free Notion sync.
#
# This is the entry point used by the launchd job. It runs notion_sync.py
# (plain Python, no model credits), which writes context/notion/.
#
# It does NOT index memsearch. A single indexer owns the vector store: the
# nightly memsearch index job (cron/jobs/nightly-memsearch-index.md) picks up
# context/notion/ on its next run. Keeping one indexer avoids two processes
# writing the single-process Milvus Lite database at once, which can corrupt it.
#
# It is safe to run by hand at any time. Output is idempotent.

set -euo pipefail

# Resolve the repo root from this script's location:
#   scripts/notion-sync/run-notion-sync.sh -> scripts/notion-sync -> scripts -> repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

# Load NOTION_API_KEY from .env if it is not already in the environment.
# (notion_sync.py also reads .env directly; this makes the key available to any
# child process and to the log line below.)
if [ -z "${NOTION_API_KEY:-}" ] && [ -f "${REPO_ROOT}/.env" ]; then
  # shellcheck disable=SC1090
  set -a
  # Only export the key we need; do not source the whole file blindly.
  NOTION_API_KEY="$(grep -E '^NOTION_API_KEY=' "${REPO_ROOT}/.env" | head -n1 | cut -d= -f2- | tr -d '"'"'"'')"
  export NOTION_API_KEY
  set +a
fi

PYTHON_BIN="$(command -v python3 || true)"
if [ -z "${PYTHON_BIN}" ]; then
  echo "python3 not found on PATH" >&2
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] notion-sync: starting"
"${PYTHON_BIN}" "${SCRIPT_DIR}/notion_sync.py"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] notion-sync: markdown written to context/notion/"

# Intentionally no memsearch index here. The nightly memsearch index job is the
# single owner of the vector store and will pick up context/notion/ on its next
# run. See the header comment for why.

echo "[$(date '+%Y-%m-%d %H:%M:%S')] notion-sync: done"
