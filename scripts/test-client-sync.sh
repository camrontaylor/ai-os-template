#!/usr/bin/env bash
set -euo pipefail

REAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEST_ROOT="${TMPDIR:-/tmp}/aios-client-sync-test"
trap 'rm -rf "$TEST_ROOT"' EXIT

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ok() { printf "${GREEN}  ✓ %s${NC}\n" "$1"; }
fail() { printf "${RED}  ✗ %s${NC}\n" "$1" >&2; exit 1; }
info() { printf "${CYAN}%s${NC}\n" "$1"; }

make_fake_repo() {
  rm -rf "$TEST_ROOT"
  mkdir -p \
    "$TEST_ROOT/repo/scripts" \
    "$TEST_ROOT/repo/.claude/commands" \
    "$TEST_ROOT/repo/.claude/skills/shared-skill" \
    "$TEST_ROOT/repo/clients/acme/.claude/skills/shared-skill" \
    "$TEST_ROOT/repo/clients/acme/.claude/skills/client-only" \
    "$TEST_ROOT/repo/clients/acme/context" \
    "$TEST_ROOT/repo/cron/templates"

  cp "$REAL_REPO/scripts/update-clients.sh" "$TEST_ROOT/repo/scripts/update-clients.sh"
  cp "$REAL_REPO/scripts/client-sync-audit.sh" "$TEST_ROOT/repo/scripts/client-sync-audit.sh"

  cat > "$TEST_ROOT/repo/AGENTS.md" <<'EOF'
# Root
EOF
  cat > "$TEST_ROOT/repo/.claude/skills/shared-skill/SKILL.md" <<'EOF'
root shared skill v2
EOF
  cat > "$TEST_ROOT/repo/.claude/commands/onboarding.md" <<'EOF'
root command
EOF
  cat > "$TEST_ROOT/repo/clients/acme/AGENTS.md" <<'EOF'
# Client: Acme
EOF
  cat > "$TEST_ROOT/repo/clients/acme/.claude/skills/shared-skill/SKILL.md" <<'EOF'
stale shared skill v1
EOF
  cat > "$TEST_ROOT/repo/clients/acme/.claude/skills/shared-skill/SKILL.local.md" <<'EOF'
client local override
EOF
  cat > "$TEST_ROOT/repo/clients/acme/.claude/skills/client-only/SKILL.md" <<'EOF'
client-only skill
EOF
}

assert_file_contains() {
  local file="$1"
  local expected="$2"
  [[ -f "$file" ]] || fail "Missing file: $file"
  grep -Fq "$expected" "$file" || fail "Expected '$expected' in $file"
}

test_update_clients_preserves_local_and_client_only() {
  make_fake_repo
  (
    cd "$TEST_ROOT/repo"
    bash scripts/update-clients.sh >/tmp/aios-client-sync-test.out
    bash scripts/client-sync-audit.sh --strict >/tmp/aios-client-sync-audit-test.out
  )

  assert_file_contains "$TEST_ROOT/repo/clients/acme/.claude/skills/shared-skill/SKILL.md" "root shared skill v2"
  assert_file_contains "$TEST_ROOT/repo/clients/acme/.claude/skills/shared-skill/SKILL.local.md" "client local override"
  assert_file_contains "$TEST_ROOT/repo/clients/acme/.claude/skills/client-only/SKILL.md" "client-only skill"
  assert_file_contains "$TEST_ROOT/repo/clients/acme/.claude/commands/onboarding.md" "root command"
  assert_file_contains "$TEST_ROOT/repo/clients/acme/context/MEMORY.md" "Client-scoped curated scratchpad"
  ok "update-clients syncs shared skills while preserving local overrides and client-only skills"
}

info "Running client sync tests..."
test_update_clients_preserves_local_and_client_only
ok "client sync tests passed"
