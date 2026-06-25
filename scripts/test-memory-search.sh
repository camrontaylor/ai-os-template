#!/usr/bin/env bash
set -euo pipefail

REAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEST_ROOT="${TMPDIR:-/tmp}/aios-memory-search-test"
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
  mkdir -p "$TEST_ROOT/repo/scripts" "$TEST_ROOT/repo/context/memory" "$TEST_ROOT/repo/.memsearch/memory" "$TEST_ROOT/repo/brand_context"
  cp "$REAL_REPO/scripts/memory-search.py" "$TEST_ROOT/repo/scripts/memory-search.py"
  cp "$REAL_REPO/scripts/memory-search.sh" "$TEST_ROOT/repo/scripts/memory-search.sh"
  cat > "$TEST_ROOT/repo/context/MEMORY.md" <<'EOF'
# Working Memory

## Active Threads
- Coast HubSpot ops package needs a memory-safe recall path.
EOF
  cat > "$TEST_ROOT/repo/context/memory/2026-06-25.md" <<'EOF'
# 2026-06-25

## Session 1

### Decisions
- Milvus errors in Codex are sandbox issues, not missing memory.
EOF
  cat > "$TEST_ROOT/repo/context/learnings.md" <<'EOF'
# Learnings Journal

## memory-recall
- Use markdown fallback when semantic search cannot start.
EOF
}

test_markdown_search_returns_ranked_json() {
  make_fake_repo
  (
    cd "$TEST_ROOT/repo"
    bash scripts/memory-search.sh "Coast HubSpot memory recall" 3 > "$TEST_ROOT/out.json"
  )

  python3 - "$TEST_ROOT/out.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data, "expected at least one result"
assert data[0]["source"].endswith("context/MEMORY.md"), data[0]
assert data[0]["search_mode"] == "markdown_fallback", data[0]
assert data[0]["start_line"] >= 1, data[0]
PY
  ok "markdown fallback returns ranked JSON with source lines"
}

test_no_match_returns_empty_array() {
  make_fake_repo
  (
    cd "$TEST_ROOT/repo"
    bash scripts/memory-search.sh "zzzz-no-match-token" 3 > "$TEST_ROOT/empty.json"
  )

  python3 - "$TEST_ROOT/empty.json" <<'PY'
import json, sys
assert json.load(open(sys.argv[1])) == []
PY
  ok "markdown fallback returns an empty array for no matches"
}

test_specific_terms_outrank_broad_context() {
  make_fake_repo
  cat > "$TEST_ROOT/repo/context/learnings.md" <<'EOF'
# Learnings Journal

## Coast
- Coast HubSpot project context appears in many broad workspace summaries. Coast HubSpot project context appears in many broad workspace summaries.

## memory-recall
- Semantic-only recall can be too broad even after escalation. Use hybrid recall so specific terms like attachments, duplicate, preservation, and Make.com outrank generic Coast HubSpot context.
EOF
  cat > "$TEST_ROOT/repo/.memsearch/memory/2026-06-25.md" <<'EOF'
# Auto Memory

## 15:24
- Coast HubSpot document attachments require full thread duplicate attachment preservation through Make.com. Preserve `hs_attachment_ids` and classify duplicate documents before workflow actions.
EOF

  (
    cd "$TEST_ROOT/repo"
    bash scripts/memory-search.sh "Coast HubSpot document attachments Make.com full thread duplicate attachment preservation" 3 > "$TEST_ROOT/specific.json"
  )

  python3 - "$TEST_ROOT/specific.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data, "expected specific result"
top = data[0]
assert top["source"].endswith(".memsearch/memory/2026-06-25.md"), top
assert "attachment" in top["content"].lower(), top
PY
  ok "specific attachment memory outranks broad and meta context"
}

info "Running memory search tests..."
test_markdown_search_returns_ranked_json
test_no_match_returns_empty_array
test_specific_terms_outrank_broad_context
ok "memory search tests passed"
