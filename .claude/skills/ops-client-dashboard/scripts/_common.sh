#!/usr/bin/env bash
# Shared config + helpers for ops-client-dashboard (ROOT shared skill, copied into clients that use it).
# Reads a configured client task dashboard headless, logged in as the agent's own dashboard
# account. ONE shared login lives OUTSIDE any client at ~/.agent-browser/profiles/client-dashboard,
# so the root workspace and every client workspace use the same session. When it lapses,
# re-auth is an admin re-invite the agent reads from its own inbox via the
# ops-agent-email skill (no password exists for this invited account).

info() { printf '   %s\n' "$*"; }
ok()   { printf 'OK   %s\n' "$*"; }
warn() { printf 'WARN %s\n' "$*"; }
err()  { printf 'ERR  %s\n' "$*" >&2; }

CD_SESSION="${CD_SESSION:-client-dashboard}"
CD_HOST="${CD_HOST:-https://YOUR-WORKSPACE.getorchestra.com}"
CD_SIGNIN="$CD_HOST/sign-in"
CD_EMAIL="${CD_EMAIL:-your-agent@agentmail.to}"            # the agent's own dashboard login
CD_DEFAULT_BOARD="${CD_DEFAULT_BOARD:-YOUR-BOARD-ID}"      # default customer/client board id

# Shared, client-neutral locations (outside any client folder so all clients share one login).
CD_PROFILE="${CD_PROFILE:-$HOME/.agent-browser/profiles/client-dashboard}"
CD_OUT="${CD_OUT:-$HOME/.agent-browser/client-dashboard-out}"

# Locate the ops-agent-email engine (sibling skill in the same .claude/skills, or the repo root).
cd_agentmail() {
  local here root p
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  for p in "$here/../../ops-agent-email/scripts/agentmail.py"; do
    [ -f "$p" ] && { printf '%s\n' "$p"; return 0; }
  done

  root="$here"
  while [ "$root" != "/" ]; do
    p="$root/.claude/skills/ops-agent-email/scripts/agentmail.py"
    [ -f "$p" ] && { printf '%s\n' "$p"; return 0; }
    root="$(dirname "$root")"
  done

  return 1
}

require_agent_browser() {
  command -v agent-browser >/dev/null 2>&1 || { err "agent-browser not installed."; exit 1; }
}

ab() { agent-browser --session "$CD_SESSION" "$@"; }
cd_close() { agent-browser --session "$CD_SESSION" close >/dev/null 2>&1 || true; }
cd_open() { agent-browser --session "$CD_SESSION" --profile "$CD_PROFILE" open "$1"; }
cd_authed() { case "$1" in *"/sign-in"*|"") return 1;; *) return 0;; esac; }

# Re-auth for the invited team member. The expected account model is: the agent joined
# through an invite link, has no password, and re-auth needs a fresh invite. An admin
# re-invites $CD_EMAIL in Team settings; the agent reads that link from its own inbox
# and completes the join here automatically. The durable shared session is the everyday
# path; this only runs on expiry. Returns 0 if it lands authenticated.
cd_relogin() {
  local am; am="$(cd_agentmail)" || { err "ops-agent-email not found; cannot read the invite"; return 3; }
  local link
  link="$(python3 "$am" read --from orchestra 2>/dev/null \
          | python3 -c 'import sys,json;print((json.load(sys.stdin) or {}).get("link") or "")' 2>/dev/null)"
  [ -z "$link" ] && { err "No dashboard invite link in the agent inbox. Ask an admin to re-invite $CD_EMAIL in Team settings, then retry."; return 2; }
  cd_close
  agent-browser --session "$CD_SESSION" --profile "$CD_PROFILE" open "$link" >/dev/null 2>&1 || true
  ab wait 5000 >/dev/null 2>&1 || true
  ab find placeholder "John doe" fill "AI Agent" >/dev/null 2>&1 || true   # join-name form, if shown
  ab find role button click "Join" >/dev/null 2>&1 || true
  ab find role button click "Join Your Team" >/dev/null 2>&1 || true
  ab wait 5000 >/dev/null 2>&1 || true
  cd_authed "$(ab get url 2>/dev/null || true)"
}
