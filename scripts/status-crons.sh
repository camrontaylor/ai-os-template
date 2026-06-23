#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_PATH="$REPO_ROOT/command-centre/scripts/cron-daemon.cjs"
source "$REPO_ROOT/scripts/lib/cron-ui.sh"

agentic_os_cron_banner \
    "Checking cron runtime status" \
    "This shows whether the CLI daemon or the Command Centre server is leading."
agentic_os_cron_info "Reading the shared runtime lock and daemon state..."

if node "$SCRIPT_PATH" status "$@"; then
    agentic_os_cron_success "Status check complete."
else
    exit_code=$?
    agentic_os_cron_fail "Failed to read cron runtime status."
    exit "$exit_code"
fi
