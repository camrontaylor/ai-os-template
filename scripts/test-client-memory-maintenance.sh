#!/usr/bin/env bash
set -euo pipefail

REAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEST_ROOT="${TMPDIR:-/tmp}/aios-client-memory-maintenance-test"
TODAY="$(date +%F)"
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
    "$TEST_ROOT/repo/context" \
    "$TEST_ROOT/repo/clients/acme/context/memory"
  cp "$REAL_REPO/scripts/client-memory-maintenance.sh" "$TEST_ROOT/repo/scripts/client-memory-maintenance.sh"
  cat > "$TEST_ROOT/repo/context/MEMORY.md" <<'EOF'
# Root Memory

## Active Threads
- Root must not be touched.
EOF
  cat > "$TEST_ROOT/repo/clients/acme/context/MEMORY.md" <<'EOF'
# Client Memory

## Active Threads
- Old resolved thread shipped

## Environment Notes

## Pending Decisions
EOF
  cat > "$TEST_ROOT/repo/clients/acme/context/memory/$TODAY.md" <<'EOF'
# Today

## Session 1

### Open threads
- Acme proposal needs pricing review
- Session in progress.

### Decisions
- Decide whether Acme launch uses Option A
EOF
}

assert_file_contains() {
  local file="$1"
  local expected="$2"
  [[ -f "$file" ]] || fail "Missing file: $file"
  grep -Fq "$expected" "$file" || fail "Expected '$expected' in $file"
}

assert_file_not_contains() {
  local file="$1"
  local unexpected="$2"
  if grep -Fq "$unexpected" "$file"; then
    fail "Did not expect '$unexpected' in $file"
  fi
}

test_client_distill_and_curate_stay_client_scoped() {
  make_fake_repo
  (
    cd "$TEST_ROOT/repo"
    bash scripts/client-memory-maintenance.sh --mode distill --client acme > /tmp/aios-client-memory-distill.out
    bash scripts/client-memory-maintenance.sh --mode gaps --client acme > /tmp/aios-client-memory-gaps.out
    bash scripts/client-memory-maintenance.sh --mode curate --client acme > /tmp/aios-client-memory-curate.out
  )

  assert_file_contains "$TEST_ROOT/repo/clients/acme/context/MEMORY.md" "$TODAY: Acme proposal needs pricing review"
  assert_file_contains "$TEST_ROOT/repo/clients/acme/context/MEMORY.md" "$TODAY: Decide whether Acme launch uses Option A"
  assert_file_not_contains "$TEST_ROOT/repo/clients/acme/context/MEMORY.md" "Old resolved thread shipped"
  assert_file_contains "$TEST_ROOT/repo/context/MEMORY.md" "Root must not be touched."
  assert_file_not_contains "$TEST_ROOT/repo/context/MEMORY.md" "Acme proposal needs pricing review"
  assert_file_contains "$TEST_ROOT/repo/clients/acme/context/memory/${TODAY}_gap-analysis.md" 'Client: `acme`'
  ok "client memory maintenance writes only client memory"
}

info "Running client memory maintenance tests..."
test_client_distill_and_curate_stay_client_scoped
ok "client memory maintenance tests passed"
