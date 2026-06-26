#!/usr/bin/env bash
# Maintain client-scoped MEMORY.md files from root-owned scheduled jobs.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE=""
CLIENT=""
ALL=0
TODAY="$(date +%F)"

usage() {
  cat <<'EOF'
Usage: bash scripts/client-memory-maintenance.sh --mode distill|gaps|curate (--client slug | --all)

Keeps client memory inside clients/{slug}/context/. It never writes root context/MEMORY.md.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --mode=*)
      MODE="${1#--mode=}"
      shift
      ;;
    --client)
      CLIENT="${2:-}"
      shift 2
      ;;
    --client=*)
      CLIENT="${1#--client=}"
      shift
      ;;
    --all)
      ALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$MODE" != "distill" && "$MODE" != "gaps" && "$MODE" != "curate" ]]; then
  usage >&2
  exit 2
fi

if [[ "$ALL" -eq 0 && -z "$CLIENT" ]]; then
  usage >&2
  exit 2
fi

ensure_memory() {
  local file="$1"
  if [[ -f "$file" ]]; then
    return
  fi
  mkdir -p "$(dirname "$file")"
  cat > "$file" <<'EOF'
<!-- Cap: 2,500 chars. Client-scoped curated scratchpad. -->
# Working Memory

## Active Threads

## Environment Notes

## Pending Decisions
EOF
}

append_unique() {
  local file="$1"
  local section="$2"
  local line="$3"
  local tmp

  [[ -n "$line" ]] || return 0
  if grep -Fqx -- "$line" "$file"; then
    return 0
  fi

  tmp="$(mktemp "${TMPDIR:-/tmp}/aios-client-memory.XXXXXX")"
  awk -v section="$section" -v line="$line" '
    BEGIN { inserted = 0 }
    $0 == section {
      print
      print line
      inserted = 1
      next
    }
    { print }
    END {
      if (!inserted) {
        print ""
        print section
        print line
      }
    }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

extract_section_bullets() {
  local file="$1"
  local heading="$2"
  awk -v heading="$heading" '
    $0 == heading { in_section = 1; next }
    /^### / && in_section { in_section = 0 }
    in_section && /^- / {
      line = $0
      sub(/^- /, "", line)
      if (line != "None yet." && line != "Session in progress." && line != "None") {
        print line
      }
    }
  ' "$file"
}

distill_client() {
  local client_dir="$1"
  local slug
  local memory_file
  local session_file
  local added=0
  local line

  slug="$(basename "$client_dir")"
  memory_file="$client_dir/context/MEMORY.md"
  session_file="$client_dir/context/memory/$TODAY.md"
  ensure_memory "$memory_file"

  if [[ ! -f "$session_file" ]]; then
    printf '%s: no session today - nothing to distill.\n' "$slug"
    return 0
  fi

  while IFS= read -r line; do
    append_unique "$memory_file" "## Active Threads" "- $TODAY: $line"
    added=$((added + 1))
  done < <(extract_section_bullets "$session_file" "### Open threads")

  while IFS= read -r line; do
    append_unique "$memory_file" "## Pending Decisions" "- $TODAY: $line"
    added=$((added + 1))
  done < <(extract_section_bullets "$session_file" "### Decisions")

  printf '%s: distilled %s item(s) into %s.\n' "$slug" "$added" "${memory_file#"$ROOT/"}"
}

date_epoch() {
  local value="$1"
  if date -d "$value" +%s >/dev/null 2>&1; then
    date -d "$value" +%s
  else
    date -j -f "%Y-%m-%d" "$value" +%s 2>/dev/null || printf '0\n'
  fi
}

gaps_client() {
  local client_dir="$1"
  local slug
  local memory_dir
  local report
  local dates=()
  local gaps=()
  local prev
  local curr
  local diff_days

  slug="$(basename "$client_dir")"
  memory_dir="$client_dir/context/memory"
  report="$memory_dir/${TODAY}_gap-analysis.md"
  mkdir -p "$memory_dir"

  while IFS= read -r date_value; do
    dates+=("$date_value")
  done < <(find "$memory_dir" -maxdepth 1 -type f -name '????-??-??.md' -print 2>/dev/null | sed 's#.*/##; s#\.md$##' | sort)

  for ((i = 1; i < ${#dates[@]}; i += 1)); do
    prev="${dates[$((i - 1))]}"
    curr="${dates[$i]}"
    diff_days=$(( ($(date_epoch "$curr") - $(date_epoch "$prev")) / 86400 ))
    if [[ "$diff_days" -gt 2 ]]; then
      gaps+=("$prev -> $curr ($diff_days days)")
    fi
  done

  {
    printf '# Client Memory Gap Analysis - %s\n\n' "$TODAY"
    printf 'Client: `%s`\n\n' "$slug"
    if [[ "${#dates[@]}" -eq 0 ]]; then
      printf 'Session logs: none\n\n'
    else
      printf 'Session logs: %s to %s (%s day file(s))\n\n' "${dates[0]}" "${dates[$((${#dates[@]} - 1))]}" "${#dates[@]}"
    fi
    printf '## Date Gaps (>2 days)\n\n'
    if [[ "${#gaps[@]}" -eq 0 ]]; then
      printf '%s\n' '- None detected'
    else
      printf -- '- %s\n' "${gaps[@]}"
    fi
  } > "$report"

  printf '%s: gap report saved to %s.\n' "$slug" "${report#"$ROOT/"}"
}

curate_client() {
  local client_dir="$1"
  local slug
  local memory_file
  local tmp
  local before
  local after

  slug="$(basename "$client_dir")"
  memory_file="$client_dir/context/MEMORY.md"
  ensure_memory "$memory_file"
  before="$(wc -c < "$memory_file" | tr -d ' ')"
  tmp="$(mktemp "${TMPDIR:-/tmp}/aios-client-curate.XXXXXX")"

  awk '
    /^- / && tolower($0) ~ /(done|shipped|closed|resolved)/ { removed += 1; next }
    { print }
    END { }
  ' "$memory_file" > "$tmp"
  mv "$tmp" "$memory_file"
  after="$(wc -c < "$memory_file" | tr -d ' ')"

  printf '%s: curated MEMORY.md from %s to %s chars.\n' "$slug" "$before" "$after"
}

client_dirs=()
if [[ "$ALL" -eq 1 ]]; then
  shopt -s nullglob
  for client_dir in "$ROOT"/clients/*/; do
    [[ -d "$client_dir/context" ]] && client_dirs+=("${client_dir%/}")
  done
  shopt -u nullglob
else
  client_dirs=("$ROOT/clients/$CLIENT")
fi

if [[ "${#client_dirs[@]}" -eq 0 ]]; then
  printf 'No client workspaces found.\n'
  exit 0
fi

for client_dir in "${client_dirs[@]}"; do
  if [[ ! -d "$client_dir/context" ]]; then
    printf 'Missing client context: %s\n' "${client_dir#"$ROOT/"}" >&2
    continue
  fi
  case "$MODE" in
    distill) distill_client "$client_dir" ;;
    gaps) gaps_client "$client_dir" ;;
    curate) curate_client "$client_dir" ;;
  esac
done
