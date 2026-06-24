# scripts/lib/team.sh
# Shared helpers for AI-OS team sharing. SOURCED by make-team-copy.sh and
# team-join.sh; not run on its own. Callers own their own strict mode.
#
# This file is the SINGLE SOURCE OF TRUTH for the team-sharing boundary.
#
# TEAM_STRIP below is the must-never-ship list: git-tracked paths that are
# personal and must never reach a teammate. In plain words, the clean copy
# leaves out:
#   clients/                     - all client work (brand, memory, projects, IP)
#   projects/                    - your own project outputs at the root
#   context/USER.md              - your personal profile
#   context/operator/            - your personal identity and voice notes
#   CLAUDE.local.md              - your personal standing rules
#   .claude/launch.json          - your machine-specific launch config
#   scripts/notion-sync/*.plist  - your personal scheduled-sync job
#
# The agent persona context/SOUL.md SHIPS by default, so the whole team shares
# one house voice. To give each teammate a blank persona instead, swap the
# TEAM_STRIP line for the commented variant just below it.

# Bring in PYTHON_CMD for team_write_config when python is available (optional).
if [[ -z "${PYTHON_CMD+set}" ]]; then
  _team_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  [[ -f "$_team_lib_dir/python.sh" ]] && source "$_team_lib_dir/python.sh" || true
  unset _team_lib_dir
fi

# The must-never-ship list. Null-delimited extended regex over repo-relative paths.
TEAM_STRIP='^(clients/|projects/|context/USER\.md$|context/operator/|CLAUDE\.local\.md$|\.claude/launch\.json$|scripts/notion-sync/.*\.plist$)'
# To ship a BLANK persona to teammates instead of your SOUL.md, use this line
# instead of the one above (adds context/SOUL.md to the strip list):
# TEAM_STRIP='^(clients/|projects/|context/USER\.md$|context/SOUL\.md$|context/operator/|CLAUDE\.local\.md$|\.claude/launch\.json$|scripts/notion-sync/.*\.plist$)'

# team_slug_from_url <git-url> -> echoes "owner/repo"
# Handles https://host/owner/repo(.git), https://TOKEN@host/owner/repo(.git),
# and git@host:owner/repo(.git).
team_slug_from_url() {
  local url="${1:-}"
  url="${url%.git}"
  url="${url%/}"
  case "$url" in
    *@*:*) url="${url##*:}" ;;                                     # git@host:owner/repo
    *://*) url="${url#*://}"; url="${url#*@}"; url="${url#*/}" ;;   # https://[token@]host/owner/repo
  esac
  # Reduce to the last two path segments: owner/repo
  local repo owner rest
  repo="${url##*/}"
  rest="${url%/*}"
  owner="${rest##*/}"
  if [[ -n "$owner" && "$owner" != "$rest" ]]; then
    printf '%s/%s\n' "$owner" "$repo"
  else
    printf '%s\n' "$url"
  fi
}

# team_write_config <dest_dir> <slug> [branch]
# Writes <dest_dir>/.aios-team.json. Uses python for safe quoting when present,
# falls back to printf otherwise.
team_write_config() {
  local dest="${1:-}" slug="${2:-}" branch="${3:-main}"
  [[ -z "$branch" ]] && branch="main"
  [[ -z "$dest" ]] && return 1
  local out="$dest/.aios-team.json"
  if [[ -n "${PYTHON_CMD+set}" ]] && [[ ${#PYTHON_CMD[@]} -gt 0 ]]; then
    TEAM_SLUG="$slug" TEAM_BRANCH="$branch" "${PYTHON_CMD[@]}" - "$out" <<'PY'
import json, os, sys
out = sys.argv[1]
data = {
    "team_slug": os.environ.get("TEAM_SLUG", ""),
    "team_branch": os.environ.get("TEAM_BRANCH", "main"),
    "schema": 1,
}
with open(out, "w") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\n")
PY
  else
    printf '{\n  "team_slug": "%s",\n  "team_branch": "%s",\n  "schema": 1\n}\n' "$slug" "$branch" > "$out"
  fi
}

# team_leak_verify <tree_dir> -> returns nonzero and prints offending paths if
# ANY private data is present. Defense in depth on top of the structural
# guarantee (we only ever copy git-tracked files minus TEAM_STRIP). Never
# modifies anything, never deletes.
team_leak_verify() {
  local tree="${1:-}"
  [[ -z "$tree" || ! -d "$tree" ]] && { printf 'team_leak_verify: no tree to check\n' >&2; return 2; }
  local hits=0 rel

  # (a) must-never-ship paths present in the tree (ignore empty-folder markers)
  while IFS= read -r rel; do
    rel="${rel#./}"
    case "$rel" in
      .git/*) continue ;;
      */.gitkeep) continue ;;
    esac
    if printf '%s\n' "$rel" | grep -qE "$TEAM_STRIP"; then
      printf '  LEAK (private path present): %s\n' "$rel"
      hits=1
    fi
  done < <(cd "$tree" && find . -type f 2>/dev/null)

  # (b) gitignored brain that should never be in a clean copy
  local p
  for p in "context/MEMORY.md" "context/learnings.md" ".memsearch" "context/notion" "context/_private"; do
    if [[ -e "$tree/$p" ]]; then printf '  LEAK (brain present): %s\n' "$p"; hits=1; fi
  done
  if compgen -G "$tree/context/memory/*.md" >/dev/null 2>&1; then printf '  LEAK (brain present): context/memory/*.md\n'; hits=1; fi
  if compgen -G "$tree/context/transcripts/*.md" >/dev/null 2>&1; then printf '  LEAK (brain present): context/transcripts/*.md\n'; hits=1; fi
  if [[ -s "$tree/.env" ]]; then printf '  LEAK (filled .env present): .env\n'; hits=1; fi

  # (c) the maintainer home path baked into any text file
  local homehit
  homehit="$(cd "$tree" && grep -rIlE '/Users/[A-Za-z0-9._-]+/' . 2>/dev/null | grep -v '^\./\.git/' | head -n 20)"
  if [[ -n "$homehit" ]]; then
    printf '  LEAK (home path in file):\n'
    printf '%s\n' "$homehit" | sed 's/^/    /'
    hits=1
  fi

  # (d) a stray filled secret (heuristic; skips docs and example files)
  local sechit
  sechit="$(cd "$tree" && grep -rIlE '^[A-Z][A-Z0-9_]*_(KEY|SECRET|TOKEN)=[^[:space:]]+' . 2>/dev/null \
    | grep -v '^\./\.git/' | grep -viE '\.(md|example)|example' | head -n 20)"
  if [[ -n "$sechit" ]]; then
    printf '  LEAK (filled secret value):\n'
    printf '%s\n' "$sechit" | sed 's/^/    /'
    hits=1
  fi

  return "$hits"
}
