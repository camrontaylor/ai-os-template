#!/usr/bin/env bash
# claude-cron-wrapper.sh
#
# Runs the real `claude` binary with headless authentication, so scheduled cron
# jobs can log in. Without this, the cron daemon spawns the bare binary, which has
# no credential and dies with:
#   API Error: 401 authentication_error "Invalid authentication credentials"
#
# Point the cron runtime at this wrapper with:
#   AGENTIC_OS_CLAUDE_BIN=/path/to/ai-os/scripts/claude-cron-wrapper.sh
# (set in the launchd plist env; cron-runtime.js honors AGENTIC_OS_CLAUDE_BIN).
#
# AUTH, in order of preference:
#   1. CLAUDE_CODE_OAUTH_TOKEN (the right answer). A long-lived (~1 year) token from
#      `claude setup-token`. Headless, no 1Password, survives reboots. Store it in
#      ~/.config/claude-code-oauth-token (chmod 600) or the launchd env. Run
#      `bash scripts/enable-cron.sh <token>` to wire it up.
#   2. op run + 1Password (the interactive alias's method). Needs the 1Password
#      desktop app unlocked or an OP_SERVICE_ACCOUNT_TOKEN; not reliable unattended
#      (op blocks on a biometric prompt at 3am), so this is a fallback only.
#   3. Bare binary. Works only if ~/.claude/.credentials.json exists from `/login`.
set -euo pipefail

# Keep the Mac awake for the duration of THIS job only, so an idle-sleep timer cannot
# cut a job off mid-run. caffeinate -i blocks idle sleep while the job runs, then lets
# the Mac sleep normally again. It does not fight a closed-lid clamshell sleep. We
# re-exec the wrapper under caffeinate once (guarded so it does not loop).
if command -v caffeinate >/dev/null 2>&1 && [[ -z "${_AIOS_CAFFEINATED:-}" ]]; then
  export _AIOS_CAFFEINATED=1
  exec caffeinate -i "$0" "$@"
fi

# Resolve the claude binary. Explicit override wins; otherwise take the newest on
# PATH (the launchd plist puts the nvm bin first, so the daemon gets the current
# version, not the old /usr/local/bin/claude 2.0.76 that had the tool_use-id bug).
REAL_CLAUDE="${REAL_CLAUDE_BIN:-$(command -v claude 2>/dev/null || echo /usr/local/bin/claude)}"
ENV_FILE="${AI_KEYS_ENV_FILE:-$HOME/.config/ai-keys.env}"
OAUTH_TOKEN_FILE="${CLAUDE_OAUTH_TOKEN_FILE:-$HOME/.config/claude-code-oauth-token}"

# 1. Long-lived OAuth token (preferred). From `claude setup-token`.
if [[ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" && -f "$OAUTH_TOKEN_FILE" ]]; then
  export CLAUDE_CODE_OAUTH_TOKEN="$(tr -d '[:space:]' < "$OAUTH_TOKEN_FILE")"
fi
if [[ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]]; then
  exec "$REAL_CLAUDE" "$@"
fi

# 2. op run + 1Password fallback (also picks up a service-account token if present).
OP_TOKEN_FILE="${OP_TOKEN_FILE:-$HOME/.config/op-cron-token}"
if [[ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" && -f "$OP_TOKEN_FILE" ]]; then
  export OP_SERVICE_ACCOUNT_TOKEN="$(cat "$OP_TOKEN_FILE")"
fi
if command -v op >/dev/null 2>&1 && [[ -f "$ENV_FILE" ]]; then
  exec op run --env-file="$ENV_FILE" -- "$REAL_CLAUDE" "$@"
fi

# 3. Bare binary (works only if OAuth /login credentials exist).
exec "$REAL_CLAUDE" "$@"
