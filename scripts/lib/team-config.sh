# scripts/lib/team-config.sh
# Tiny shim, SOURCED before the update resolvers read their upstream defaults.
# Purpose: on a TEAM checkout (one that ships .aios-team.json), export the team
# repo's AGENTIC_OS_UPSTREAM_SLUG/BRANCH from that file so a teammate's plain
# `bash scripts/update.sh` follows the team repo with no manual export.
#
# Safe to source anywhere: produces no output, set -u safe, and a missing or
# malformed .aios-team.json is a silent no-op. On a solo install the file is
# absent, so this does nothing. The environment always wins over the file, so a
# maintainer can still force the canonical default with a real export.

__aios_team_root="${AGENTIC_OS_UPDATE_BOOTSTRAP_REPO_ROOT:-}"
if [[ -z "$__aios_team_root" ]]; then
  __aios_team_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)" || __aios_team_root=""
fi

if [[ -n "$__aios_team_root" && -f "$__aios_team_root/.aios-team.json" ]]; then
  if [[ -z "${AGENTIC_OS_UPSTREAM_SLUG:-}" ]]; then
    __aios_team_slug="$(sed -n 's/.*"team_slug"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$__aios_team_root/.aios-team.json" 2>/dev/null | head -n1)"
    if [[ -n "${__aios_team_slug:-}" ]]; then export AGENTIC_OS_UPSTREAM_SLUG="$__aios_team_slug"; fi
  fi
  if [[ -z "${AGENTIC_OS_UPSTREAM_BRANCH:-}" ]]; then
    __aios_team_branch="$(sed -n 's/.*"team_branch"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$__aios_team_root/.aios-team.json" 2>/dev/null | head -n1)"
    if [[ -n "${__aios_team_branch:-}" ]]; then export AGENTIC_OS_UPSTREAM_BRANCH="$__aios_team_branch"; fi
  fi
fi

unset __aios_team_root __aios_team_slug __aios_team_branch 2>/dev/null || true
