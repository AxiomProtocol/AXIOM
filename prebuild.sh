#!/bin/bash

set -e

echo "============================================"
echo "Axiom Protocol - Production Prebuild Script"
echo "============================================"

START_TIME=$(date +%s)

echo ""
echo "[1/5] Cleaning previous build artifacts..."
rm -rf .next/cache 2>/dev/null || true
rm -rf .next/standalone 2>/dev/null || true

echo ""
echo "[2/5] Running Next.js production build..."
NODE_ENV=production NODE_OPTIONS='--max-old-space-size=4096' npx next build

echo ""
echo "[3/5] Copying static files to standalone..."
if [ -d ".next/static" ]; then
  cp -r .next/static .next/standalone/.next/static
  echo "  - Copied .next/static"
fi

if [ -d "public" ]; then
  cp -r public .next/standalone/public
  echo "  - Copied public directory"
fi

echo ""
echo "[4/5] Verifying build output..."
if [ -f ".next/standalone/server.js" ]; then
  echo "  - server.js exists"
else
  echo "  ERROR: server.js not found!"
  exit 1
fi

if [ -d ".next/standalone/.next/static" ]; then
  echo "  - Static files copied successfully"
else
  echo "  WARNING: Static files may not be copied correctly"
fi

BUILD_SIZE=$(du -sh .next/standalone 2>/dev/null | cut -f1)
echo "  - Standalone build size: $BUILD_SIZE"

echo ""
echo "[5/5] Creating build manifest..."
cat > .next/BUILD_MANIFEST.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node -v)",
  "prebuildComplete": true
}
EOF
echo "  - Build manifest created"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "============================================"
echo "Prebuild completed in ${DURATION}s"
echo "============================================"
echo ""
echo "To deploy, run: npm start"
echo "Or configure deployment with:"
echo "  run: [\"npm\", \"start\"]"
echo "  (no build step needed - already prebuilt)"
echo ""
