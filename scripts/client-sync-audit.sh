#!/usr/bin/env bash
# Read-only audit for root-shared skill drift across client folders.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENTS_DIR="$ROOT/clients"
STRICT=0

if [[ "${1:-}" == "--strict" ]]; then
  STRICT=1
fi

warn_count=0

warn() {
  warn_count=$((warn_count + 1))
  printf 'WARN: %s\n' "$1"
}

info() {
  printf '%s\n' "$1"
}

rel_files() {
  local dir="$1"
  (
    cd "$dir"
    find . -type f \
      ! -name 'SKILL.local.md' \
      ! -name '*.local.md' \
      ! -path './local/*' \
      ! -path './.local/*' \
      ! -path '*/.venv/*' \
      ! -path '*/__pycache__/*' \
      ! -path '*/node_modules/*' \
      ! -path '*/.git/*' \
      -print | sed 's#^\./##' | sort
  )
}

compare_skill() {
  local src="$1"
  local dest="$2"
  local label="$3"
  local rel
  local src_list
  local dest_list

  if [[ ! -d "$dest" ]]; then
    warn "$label missing shared skill copy"
    return
  fi

  src_list="$(mktemp "${TMPDIR:-/tmp}/aios-src-skill.XXXXXX")"
  dest_list="$(mktemp "${TMPDIR:-/tmp}/aios-dest-skill.XXXXXX")"
  rel_files "$src" > "$src_list"
  rel_files "$dest" > "$dest_list"

  while IFS= read -r rel; do
    [[ -n "$rel" ]] || continue
    warn "$label missing $rel"
  done < <(comm -23 "$src_list" "$dest_list")

  while IFS= read -r rel; do
    [[ -n "$rel" ]] || continue
    warn "$label has non-local extra file $rel"
  done < <(comm -13 "$src_list" "$dest_list")

  while IFS= read -r rel; do
    [[ -n "$rel" ]] || continue
    if ! cmp -s "$src/$rel" "$dest/$rel"; then
      warn "$label differs at $rel"
    fi
  done < <(comm -12 "$src_list" "$dest_list")

  rm -f "$src_list" "$dest_list"
}

if [[ ! -d "$CLIENTS_DIR" ]]; then
  info "No clients directory found."
  exit 0
fi

info "AI-OS client sync audit"
info "Root: $ROOT"
info ""

shopt -s nullglob
for client_dir in "$CLIENTS_DIR"/*/; do
  [[ -d "$client_dir" ]] || continue
  client="$(basename "$client_dir")"
  info "Client: $client"

  client_only=0
  for client_skill in "$client_dir"/.claude/skills/*/; do
    [[ -d "$client_skill" ]] || continue
    skill="$(basename "$client_skill")"
    [[ "$skill" == "_catalog" || "$skill" == "_archived" ]] && continue
    if [[ ! -d "$ROOT/.claude/skills/$skill" ]]; then
      client_only=$((client_only + 1))
      info "  client-only skill: $skill"
    fi
  done

  for root_skill in "$ROOT"/.claude/skills/*/; do
    [[ -d "$root_skill" ]] || continue
    skill="$(basename "$root_skill")"
    [[ "$skill" == "_catalog" || "$skill" == "_archived" ]] && continue
    compare_skill "$root_skill" "$client_dir/.claude/skills/$skill" "  $client/$skill"
  done

  while IFS= read -r local_file; do
    [[ -n "$local_file" ]] || continue
    info "  local override: ${local_file#"$client_dir/"}"
  done < <(find "$client_dir/.claude/skills" -path '*/SKILL.local.md' -type f 2>/dev/null | sort)

  if [[ "$client_only" -eq 0 ]]; then
    info "  client-only skill: none"
  fi
  info ""
done
shopt -u nullglob

if [[ "$warn_count" -eq 0 ]]; then
  info "OK: no shared skill drift detected."
else
  info "Summary: $warn_count sync issue(s) detected."
fi

if [[ "$STRICT" -eq 1 && "$warn_count" -gt 0 ]]; then
  exit 1
fi
