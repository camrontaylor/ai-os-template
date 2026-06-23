#!/usr/bin/env bash
# enable-cron.sh [CLAUDE_CODE_OAUTH_TOKEN]
#
# The ONE step that turns on the self-maintaining nightly memory jobs.
#
# First, get a long-lived token (interactive, needs your Claude subscription):
#     claude setup-token
# Copy the token it prints, then run:
#     bash scripts/enable-cron.sh <token>
#
# This stores the token (chmod 600), loads the durable launchd cron daemon, and
# runs a test job so you can see it succeed. Everything after `claude setup-token`
# is automated here.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN="${1:-}"
TOKEN_FILE="$HOME/.config/claude-code-oauth-token"
PLIST="$HOME/Library/LaunchAgents/com.aios.cron-daemon.plist"
LABEL="com.aios.cron-daemon"

# Make sure the runtime has the folders it writes to before the test job runs.
# Without these, run-job.sh below cannot write its log/state files and the test
# fails with a confusing path error instead of a clean result.
mkdir -p "$REPO_ROOT/cron/logs" "$REPO_ROOT/cron/status"

if [[ -n "$TOKEN" ]]; then
  mkdir -p "$(dirname "$TOKEN_FILE")"
  printf '%s' "$TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  echo "Stored token at $TOKEN_FILE (chmod 600)"
elif [[ -f "$TOKEN_FILE" ]]; then
  echo "Using existing token at $TOKEN_FILE"
else
  echo "No token given and none stored yet."
  echo "Run:  claude setup-token   then:  bash scripts/enable-cron.sh <token>"
  exit 1
fi

if [[ ! -f "$PLIST" ]]; then
  echo "Missing launchd plist: $PLIST"
  exit 1
fi

# Load or reload the daemon.
if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  echo "Reloading existing daemon..."
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  sleep 1
fi
launchctl bootstrap "gui/$(id -u)" "$PLIST" && echo "Cron daemon loaded (durable, starts on login)."

sleep 2
echo ""
echo "--- scheduler status ---"
bash "$SCRIPT_DIR/status-crons.sh" 2>&1 | grep -iE "runtime|leader|pid|heartbeat" | head

echo ""
echo "--- test run: daily-memory-distill (proves auth works) ---"
# Run the test through the same wrapper the daemon uses AND pass the token directly,
# so this test reflects what the nightly job will actually do (the plain shell does
# not have AGENTIC_OS_CLAUDE_BIN set; only the launchd plist does).
AGENTIC_OS_CLAUDE_BIN="$SCRIPT_DIR/claude-cron-wrapper.sh" \
  CLAUDE_CODE_OAUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" \
  bash "$SCRIPT_DIR/run-job.sh" daily-memory-distill 2>&1 | tail -6
echo ""
echo "If the test shows result: success, your nightly memory jobs are LIVE and self-maintaining."
echo "Jobs: daily-memory-distill 23:00, nightly-memsearch-index 23:30, weekly rebuild Sun 03:30."
