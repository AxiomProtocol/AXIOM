#!/bin/bash

set -e

echo "============================================"
echo "Axiom Protocol - GitHub Push Script"
echo "============================================"

REMOTE_NAME="main-repo"
REMOTE_URL="https://github.com/AxiomProtocol/AXIOM.git"
BRANCH="main"

echo ""
echo "[1/6] Checking git configuration..."
if ! git remote | grep -q "$REMOTE_NAME"; then
  echo "  Adding remote: $REMOTE_NAME -> $REMOTE_URL"
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
else
  echo "  Remote '$REMOTE_NAME' already exists"
fi

echo ""
echo "[2/6] Checking for uncommitted changes..."
if [ -n "$(git status --porcelain)" ]; then
  echo "  Found uncommitted changes. Staging all files..."
  git add -A
  
  echo ""
  read -p "  Enter commit message (or press Enter for default): " COMMIT_MSG
  if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
  fi
  
  git commit -m "$COMMIT_MSG"
  echo "  Changes committed: $COMMIT_MSG"
else
  echo "  No uncommitted changes"
fi

echo ""
echo "[3/6] Fetching from remote..."
git fetch "$REMOTE_NAME" "$BRANCH" 2>/dev/null || echo "  Could not fetch (new repo or no access)"

echo ""
echo "[4/6] Current branch status..."
CURRENT_BRANCH=$(git branch --show-current)
echo "  Current branch: $CURRENT_BRANCH"
COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
echo "  Total commits: $COMMIT_COUNT"

echo ""
echo "[5/6] Files to be pushed..."
echo "  Calculating repository size..."
REPO_SIZE=$(du -sh . --exclude=.git --exclude=node_modules --exclude=.next 2>/dev/null | cut -f1)
echo "  Repository size (excluding node_modules/.next): $REPO_SIZE"

echo ""
echo "[6/6] Pushing to GitHub..."
echo "  Pushing to $REMOTE_NAME/$BRANCH..."

git push "$REMOTE_NAME" "$CURRENT_BRANCH:$BRANCH" --force

echo ""
echo "============================================"
echo "Push completed successfully!"
echo "============================================"
echo ""
echo "Repository: $REMOTE_URL"
echo "Branch: $BRANCH"
echo ""
