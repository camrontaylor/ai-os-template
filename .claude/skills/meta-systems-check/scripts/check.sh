#!/usr/bin/env bash
# meta-systems-check / check.sh
# Plain-English health check for an AI-OS install. READ-ONLY: it changes nothing,
# it only looks and reports. Runs all checks, then prints a scorecard grouped by
# severity. Always exits 0 so the calling skill can read the full output.
set -o pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

CRIT=(); WARN=(); OKAY=(); INFO=()
crit(){ CRIT+=("$1"); }
warn(){ WARN+=("$1"); }
okay(){ OKAY+=("$1"); }
info(){ INFO+=("$1"); }

# 1. Node runtime (Command Centre + cron need it)
if command -v node >/dev/null 2>&1; then
  okay "Node is installed ($(node -v))."
else
  crit "Node is not installed. Install Node 18 or newer; the dashboard and cron need it."
fi

# 2. Command Centre dependencies (better-sqlite3 powers cron + the dashboard)
if [ -d "$ROOT/command-centre/node_modules/better-sqlite3" ]; then
  okay "Command Centre dependencies are installed."
else
  crit "Command Centre dependencies are missing. Fix: cd command-centre && npm install"
fi

# 3. Onboarding command present
if [ -f "$ROOT/.claude/commands/onboarding.md" ]; then
  okay "Onboarding command is present (/onboarding)."
else
  warn "Onboarding command is missing (.claude/commands/onboarding.md); new users cannot run /onboarding."
fi

# 4. Nightly cron daemon (macOS launchd)
if [ "$(uname)" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.aios.cron-daemon.plist"
  if [ -f "$PLIST" ]; then
    if launchctl print "gui/$(id -u)/com.aios.cron-daemon" >/dev/null 2>&1; then
      okay "Nightly cron daemon is loaded and running."
    else
      warn "Cron plist exists but the daemon is not loaded. Fix: bash scripts/enable-cron.sh"
    fi
  else
    info "Nightly memory jobs are off (optional). Turn on: claude setup-token, then bash scripts/enable-cron.sh <token>"
  fi
else
  info "Cron daemon check skipped (not macOS)."
fi

# 5. Semantic memory (memsearch)
if command -v memsearch >/dev/null 2>&1; then
  okay "Semantic memory (memsearch) is installed."
else
  info "Semantic memory is not set up (optional). Enable: bash scripts/setup-memory.sh"
fi

# 6. API keys: documented in .env.example vs set in .env (names only, never values)
if [ -f "$ROOT/.env.example" ]; then
  total=0; missing=0
  while IFS= read -r key; do
    [ -z "$key" ] && continue
    total=$((total+1))
    if [ -f "$ROOT/.env" ] && grep -qE "^${key}=.+" "$ROOT/.env" 2>/dev/null; then
      :
    else
      missing=$((missing+1))
    fi
  done < <(grep -oE '^[A-Z][A-Z0-9_]*=' "$ROOT/.env.example" 2>/dev/null | sed 's/=$//' | sort -u)
  if [ "$total" -gt 0 ]; then
    if [ "$missing" -eq 0 ]; then
      okay "All $total documented API keys are set."
    else
      info "$missing of $total optional API keys are not set (everything works without them; see .env.example)."
    fi
  fi
else
  info ".env.example not found; skipping the API key check."
fi

# 7. Brand context: has onboarding been run? (ignore README + _templates)
real_brand=$(ls "$ROOT/brand_context"/*.md 2>/dev/null | grep -viE "/README\.md$" | wc -l | tr -d ' ')
if [ "${real_brand:-0}" -gt 0 ]; then
  okay "Brand context is set up ($real_brand brand file(s))."
else
  info "Brand is not set up yet. Run /onboarding to build voice, positioning, and audience."
fi

# 8. Client folders complete (each needs AGENTS.md, CLAUDE.md, .claude/commands)
if [ -d "$ROOT/clients" ]; then
  for c in "$ROOT"/clients/*/; do
    [ -d "$c" ] || continue
    name="$(basename "$c")"
    for need in "AGENTS.md" "CLAUDE.md" ".claude/commands"; do
      if [ ! -e "$c$need" ]; then
        warn "Client '$name' is missing $need (re-run add-client, or copy it from the root)."
      fi
    done
  done
fi

# 9. Git backup remote
maintainer=""
[ -f "$ROOT/.env" ] && maintainer="$(grep -E '^IS_TEMPLATE_MAINTAINER=true' "$ROOT/.env" 2>/dev/null || true)"
origin="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
if [ -n "$maintainer" ]; then
  okay "Template-maintainer mode; backup remote check skipped."
elif [ -z "$origin" ]; then
  warn "No backup remote set. Your data is local only; one machine failure loses it."
elif echo "$origin" | grep -qiE "simonc602/agentic-os"; then
  warn "Backups point at the template repo, not your own. Create a private repo and set it as origin."
else
  okay "Backed up to your own remote ($origin)."
fi

# 10. VERSION vs CHANGELOG
if [ -f "$ROOT/VERSION" ] && [ -f "$ROOT/CHANGELOG.md" ]; then
  ver="$(tr -d '[:space:]' < "$ROOT/VERSION")"
  if grep -qE "^## (v)?${ver}([^0-9]|$)" "$ROOT/CHANGELOG.md" 2>/dev/null; then
    okay "Version $ver matches the changelog."
  else
    info "VERSION is $ver but the changelog has no matching heading (unreleased work ahead)."
  fi
fi

# 11. MEMORY.md budget (2500-char cap)
if [ -f "$ROOT/context/MEMORY.md" ]; then
  chars=$(wc -c < "$ROOT/context/MEMORY.md" | tr -d ' ')
  if [ "${chars:-0}" -gt 2500 ]; then
    warn "MEMORY.md is $chars chars, over the 2500 cap. Consolidate it."
  elif [ "${chars:-0}" -gt 2000 ]; then
    info "MEMORY.md is $chars/2500 chars; getting full, consolidate soon."
  else
    okay "MEMORY.md is $chars/2500 chars."
  fi
fi

# 12. Claude settings.json is valid JSON (broken JSON drops hooks + permissions)
if [ -f "$ROOT/.claude/settings.json" ]; then
  if command -v python3 >/dev/null 2>&1 && python3 -c "import json; json.load(open('$ROOT/.claude/settings.json'))" 2>/dev/null; then
    okay "Claude settings.json is valid JSON."
  elif command -v node >/dev/null 2>&1 && node -e "JSON.parse(require('fs').readFileSync('$ROOT/.claude/settings.json','utf8'))" 2>/dev/null; then
    okay "Claude settings.json is valid JSON."
  else
    crit "Claude settings.json is not valid JSON. Hooks and permissions may not load."
  fi
fi

# ---- Report ----
print_section(){
  local title="$1"; shift
  [ "$#" -eq 0 ] && return
  echo "$title"
  for m in "$@"; do echo "  - $m"; done
  echo ""
}

echo "AI-OS Systems Check"
echo "==================="
echo "Checked: $ROOT"
echo ""
[ "${#CRIT[@]}" -gt 0 ] && print_section "CRITICAL (fix before relying on the system):" "${CRIT[@]}"
[ "${#WARN[@]}" -gt 0 ] && print_section "WARNINGS (worth addressing):" "${WARN[@]}"
[ "${#INFO[@]}" -gt 0 ] && print_section "INFO (optional / for awareness):" "${INFO[@]}"
[ "${#OKAY[@]}" -gt 0 ] && print_section "OK:" "${OKAY[@]}"

echo "Summary: ${#CRIT[@]} critical, ${#WARN[@]} warnings, ${#INFO[@]} info, ${#OKAY[@]} OK."
if [ "${#CRIT[@]}" -gt 0 ]; then
  echo "Status: NEEDS ATTENTION"
else
  echo "Status: HEALTHY"
fi
exit 0
