#!/usr/bin/env bash
# Sync fork with upstream (fathah/hermes-desktop) and disable workflows
# Usage: ./scripts/sync-upstream.sh

set -euo pipefail

UPSTREAM="upstream"
BRANCH="main"

# Ensure upstream remote exists
if ! git remote get-url "$UPSTREAM" &>/dev/null; then
  echo "Adding upstream remote..."
  git remote add "$UPSTREAM" https://github.com/fathah/hermes-desktop.git
fi

# Fetch latest upstream
echo "Fetching upstream..."
git fetch "$UPSTREAM" --quiet

# Check for local changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: You have uncommitted changes. Commit or stash them first."
  exit 1
fi

# Count new commits
NEW_COMMITS=$(git rev-list --count "$BRANCH".."$UPSTREAM/$BRANCH")
if [ "$NEW_COMMITS" -eq 0 ]; then
  echo "Already up to date with upstream."
  exit 0
fi

echo "Merging $NEW_COMMITS new commits from upstream..."
git merge "$UPSTREAM/$BRANCH" --ff-only

# Disable upstream workflows by renaming
if [ -d ".github/workflows" ]; then
  echo "Disabling upstream workflows..."
  git mv .github/workflows .github/bck-workflows
  git commit -m "Disable upstream workflows: rename .github/workflows -> bck-workflows"
fi

echo "Pushing to origin..."
git push origin "$BRANCH"

echo "Done. Synced $NEW_COMMITS commits from upstream."
