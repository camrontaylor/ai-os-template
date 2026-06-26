#!/usr/bin/env bash
# Sync skills and scripts from the root to all client workspaces.
# Run this after update.sh to push the latest methodology to all clients.
# Usage: bash scripts/update-clients.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLIENTS_DIR="${PROJECT_DIR}/clients"

create_client_agents_file() {
  local target="$1"
  local client_name="$2"
  cat > "$target" <<EOF
# Client: ${client_name}

Add client-specific instructions here. These layer on top of the root AGENTS.md instructions - they don't replace them.

## Client-Specific Instructions

-

## Notes

-
EOF
}

create_client_claude_wrapper() {
  local target="$1"
  cat > "$target" <<'EOF'
# CLAUDE.md

This file keeps Claude Code compatible with the client-specific instructions in `AGENTS.md`.

@AGENTS.md
EOF
}

create_memory_scaffold() {
  local target="$1"
  cat > "$target" <<'EOF'
<!-- Cap: 2,500 chars. Client-scoped curated scratchpad. -->
# Working Memory

## Active Threads

## Environment Notes

## Pending Decisions
EOF
}

create_client_cron_proxy_scripts() {
  local scripts_dir="$1"

  cat > "${scripts_dir}/start-crons.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
AGENTIC_OS_DIR="$ROOT_PROJECT_DIR" bash "$ROOT_PROJECT_DIR/scripts/start-crons.sh" "$@"
EOF

  cat > "${scripts_dir}/stop-crons.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
AGENTIC_OS_DIR="$ROOT_PROJECT_DIR" bash "$ROOT_PROJECT_DIR/scripts/stop-crons.sh" "$@"
EOF

  cat > "${scripts_dir}/status-crons.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
AGENTIC_OS_DIR="$ROOT_PROJECT_DIR" bash "$ROOT_PROJECT_DIR/scripts/status-crons.sh" "$@"
EOF

  cat > "${scripts_dir}/logs-crons.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
AGENTIC_OS_DIR="$ROOT_PROJECT_DIR" bash "$ROOT_PROJECT_DIR/scripts/logs-crons.sh" "$@"
EOF

  cat > "${scripts_dir}/run-job.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
CLIENT_SLUG="$(basename "$(cd "$(dirname "$0")/.." && pwd)")"
AGENTIC_OS_DIR="$ROOT_PROJECT_DIR" bash "$ROOT_PROJECT_DIR/scripts/run-job.sh" "$@" --client "$CLIENT_SLUG"
EOF

  cat > "${scripts_dir}/start-crons.ps1" <<'EOF'
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$RootProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$RootScript = Join-Path $RootProjectDir "scripts\start-crons.ps1"
$env:AGENTIC_OS_DIR = $RootProjectDir

& $RootScript @Arguments
EOF

  cat > "${scripts_dir}/stop-crons.ps1" <<'EOF'
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$RootProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$RootScript = Join-Path $RootProjectDir "scripts\stop-crons.ps1"
$env:AGENTIC_OS_DIR = $RootProjectDir

& $RootScript @Arguments
EOF

  cat > "${scripts_dir}/status-crons.ps1" <<'EOF'
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$RootProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$RootScript = Join-Path $RootProjectDir "scripts\status-crons.ps1"
$env:AGENTIC_OS_DIR = $RootProjectDir

& $RootScript @Arguments
EOF

  cat > "${scripts_dir}/logs-crons.ps1" <<'EOF'
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$RootProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$RootScript = Join-Path $RootProjectDir "scripts\logs-crons.ps1"
$env:AGENTIC_OS_DIR = $RootProjectDir

& $RootScript @Arguments
EOF

  cat > "${scripts_dir}/run-job.ps1" <<'EOF'
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$RootProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$ClientSlug = Split-Path -Leaf (Split-Path -Parent $PSScriptRoot)
$RootScript = Join-Path $RootProjectDir "scripts\run-job.ps1"
$env:AGENTIC_OS_DIR = $RootProjectDir

$ForwardedArguments = @()
if ($Arguments) {
    $ForwardedArguments += $Arguments
}
$ForwardedArguments += @("--client", $ClientSlug)

& $RootScript @ForwardedArguments
EOF

  chmod +x \
    "${scripts_dir}/start-crons.sh" \
    "${scripts_dir}/stop-crons.sh" \
    "${scripts_dir}/status-crons.sh" \
    "${scripts_dir}/logs-crons.sh" \
    "${scripts_dir}/run-job.sh"
}

sync_dir() {
  local src="${1%/}"
  local dest="${2%/}"
  mkdir -p "$dest"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude '.git/' \
      --exclude '.venv/' \
      --exclude 'node_modules/' \
      --exclude '__pycache__/' \
      "$src/" "$dest/"
  else
    rm -rf "$dest"
    mkdir -p "$dest"
    cp -R "$src/." "$dest/"
  fi
}

sync_shared_skill_dir() {
  local src="${1%/}"
  local dest="${2%/}"
  local tmp

  tmp="$(mktemp -d "${TMPDIR:-/tmp}/aios-client-skill-local.XXXXXX")"

  if [[ -d "$dest" ]]; then
    while IFS= read -r local_file; do
      [[ -f "$local_file" ]] || continue
      cp -p "$local_file" "$tmp/$(basename "$local_file")"
    done < <(find "$dest" -maxdepth 1 -type f \( -name 'SKILL.local.md' -o -name '*.local.md' \) -print)

    if [[ -d "$dest/local" ]]; then
      cp -R "$dest/local" "$tmp/local"
    fi
    if [[ -d "$dest/.local" ]]; then
      cp -R "$dest/.local" "$tmp/.local"
    fi
  fi

  sync_dir "$src" "$dest"

  if [[ -d "$tmp" ]]; then
    cp -R "$tmp/." "$dest/"
    rm -rf "$tmp"
  fi
}

is_claude_wrapper() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  grep -qx '@AGENTS.md' "$file"
}

get_client_display_name() {
  local file="$1"
  head -n 1 "$file" | tr -d '\r' | sed 's/^# Client: //'
}

is_exact_legacy_client_claude() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local first_line
  local remainder
  local expected

  first_line="$(head -n 1 "$file" | tr -d '\r')"
  [[ "$first_line" =~ ^#\ Client:\  ]] || return 1

  remainder="$(tail -n +3 "$file" | tr -d '\r')"
  expected="Add client-specific instructions here. These layer on top of the root CLAUDE.md methodology - they don't replace it.

## Client-Specific Instructions

-

## Notes

-"

  [[ "$remainder" == "$expected" ]]
}

sync_client_instruction_files() {
  local client_dir="$1"
  local client_name="$2"
  local agents_path="${client_dir}/AGENTS.md"
  local claude_path="${client_dir}/CLAUDE.md"

  if [[ ! -f "$agents_path" ]]; then
    if [[ -f "$claude_path" ]] && ! is_claude_wrapper "$claude_path"; then
      if is_exact_legacy_client_claude "$claude_path"; then
        create_client_agents_file "$agents_path" "$(get_client_display_name "$claude_path")"
        echo "  Created AGENTS.md from legacy client scaffold"
        create_client_claude_wrapper "$claude_path"
        echo "  Converted legacy CLAUDE.md to wrapper"
      else
        cp "$claude_path" "$agents_path"
        echo "  Seeded AGENTS.md from existing CLAUDE.md"
        echo "  Preserved existing CLAUDE.md (manual cleanup recommended)"
      fi
    else
      create_client_agents_file "$agents_path" "$client_name"
      echo "  Created AGENTS.md"
    fi
  fi

  if [[ ! -f "$claude_path" ]]; then
    create_client_claude_wrapper "$claude_path"
    echo "  Created CLAUDE.md wrapper"
  fi
}

if [[ ! -d "$CLIENTS_DIR" ]]; then
  echo "No clients/ directory found. Nothing to sync."
  echo "Create a client first: bash scripts/add-client.sh \"Client Name\""
  exit 0
fi

# Find client folders (any directory directly under clients/)
CLIENT_COUNT=0
SYNCED=0

for CLIENT_DIR in "${CLIENTS_DIR}"/*/; do
  [[ -d "$CLIENT_DIR" ]] || continue
  CLIENT_NAME=$(basename "$CLIENT_DIR")
  CLIENT_COUNT=$((CLIENT_COUNT + 1))

  echo "Syncing ${CLIENT_NAME}..."

  sync_client_instruction_files "$CLIENT_DIR" "$CLIENT_NAME"

  if [[ ! -f "${CLIENT_DIR}/context/MEMORY.md" ]]; then
    mkdir -p "${CLIENT_DIR}/context"
    create_memory_scaffold "${CLIENT_DIR}/context/MEMORY.md"
    echo "  Created MEMORY.md scaffold"
  fi

  # Sync skills - copy root skills over, but preserve client-only skills
  if [[ -d "${PROJECT_DIR}/.claude/skills" ]]; then
    mkdir -p "${CLIENT_DIR}/.claude/skills"

    # Copy each root skill folder to the client (overwrite if exists)
    for root_skill in "${PROJECT_DIR}/.claude/skills"/*/; do
      [[ -d "$root_skill" ]] || continue
      skill_name=$(basename "$root_skill")
      [[ "$skill_name" == "_catalog" || "$skill_name" == "_archived" ]] && continue
      sync_shared_skill_dir "$root_skill" "${CLIENT_DIR}/.claude/skills/${skill_name}"
    done

    # Copy catalog files
    if [[ -d "${PROJECT_DIR}/.claude/skills/_catalog" ]]; then
      sync_dir "${PROJECT_DIR}/.claude/skills/_catalog" "${CLIENT_DIR}/.claude/skills/_catalog"
    fi

    # Count client-only skills (exist in client but not in root)
    CLIENT_ONLY=0
    for client_skill in "${CLIENT_DIR}/.claude/skills"/*/; do
      [[ -d "$client_skill" ]] || continue
      skill_name=$(basename "$client_skill")
      [[ "$skill_name" == "_catalog" || "$skill_name" == "_archived" ]] && continue
      if [[ ! -d "${PROJECT_DIR}/.claude/skills/${skill_name}" ]]; then
        CLIENT_ONLY=$((CLIENT_ONLY + 1))
      fi
    done

    if [[ $CLIENT_ONLY -gt 0 ]]; then
      echo "  Skills synced (${CLIENT_ONLY} client-only skill(s) preserved)"
    else
      echo "  Skills synced"
    fi
  fi

  # Sync slash commands
  if [[ -d "${PROJECT_DIR}/.claude/commands" ]]; then
    sync_dir "${PROJECT_DIR}/.claude/commands" "${CLIENT_DIR}/.claude/commands"
    echo "  Commands synced"
  fi

  # Sync Claude Code settings
  if [[ -f "${PROJECT_DIR}/.claude/settings.json" ]]; then
    cp "${PROJECT_DIR}/.claude/settings.json" "${CLIENT_DIR}/.claude/settings.json"
    echo "  Settings synced"
  fi

  # Sync hooks_info (required by hooks in settings.json)
  if [[ -d "${PROJECT_DIR}/.claude/hooks_info" ]]; then
    sync_dir "${PROJECT_DIR}/.claude/hooks_info" "${CLIENT_DIR}/.claude/hooks_info"
    echo "  Hooks info synced"
  fi

  # Sync hooks (session-sync, gsd hooks, etc.)
  if [[ -d "${PROJECT_DIR}/.claude/hooks" ]]; then
    sync_dir "${PROJECT_DIR}/.claude/hooks" "${CLIENT_DIR}/.claude/hooks"
    echo "  Hooks synced"
  fi

  # Sync scripts
  sync_dir "${PROJECT_DIR}/scripts" "${CLIENT_DIR}/scripts"
  create_client_cron_proxy_scripts "${CLIENT_DIR}/scripts"
  echo "  Scripts synced"

  # Sync cron templates
  if [[ -d "${PROJECT_DIR}/cron/templates" ]]; then
    sync_dir "${PROJECT_DIR}/cron/templates" "${CLIENT_DIR}/cron/templates"
    echo "  Cron templates synced"
  fi

  SYNCED=$((SYNCED + 1))
  echo ""
done

if [[ $CLIENT_COUNT -eq 0 ]]; then
  echo "No client folders found in clients/."
  echo "Create a client first: bash scripts/add-client.sh \"Client Name\""
else
  echo "Done. Synced ${SYNCED} client(s)."
  echo ""
  echo "What was synced: client instruction files, skills, commands, scripts, settings, hooks, cron templates."
  echo "What was NOT overwritten: brand_context, existing memory, learnings, projects, .env, cron jobs."
  echo "Missing client context/MEMORY.md files may be scaffolded."
fi
