#!/usr/bin/env bash
# Create a new client workspace under clients/.
# Usage: bash scripts/add-client.sh "Client Name"

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/add-client.sh \"Client Name\""
  echo ""
  echo "Creates a client workspace under clients/ with skills, scripts,"
  echo "and empty directories for brand context, memory, and projects."
  exit 1
fi

CLIENT_NAME="$1"

# Convert to slug: lowercase, spaces to hyphens, strip non-alphanumeric
CLIENT_SLUG=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

CLIENT_DIR="${PROJECT_DIR}/clients/${CLIENT_SLUG}"

if [[ -d "$CLIENT_DIR" ]]; then
  echo "Error: Client folder already exists: clients/${CLIENT_SLUG}/"
  echo "To start over, remove it first and re-run this script."
  exit 1
fi

echo "Creating client workspace: clients/${CLIENT_SLUG}/"

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

---

## Claude Runtime

### Session Type Detection

Scan this client's `brand_context/` for populated `.md` files (ls, not read).
- **No files** -> first run -> onboarding is deferrable, not forced. If the first message is a concrete task or question, do that task now using sensible defaults, then offer to run `/start-here` for this client afterward so future output is on-brand. If the user greets, asks to get started or set up, or has no task, run `/start-here` to build this client's brand foundation.
- **Files exist** -> returning mode -> follow the root `CLAUDE.md` runtime (silent startup, daily memory, wrap-up).

This block only adds the deferrable first-run trigger so a new client workspace can onboard itself without blocking quick tasks. The full runtime (returning mode, memory, greeting, wrap-up) lives in the root `CLAUDE.md`.
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

# Create directory structure
mkdir -p "${CLIENT_DIR}/brand_context"
mkdir -p "${CLIENT_DIR}/context/memory"
mkdir -p "${CLIENT_DIR}/projects"
mkdir -p "${CLIENT_DIR}/cron/jobs"
mkdir -p "${CLIENT_DIR}/cron/logs"
mkdir -p "${CLIENT_DIR}/cron/status"
mkdir -p "${CLIENT_DIR}/cron/templates"

# Copy skills from root
if [[ -d "${PROJECT_DIR}/.claude/skills" ]]; then
  mkdir -p "${CLIENT_DIR}/.claude"
  cp -R "${PROJECT_DIR}/.claude/skills" "${CLIENT_DIR}/.claude/skills"
  echo "  Copied skills"
fi

# Copy Claude Code settings if they exist
if [[ -f "${PROJECT_DIR}/.claude/settings.json" ]]; then
  cp "${PROJECT_DIR}/.claude/settings.json" "${CLIENT_DIR}/.claude/settings.json"
  echo "  Copied Claude Code settings"
fi

# Copy hooks_info if it exists (required by hooks in settings.json)
if [[ -d "${PROJECT_DIR}/.claude/hooks_info" ]]; then
  cp -R "${PROJECT_DIR}/.claude/hooks_info" "${CLIENT_DIR}/.claude/hooks_info"
  echo "  Copied hooks_info"
fi

# Copy hooks if they exist (session-sync, gsd hooks, etc.)
if [[ -d "${PROJECT_DIR}/.claude/hooks" ]]; then
  cp -R "${PROJECT_DIR}/.claude/hooks" "${CLIENT_DIR}/.claude/hooks"
  echo "  Copied hooks"
fi

# Copy scripts from root
cp -R "${PROJECT_DIR}/scripts" "${CLIENT_DIR}/scripts"
create_client_cron_proxy_scripts "${CLIENT_DIR}/scripts"
echo "  Copied scripts"

# Copy cron templates if they exist
if [[ -d "${PROJECT_DIR}/cron/templates" ]]; then
  cp -R "${PROJECT_DIR}/cron/templates/." "${CLIENT_DIR}/cron/templates/"
  echo "  Copied cron templates"
fi

# Create client instruction files
create_client_agents_file "${CLIENT_DIR}/AGENTS.md" "${CLIENT_NAME}"
echo "  Created client AGENTS.md"

create_client_claude_wrapper "${CLIENT_DIR}/CLAUDE.md"
echo "  Created client CLAUDE.md wrapper"

# Seed learnings from root (so clients start with accumulated knowledge)
if [[ -f "${PROJECT_DIR}/context/learnings.md" ]]; then
  cp "${PROJECT_DIR}/context/learnings.md" "${CLIENT_DIR}/context/learnings.md"
  echo "  Seeded learnings.md from root (will diverge per-client from here)"
else
  cat > "${CLIENT_DIR}/context/learnings.md" <<LEARNINGS
# Learnings

## General

### What works well

### What doesn't work well

## Individual Skills
LEARNINGS
  echo "  Created learnings.md"
fi

# Create .gitkeep files to preserve empty directories
touch "${CLIENT_DIR}/brand_context/.gitkeep"
touch "${CLIENT_DIR}/context/memory/.gitkeep"
touch "${CLIENT_DIR}/projects/.gitkeep"
touch "${CLIENT_DIR}/cron/jobs/.gitkeep"

# Do NOT copy the root .env into the client. That duplicated every secret into every
# client folder (a drift and leak risk). Clients inherit shared keys from the root .env
# at runtime; the client .env is for client-specific overrides only.
if [[ -f "${PROJECT_DIR}/.env" ]]; then
  printf '# Client-specific overrides only. Shared keys are inherited from the root .env.\n# Add CLIENT_SPECIFIC_VAR=value lines here only if this client needs its own value.\n' > "${CLIENT_DIR}/.env"
  echo "  Created clients/${CLIENT_SLUG}/.env (overrides only; shared keys inherited from root)"
fi

echo ""
echo "Client workspace ready: clients/${CLIENT_SLUG}/"
echo ""
echo "Next steps:"
echo "  cd ${PROJECT_DIR}/clients/${CLIENT_SLUG}"
echo "  claude"
echo "  Claude detects the empty brand_context. If you start with a task it does that first, then offers /start-here; otherwise it runs /start-here to build this client's brand foundation."
