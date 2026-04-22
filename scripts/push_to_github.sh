#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "Axiom Protocol - Push to GitHub"
echo "=========================================="
echo ""

if ! command -v git &> /dev/null; then
    echo "ERROR: git is not available"
    exit 1
fi

echo "Git is available"
echo ""

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

echo "Git status:"
git status --short
echo ""

if [ -f "package.json" ]; then
    if grep -q '"lint"' package.json; then
        echo "Running lint..."
        npm run lint || echo "Lint completed with warnings"
        echo ""
    fi
    
    if grep -q '"build"' package.json; then
        echo "Running build..."
        npm run build || { echo "Build failed"; exit 1; }
        echo ""
    fi
fi

echo "Staging all changes..."
git add -A

if git diff --cached --quiet; then
    echo "No changes to commit"
    echo ""
    echo "=========================================="
    echo "Push complete (no changes)"
    echo "=========================================="
    exit 0
fi

echo "Committing changes..."
git commit -m "Publish observation window rationale"

echo ""
echo "Pushing to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "=========================================="
echo "Push complete"
echo "=========================================="
echo ""
echo "Changes pushed to: origin/$CURRENT_BRANCH"
