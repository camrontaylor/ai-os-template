#!/usr/bin/env bash
# worktree-list.sh - show every AI-OS worktree (each an isolated session folder
# that shares one brain). Read-only.
set -uo pipefail
ROOT="$(cd "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/.." 2>/dev/null && pwd)"
[[ -z "${ROOT:-}" ]] && { echo "not inside a git repo." >&2; exit 1; }
echo "AI-OS worktrees (the first is your primary/home checkout):"
git -C "$ROOT" worktree list
