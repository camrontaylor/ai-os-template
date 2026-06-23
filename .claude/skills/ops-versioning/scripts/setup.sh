#!/usr/bin/env bash
# Auto-setup for ops-versioning. Idempotent. Safe to run any time.
# Per the agentic-os Auto-Setup Convention. Snapshots are plain file copies,
# so there is nothing to install; this just verifies the tools are present.
set -euo pipefail
OPS_VERSIONING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$OPS_VERSIONING_SCRIPT_DIR/_common.sh"

# 1. bash (required to run these scripts at all)
if command -v bash >/dev/null 2>&1; then
  ok "bash present"
else
  err "bash missing. This skill needs bash to run."
  exit 1
fi

# 2. git (OPTIONAL: used only for nicer side-by-side diffs)
if command -v git >/dev/null 2>&1; then
  ok "git present (nicer diffs available)"
else
  warn "git missing. Diffs fall back to plain diff -u. Snapshots still work fully."
fi

ok "ops-versioning ready"
