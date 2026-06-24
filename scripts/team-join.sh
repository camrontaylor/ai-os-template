#!/usr/bin/env bash
# team-join.sh - finish joining your team's AI-OS after you cloned the team repo.
#
# What it does:
#   - Makes sure your updates will follow your team's repo.
#   - Leaves your `origin` free so you can add your OWN private backup later.
#   - Prints the few steps to finish setup.
#
# Usage:
#   bash scripts/team-join.sh [team-repo-url]
#
# Run it from inside the team repo you just cloned. The URL is optional; when
# you leave it out, it is read from your `origin` remote.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) REPO_ROOT="$(cygpath -m "$REPO_ROOT")" ;; esac
source "$REPO_ROOT/scripts/lib/team.sh"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { printf "  ${GREEN}✓ %b${NC}\n" "$1"; }
warn() { printf "  ${YELLOW}→ %b${NC}\n" "$1"; }
say()  { printf "  %b\n" "$1"; }

TEAM_URL="${1:-}"
if [[ -z "$TEAM_URL" ]]; then
  TEAM_URL="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")"
fi
if [[ -z "$TEAM_URL" ]]; then
  echo "Usage: bash scripts/team-join.sh <team-repo-url>" >&2
  echo "  (run from inside your cloned team repo, or pass the URL)" >&2
  exit 2
fi
TEAM_SLUG="$(team_slug_from_url "$TEAM_URL")"

echo ""
printf "${CYAN}${BOLD}  Joining team AI-OS: %s${NC}\n" "$TEAM_SLUG"
echo ""

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  warn "This folder is not a git checkout yet. Clone your team repo first, then"
  warn "run this from inside it:"
  say  "  git clone $TEAM_URL && cd <folder> && bash scripts/team-join.sh"
  exit 1
fi

# Add a stable `team` remote alias if one is not already present. Updates resolve
# by URL, so this just gives the team repo a clear, durable name.
if ! git -C "$REPO_ROOT" remote get-url team >/dev/null 2>&1; then
  if git -C "$REPO_ROOT" remote add team "$TEAM_URL" 2>/dev/null; then
    ok "Added remote 'team' -> $TEAM_SLUG"
  else
    warn "Could not add the 'team' remote (continuing)."
  fi
else
  ok "Remote 'team' already set."
fi

# Make sure updates follow the team repo even if the maintainer did not stamp it.
if [[ ! -f "$REPO_ROOT/.aios-team.json" ]]; then
  if team_write_config "$REPO_ROOT" "$TEAM_SLUG" "main"; then
    ok "Wrote .aios-team.json (updates will follow $TEAM_SLUG)."
  else
    warn "Could not write .aios-team.json."
  fi
else
  ok "Team config already present (.aios-team.json)."
fi

echo ""
printf "${BOLD}  Next steps:${NC}\n"
say "1) Finish setup:  ${BOLD}bash scripts/centre.sh${NC}  (paste your OWN API keys when asked)."
say "2) Let Claude run ${BOLD}/onboarding${NC} to build your own brand voice and memory."
say "3) Set up your OWN private backup as 'origin' (NOT the team repo) so your"
say "   memory and client work back up privately. The installer can do this for you."
say "4) Get team updates any time with:  ${BOLD}bash scripts/update.sh${NC}"
echo ""
printf "${YELLOW}  One rule that keeps your changes safe:${NC}\n"
say "Put personal rules in ${BOLD}CLAUDE.local.md${NC} or a skill's ${BOLD}SKILL.local.md${NC}, or"
say "as dated '- YYYY-MM-DD:' bullets under a Rules section. Never hand-edit a"
say "shared base file, or a future update can reset your change."
echo ""
