#!/usr/bin/env bash
# make-team-copy.sh - build a clean, shareable copy of AI-OS for your team.
#
# In plain words:
#   - Copies ONLY the shared system (rules, skills, scripts, docs, the app).
#   - Leaves out everything personal: client folders, project outputs, memory,
#     your profile, your private rules, your API keys.
#   - The copy gets a FRESH git history (no old commits), so nothing personal
#     can hide in past history either.
#   - A pre-commit verifier checks the copy and refuses to finish if any private
#     data slipped through.
#
# Usage:
#   bash scripts/make-team-copy.sh [destination] [team-repo-url]
#
#   destination    where to build the clean copy (default ../AI-OS-team-starter)
#   team-repo-url  the private repo your team will use; when given, the copy is
#                  stamped so teammates' updates follow that repo automatically
#
# After it runs, push the copy to your private team repo and invite your team.
# The full guide is docs/team-sharing.md.

set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
source "$SRC/scripts/lib/team.sh"

DEST="${1:-$SRC/../AI-OS-team-starter}"
TEAM_URL="${2:-}"
TEAM_SLUG=""
[[ -n "$TEAM_URL" ]] && TEAM_SLUG="$(team_slug_from_url "$TEAM_URL")"

# The must-never-ship list lives once in scripts/lib/team.sh.
STRIP="$TEAM_STRIP"

echo "Source:      $SRC"
echo "Destination: $DEST"
[[ -n "$TEAM_SLUG" ]] && echo "Team repo:   $TEAM_SLUG"

if [ -e "$DEST" ]; then
  echo "ERROR: destination already exists. Pick an empty path or remove it first."
  exit 1
fi
mkdir -p "$DEST"

# Only git-tracked files, minus the personal ones, copied with structure intact.
( cd "$SRC" && git ls-files -z \
    | grep -zEv "$STRIP" \
    | rsync -a --from0 --files-from=- ./ "$DEST"/ )

# Folders that should exist but start empty for a new operator.
mkdir -p "$DEST/projects" "$DEST/brand_context"
touch "$DEST/projects/.gitkeep"

# Stamp the team upstream so teammates' normal update follows the team repo.
if [[ -n "$TEAM_SLUG" ]]; then
  team_write_config "$DEST" "$TEAM_SLUG" "main"
fi

# Safety gate: refuse to finish if any private data slipped through.
if ! team_leak_verify "$DEST"; then
  echo ""
  echo "ABORTING: private data found in the copy (see above). Nothing was committed."
  echo "The copy at $DEST was left for inspection. Remove it with: trash \"$DEST\""
  exit 1
fi

# Fresh, clean git history.
(
  cd "$DEST"
  git init -q
  git add -A
  git -c user.name="AI-OS" -c user.email="noreply@ai-os.local" \
      commit -qm "AI-OS team starter (clean system, no personal data)"
  git branch -M main
)

echo ""
echo "Done. Clean copy is at:"
echo "  $DEST"
echo "Contains the system only - no clients, no projects, no memory, no keys."
if [[ -n "$TEAM_SLUG" ]]; then
  echo "Stamped to follow team repo: $TEAM_SLUG (teammates' updates point here automatically)."
fi
echo ""
echo "Next steps:"
echo "  1) Create a PRIVATE GitHub repo for your team (if you have not yet)."
echo "  2) cd \"$DEST\""
echo "     git remote add origin <your-team-repo-url>"
echo "     git push -u origin main"
echo "  3) Each teammate: clone it, then run  bash scripts/team-join.sh <your-team-repo-url>"
echo "     (or just  bash scripts/centre.sh ), and paste their own keys."
if [[ -z "$TEAM_SLUG" ]]; then
  echo ""
  echo "Tip: teammates running  bash scripts/team-join.sh <url>  will wire updates"
  echo "     to the team repo even without a stamp. To stamp it now, build a fresh"
  echo "     copy with the URL:  bash scripts/make-team-copy.sh <new-dest> <url>"
fi
