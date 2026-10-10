#!/bin/bash
# @description Safely switch to a branch and delete the previous one (local & remote)

# Git switch and clean: Safely switch to a branch and delete the old one
# Usage: switch-clean <target-branch>

set -e

# Get target branch from argument
TARGET_BRANCH="$1"

if [ -z "$TARGET_BRANCH" ]; then
  echo "Error: Target branch is required"
  echo "Usage: switch-clean <target-branch>"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "Error: Not on a branch (detached HEAD)"
  exit 1
fi

# Check if already on target branch
if [ "$CURRENT_BRANCH" = "$TARGET_BRANCH" ]; then
  echo "Error: Already on branch '$TARGET_BRANCH'"
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "Error: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Check if current branch has unpushed commits
UNPUSHED=$(git log @{u}.. --oneline 2>/dev/null || echo "")
if [ -n "$UNPUSHED" ]; then
  echo "Error: Current branch '$CURRENT_BRANCH' has unpushed commits:"
  echo "$UNPUSHED"
  exit 1
fi

# Fetch target branch from origin
echo "Fetching $TARGET_BRANCH from origin..."
git fetch origin "$TARGET_BRANCH:$TARGET_BRANCH" 2>/dev/null || {
  echo "Error: Failed to fetch branch '$TARGET_BRANCH' from origin"
  exit 1
}

# Checkout to target branch
echo "Switching to $TARGET_BRANCH..."
git checkout "$TARGET_BRANCH"

# Delete local branch
echo "Deleting local branch $CURRENT_BRANCH..."
git branch -d "$CURRENT_BRANCH"

# Delete remote branch if it exists
if git ls-remote --exit-code --heads origin "$CURRENT_BRANCH" > /dev/null 2>&1; then
  echo "Deleting remote branch $CURRENT_BRANCH..."
  git push origin --delete "$CURRENT_BRANCH"
  echo "✓ Switched to '$TARGET_BRANCH' and deleted '$CURRENT_BRANCH' (local & remote)"
else
  echo "✓ Switched to '$TARGET_BRANCH' and deleted '$CURRENT_BRANCH' (local only)"
fi
