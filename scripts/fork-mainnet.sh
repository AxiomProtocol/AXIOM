#!/bin/bash
# AXIOM Protocol - Mainnet Fork Script
# Purpose: Create a local fork of Arbitrum One for safe experimentation
# Phase: 0 - Stabilization

set -e

echo "=========================================="
echo "AXIOM Protocol - Mainnet Fork Environment"
echo "=========================================="

# Configuration
ARBITRUM_RPC="${ARBITRUM_RPC:-https://arb1.arbitrum.io/rpc}"
FORK_BLOCK="${FORK_BLOCK:-latest}"
FORK_PORT="${FORK_PORT:-8545}"

# Key contract addresses for verification
GOVERNANCE_HUB="0x52Dc85fd653a75323b5307f4D2629ab9A070530E"
PRODUCT_REGISTRY="0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d"
AXM_TOKEN="0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
AXUSD_TOKEN="0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C"

echo ""
echo "Configuration:"
echo "  RPC URL: $ARBITRUM_RPC"
echo "  Fork Block: $FORK_BLOCK"
echo "  Local Port: $FORK_PORT"
echo ""

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq not found. Please install jq for JSON parsing."
    echo "  On Replit: Use packager_tool to install jq"
    echo "  On Ubuntu: sudo apt install jq"
    echo "  On macOS: brew install jq"
    exit 1
fi

# Check if hardhat is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js and npm."
    exit 1
fi

# Check if hardhat.config exists
if [ ! -f "hardhat.config.ts" ] && [ ! -f "hardhat.config.js" ]; then
    echo "Warning: No hardhat config found. Creating minimal config..."
    cat > hardhat.config.fork.ts << 'EOF'
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
        blockNumber: process.env.FORK_BLOCK ? parseInt(process.env.FORK_BLOCK) : undefined,
      },
      chainId: 42161,
    },
  },
};

export default config;
EOF
    echo "Created hardhat.config.fork.ts"
fi

echo "Starting Hardhat fork node..."
echo ""

# Use fork config if it exists
if [ -f "hardhat.config.fork.ts" ]; then
    export HARDHAT_CONFIG="hardhat.config.fork.ts"
    echo "Using fork config: hardhat.config.fork.ts"
fi

# Start the fork
ARBITRUM_RPC="$ARBITRUM_RPC" npx hardhat node \
    --fork "$ARBITRUM_RPC" \
    --port "$FORK_PORT" \
    --hostname "0.0.0.0" &

FORK_PID=$!

# Wait for node to start
echo "Waiting for fork node to start..."
sleep 5

# Verify connection
echo ""
echo "Verifying fork connection..."

# Check block number
BLOCK_NUM=$(curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:$FORK_PORT | jq -r '.result')

echo "Current block: $BLOCK_NUM"

# Verify key contracts exist
echo ""
echo "Verifying key contracts..."

verify_contract() {
    local name=$1
    local address=$2
    local code=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$address\", \"latest\"],\"id\":1}" \
        http://localhost:$FORK_PORT | jq -r '.result')
    
    if [ "$code" != "0x" ] && [ -n "$code" ]; then
        echo "  ✓ $name: $address"
    else
        echo "  ✗ $name: $address (no code found)"
    fi
}

verify_contract "GovernanceHub" "$GOVERNANCE_HUB"
verify_contract "ProductRegistry" "$PRODUCT_REGISTRY"
verify_contract "AXM Token" "$AXM_TOKEN"
verify_contract "AXUSD Token" "$AXUSD_TOKEN"

echo ""
echo "=========================================="
echo "Fork node running on http://localhost:$FORK_PORT"
echo "Chain ID: 42161 (Arbitrum One)"
echo "Process ID: $FORK_PID"
echo ""
echo "To stop: kill $FORK_PID"
echo "=========================================="

# Keep script running
wait $FORK_PID
