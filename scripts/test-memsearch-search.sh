#!/usr/bin/env bash
set -euo pipefail

REAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEST_ROOT="${TMPDIR:-/tmp}/aios-memsearch-search-test"
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
  mkdir -p "$TEST_ROOT/repo/scripts/lib" "$TEST_ROOT/repo/context/memory" "$TEST_ROOT/bin"
  cp "$REAL_REPO/scripts/memsearch-search.sh" "$TEST_ROOT/repo/scripts/memsearch-search.sh"
  cp "$REAL_REPO/scripts/memory-search.sh" "$TEST_ROOT/repo/scripts/memory-search.sh"
  cp "$REAL_REPO/scripts/memory-search.py" "$TEST_ROOT/repo/scripts/memory-search.py"
  cp "$REAL_REPO/scripts/lib/merge-memory-results.py" "$TEST_ROOT/repo/scripts/lib/merge-memory-results.py"
  cat > "$TEST_ROOT/repo/scripts/lib/memsearch-collection.sh" <<'EOF'
#!/usr/bin/env bash
echo "test_collection"
EOF
  chmod +x "$TEST_ROOT/repo/scripts/lib/memsearch-collection.sh"
  cat > "$TEST_ROOT/repo/context/MEMORY.md" <<'EOF'
# Working Memory

## Active Threads
- Prior decisions say Coast recall should fall back to markdown when Milvus is sandboxed.
EOF
}

assert_contains() {
  local file="$1"
  local expected="$2"
  grep -Fq "$expected" "$file" || fail "Expected '$expected' in $file"
}

test_success_uses_canonical_collection() {
  make_fake_repo
  cat > "$TEST_ROOT/bin/memsearch" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" > "${MEMSEARCH_LOG:?}"
printf '[{"source":"context/memory/2026-06-25.md","text":"match"}]\n'
EOF
  chmod +x "$TEST_ROOT/bin/memsearch"

  (
    cd "$TEST_ROOT/repo"
    export PATH="$TEST_ROOT/bin:$PATH"
    export MEMSEARCH_LOG="$TEST_ROOT/memsearch.log"
    bash scripts/memsearch-search.sh "Coast HubSpot" 7 > "$TEST_ROOT/out.json"
  )

  assert_contains "$TEST_ROOT/memsearch.log" "search Coast HubSpot --top-k 7 --json-output --collection test_collection"
  python3 - "$TEST_ROOT/out.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data, "expected merged results"
modes = {mode for item in data for mode in item.get("search_modes", [item.get("search_mode")])}
assert "semantic" in modes, data
assert "markdown_fallback" in modes, data
PY
  ok "search wrapper resolves the canonical collection"
}

test_sandbox_failure_returns_markdown_fallback() {
  make_fake_repo
  cat > "$TEST_ROOT/bin/memsearch" <<'EOF'
#!/usr/bin/env bash
echo "PermissionError: [Errno 1] Operation not permitted: '/Users/camronstricklin/.memsearch/milvus.db/LOCK'" >&2
exit 1
EOF
  chmod +x "$TEST_ROOT/bin/memsearch"

  (
    cd "$TEST_ROOT/repo"
    export PATH="$TEST_ROOT/bin:$PATH"
    bash scripts/memsearch-search.sh "prior decisions" > "$TEST_ROOT/out.json" 2> "$TEST_ROOT/err.txt"
  )

  assert_contains "$TEST_ROOT/err.txt" "Returning sandbox-safe markdown recall results instead"
  assert_contains "$TEST_ROOT/err.txt" "sandbox_permissions=\"require_escalated\""
  python3 - "$TEST_ROOT/out.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data, "expected fallback results"
assert data[0]["search_mode"] == "markdown_fallback", data[0]
PY
  ok "sandbox failures return markdown fallback results"
}

info "Running memsearch search wrapper tests..."
test_success_uses_canonical_collection
test_sandbox_failure_returns_markdown_fallback
ok "memsearch search wrapper tests passed"
