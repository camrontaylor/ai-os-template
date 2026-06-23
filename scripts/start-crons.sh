#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_PATH="$REPO_ROOT/command-centre/scripts/cron-daemon.cjs"
source "$REPO_ROOT/scripts/lib/cron-ui.sh"

# Route the daemon's claude through the auth + stay-awake wrapper, the same way the
# launchd plist (com.aios.cron-daemon) does. Without this, a daemon started by hand from
# a plain shell falls back to the bare `claude` binary and loses BOTH headless OAuth auth
# (jobs 401) and the caffeinate stay-awake (jobs cut off by idle sleep). Defaults apply
# only when not already set, so the launchd plist's own values still win.
CRON_WRAPPER="$REPO_ROOT/scripts/claude-cron-wrapper.sh"
if [[ -z "${AGENTIC_OS_CLAUDE_BIN:-}" && -x "$CRON_WRAPPER" ]]; then
    export AGENTIC_OS_CLAUDE_BIN="$CRON_WRAPPER"
fi
if [[ -z "${REAL_CLAUDE_BIN:-}" ]]; then
    _cron_real_claude="$(command -v claude 2>/dev/null || true)"
    [[ -n "$_cron_real_claude" ]] && export REAL_CLAUDE_BIN="$_cron_real_claude"
fi

# ---- Preflight: make sure the runtime has the folders and credentials it needs ----
# These do not block the daemon. They prevent two common confusing failures:
#  - missing cron/logs and cron/status dirs (the runtime cannot write log/state files)
#  - no Claude credential, so every job dies with a 401 with no obvious cause
cron_preflight() {
    # (a) Create the dirs the runtime writes to, if they are missing.
    mkdir -p "$REPO_ROOT/cron/logs" "$REPO_ROOT/cron/status"

    # (b) Warn if no Claude credential is configured. The cron wrapper looks for,
    # in order: the CLAUDE_CODE_OAUTH_TOKEN env var, the token file, or a 1Password
    # service-account token. If none is present, jobs that call Claude fail with 401.
    local token_file="${CLAUDE_OAUTH_TOKEN_FILE:-$HOME/.config/claude-code-oauth-token}"
    local op_token_file="${OP_TOKEN_FILE:-$HOME/.config/op-cron-token}"
    local have_credential=0

    if [[ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]]; then
        have_credential=1
    elif [[ -s "$token_file" ]]; then
        have_credential=1
    elif [[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" || -s "$op_token_file" ]]; then
        have_credential=1
    fi

    if [[ $have_credential -eq 0 ]]; then
        agentic_os_cron_warn "No Claude credential found for cron jobs."
        agentic_os_cron_note "Jobs that call Claude will fail with a 401 until you set one up:"
        agentic_os_cron_note "  1. Run: claude setup-token"
        agentic_os_cron_note "  2. Run: bash scripts/enable-cron.sh <token>"
        agentic_os_cron_note "The daemon still starts; only Claude-backed jobs are affected."
    fi
}
cron_preflight

agentic_os_cron_banner \
    "Starting managed cron daemon" \
    "This terminal stays attached while the daemon is running."
agentic_os_cron_info "Launching the shared cron runtime..."

if node "$SCRIPT_PATH" start "$@"; then
    agentic_os_cron_success "Managed cron daemon is running."
    agentic_os_cron_note "Use 'bash scripts/status-crons.sh' to check state or 'bash scripts/logs-crons.sh' to follow logs."
else
    exit_code=$?
    agentic_os_cron_fail "Failed to start the managed cron daemon."
    exit "$exit_code"
fi
