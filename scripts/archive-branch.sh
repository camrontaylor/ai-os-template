#!/usr/bin/env bash
# archive-branch.sh - never delete a branch, archive it as an annotated git tag.
#
# Usage:
#   bash scripts/archive-branch.sh <branch-name> [<reason>]
#
# Effect:
#   - Creates an annotated tag `archive/<branch>-<YYYY-MM-DD>` pointing at the
#     branch tip, with the reason in the tag message.
#   - Pushes the tag to origin (cloud-backed in the same repo as main).
#   - Deletes the local branch (the tag preserves every commit).
#   - Prints how to inspect or restore it later.
#
# To inspect:    git checkout archive/<branch>-<date>
# To list all:   git tag -l 'archive/*'
# To restore:    git checkout -b <branch> archive/<branch>-<date>
#
# This is the "never delete" strategy for AI-OS: dropped work moves to a tag,
# never to /dev/null. Tags push with main, so the cloud holds them forever.

set -euo pipefail

BRANCH="${1:-}"
REASON="${2:-archived without an explicit reason}"

if [[ -z "$BRANCH" ]]; then
  echo "usage: bash scripts/archive-branch.sh <branch-name> [<reason>]" >&2
  exit 2
fi

if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "branch not found: $BRANCH" >&2
  exit 1
fi

DATE=$(date +%Y-%m-%d)
TAG="archive/${BRANCH}-${DATE}"

if git rev-parse --verify "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "tag already exists: $TAG (refusing to overwrite)" >&2
  exit 1
fi

git tag -a "$TAG" "$BRANCH" -m "Archived branch: $BRANCH

Reason: $REASON
Archived on: $DATE

Restore with: git checkout -b $BRANCH $TAG"

git push origin "$TAG"

# Only delete the local branch after the tag is on origin
git branch -D "$BRANCH"

echo ""
echo "Archived $BRANCH as $TAG"
echo "Pushed to origin (cloud-backed)."
echo ""
echo "Inspect: git checkout $TAG"
echo "Restore: git checkout -b $BRANCH $TAG"
echo "List archives: git tag -l 'archive/*'"
