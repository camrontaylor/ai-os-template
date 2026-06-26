#!/usr/bin/env bash
set -euo pipefail

REAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEST_ROOT="${TMPDIR:-/tmp}/aios-memory-target-resolver-test"
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
    "$TEST_ROOT/repo/.claude" \
    "$TEST_ROOT/repo/scripts/lib" \
    "$TEST_ROOT/repo/context" \
    "$TEST_ROOT/repo/clients/acme/context" \
    "$TEST_ROOT/repo/clients/beta/context"
  cp "$REAL_REPO/scripts/lib/memory-target-resolver.js" "$TEST_ROOT/repo/scripts/lib/memory-target-resolver.js"
  cat > "$TEST_ROOT/repo/AGENTS.md" <<'EOF'
# Root
EOF
  cat > "$TEST_ROOT/repo/clients/acme/AGENTS.md" <<'EOF'
# Client: Acme
EOF
  cat > "$TEST_ROOT/repo/clients/beta/AGENTS.md" <<'EOF'
# Client: Beta
EOF
}

resolve_json() {
  local cwd="$1"
  local prompt="$2"
  node "$TEST_ROOT/repo/scripts/lib/memory-target-resolver.js" --cwd "$cwd" --prompt "$prompt"
}

assert_field() {
  local json_file="$1"
  local field="$2"
  local expected="$3"
  python3 - "$json_file" "$field" "$expected" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
field = sys.argv[2]
expected = sys.argv[3]
value = data
for part in field.split("."):
    value = value.get(part) if isinstance(value, dict) else None
assert value == expected, (field, value, expected, data)
PY
}

test_root_defaults_to_root() {
  make_fake_repo
  resolve_json "$TEST_ROOT/repo" "Update AI-OS memory docs" > "$TEST_ROOT/out.json"
  assert_field "$TEST_ROOT/out.json" "targetType" "root"
  ok "root system prompt targets root"
}

test_single_client_targets_client() {
  make_fake_repo
  resolve_json "$TEST_ROOT/repo" "Remember this for Acme" > "$TEST_ROOT/out.json"
  assert_field "$TEST_ROOT/out.json" "targetType" "client"
  assert_field "$TEST_ROOT/out.json" "client.slug" "acme"
  ok "single client mention targets that client"
}

test_client_cwd_targets_client() {
  make_fake_repo
  resolve_json "$TEST_ROOT/repo/clients/beta" "Remember the staging URL" > "$TEST_ROOT/out.json"
  assert_field "$TEST_ROOT/out.json" "targetType" "client"
  assert_field "$TEST_ROOT/out.json" "client.slug" "beta"
  ok "client cwd targets current client"
}

test_all_clients_targets_root() {
  make_fake_repo
  resolve_json "$TEST_ROOT/repo/clients/beta" "Audit all client folders" > "$TEST_ROOT/out.json"
  assert_field "$TEST_ROOT/out.json" "targetType" "root"
  ok "all-client prompt targets root"
}

test_multiple_clients_is_ambiguous() {
  make_fake_repo
  resolve_json "$TEST_ROOT/repo" "Compare Acme and Beta notes" > "$TEST_ROOT/out.json"
  assert_field "$TEST_ROOT/out.json" "targetType" "ambiguous"
  ok "multiple client mentions are ambiguous"
}

info "Running memory target resolver tests..."
test_root_defaults_to_root
test_single_client_targets_client
test_client_cwd_targets_client
test_all_clients_targets_root
test_multiple_clients_is_ambiguous
ok "memory target resolver tests passed"
