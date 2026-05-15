#!/usr/bin/env bash
# =============================================================================
# build_local.sh — Compile Axiom Move package on your local machine
#
# Run this on your LOCAL machine (not in Replit).
# Requires: Sui CLI  https://docs.sui.io/guides/developer/getting-started/sui-install
#
# Output: sui/packages/axiom_claim_prototype/bytecode.json
#         (upload or commit this file, then run `npm run sui:deploy` in Replit)
#
# Usage:
#   sh sui/scripts/build_local.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/../packages/axiom_claim_prototype" && pwd)"
OUTPUT_FILE="$PACKAGE_DIR/bytecode.json"

echo ""
echo "=== Axiom Protocol — Sui Move Build ==="
echo "Package: $PACKAGE_DIR"
echo "Output:  $OUTPUT_FILE"
echo ""

# Check Sui CLI
if ! command -v sui &>/dev/null; then
  echo "ERROR: Sui CLI not found."
  echo ""
  echo "Install:"
  echo "  brew install sui            # macOS"
  echo "  cargo install --locked sui  # Rust/Linux"
  echo "  https://docs.sui.io/guides/developer/getting-started/sui-install"
  exit 1
fi

echo "Sui CLI version: $(sui --version)"
echo ""

# Run tests first
echo "Running Move tests..."
cd "$PACKAGE_DIR"
sui move test
echo ""
echo "All tests passed."
echo ""

# Build and dump bytecode
echo "Building package and dumping bytecode..."
BUILD_OUTPUT=$(sui move build --dump-bytecode-as-base64 --path "$PACKAGE_DIR" 2>/dev/null)

# Extract JSON block (CLI may emit progress lines to stdout in some versions)
JSON_BLOCK=$(echo "$BUILD_OUTPUT" | python3 -c "
import sys, json, re
raw = sys.stdin.read()
# Find the JSON object
match = re.search(r'\{[\s\S]*\}', raw)
if match:
    obj = json.loads(match.group())
    print(json.dumps(obj, indent=2))
else:
    print(raw)
" 2>/dev/null || echo "$BUILD_OUTPUT")

echo "$JSON_BLOCK" > "$OUTPUT_FILE"

# Validate output
MODULE_COUNT=$(python3 -c "import json; d=json.load(open('$OUTPUT_FILE')); print(len(d['modules']))" 2>/dev/null || echo "0")
DEP_COUNT=$(python3 -c "import json; d=json.load(open('$OUTPUT_FILE')); print(len(d['dependencies']))" 2>/dev/null || echo "0")

echo "Modules compiled:  $MODULE_COUNT"
echo "Dependencies:      $DEP_COUNT"
echo ""

if [ "$MODULE_COUNT" -eq 0 ]; then
  echo "ERROR: No modules found in build output."
  echo "Check for Move compilation errors above."
  exit 1
fi

echo "Bytecode written to:"
echo "  $OUTPUT_FILE"
echo ""
echo "Next step — deploy from Replit:"
echo "  1. Commit bytecode.json (or upload it to Replit)"
echo "  2. In Replit terminal: npm run sui:deploy"
echo ""
