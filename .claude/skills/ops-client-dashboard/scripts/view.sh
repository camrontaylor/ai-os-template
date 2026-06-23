#!/usr/bin/env bash
# Headless: open a configured client task dashboard board, screenshot it, dump its text. Reuses the shared agent
# login; re-auths from a fresh invite if expired. Works the same from any client workspace.
#   bash view.sh                 # default board (your default board)
#   bash view.sh <customer-id>   # any 24-char customer id
#   bash view.sh '<full-url>'    # any configured dashboard URL
# Exit: 0 ok | 2 not authenticated (run relogin.sh) | 1 setup error
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; source "$DIR/_common.sh"
require_agent_browser

ARG="${1:-$CD_DEFAULT_BOARD}"
case "$ARG" in http*) BOARD="$ARG";; *) BOARD="$CD_HOST/dashboard/customer/$ARG";; esac
mkdir -p "$CD_OUT"; PNG="$CD_OUT/board.png"; TXT="$CD_OUT/board.txt"

cd_close
cd_open "$BOARD" >/dev/null
ab wait 6000 >/dev/null 2>&1 || true
URL="$(ab get url 2>/dev/null || true)"
if ! cd_authed "$URL"; then
  warn "session expired - trying to re-auth from a fresh invite in the agent inbox..."
  if cd_relogin; then cd_open "$BOARD" >/dev/null; ab wait 6000 >/dev/null 2>&1 || true; URL="$(ab get url 2>/dev/null || true)"; fi
fi
if ! cd_authed "$URL"; then err "not authenticated; run: bash relogin.sh"; cd_close; exit 2; fi

ab screenshot "$PNG" --full >/dev/null 2>&1 || warn "screenshot failed"
ab get text body > "$TXT" 2>/dev/null || warn "text dump failed"
cd_close
ok "board:      $URL"
info "screenshot: $PNG"
info "text:       $TXT ($(wc -l < "$TXT" 2>/dev/null | tr -d ' ') lines)"
