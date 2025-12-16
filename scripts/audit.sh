#!/bin/bash
#
# Axiom Protocol - Onchain Verification Script
# Verifies deployed contracts on Arbitrum One match expected configuration
#
# Usage: ./scripts/audit.sh
#
# Requirements:
# - curl
# - jq (optional, for JSON parsing)
# - cast (from Foundry, optional for advanced checks)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Network configuration
RPC_URL="https://arb1.arbitrum.io/rpc"
EXPLORER_API="https://arbitrum.blockscout.com/api"
CHAIN_ID=42161

# Key addresses
TREASURY_VAULT="0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d"
DEPLOYER="0xDFf9e47eb007bF02e47477d577De9ffA99791528"

# Contract addresses
declare -A CONTRACTS=(
    ["AxiomV2"]="0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
    ["AxiomIdentityComplianceHub"]="0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED"
    ["AxiomTreasuryAndRevenueHub"]="0x3fD63728288546AC41dAe3bf25ca383061c3A929"
    ["AxiomStakingAndEmissionsHub"]="0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885"
    ["CitizenCredentialRegistry"]="0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344"
    ["AxiomLandAndAssetRegistry"]="0xaB15907b124620E165aB6E464eE45b178d8a6591"
    ["LeaseAndRentEngine"]="0x26a20dEa57F951571AD6e518DFb3dC60634D5297"
    ["RealtorModule"]="0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412"
    ["CapitalPoolsAndFunds"]="0xFcCdC1E353b24936f9A8D08D21aF684c620fa701"
    ["UtilityAndMeteringHub"]="0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d"
    ["TransportAndLogisticsHub"]="0x959c5dd99B170e2b14B1F9b5a228f323946F514e"
    ["DePINNodeSuite"]="0x16dC3884d88b767D99E0701Ba026a1ed39a250F1"
    ["DePINNodeSales"]="0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd"
    ["CrossChainAndLaunchModule"]="0x28623Ee5806ab9609483F4B68cb1AE212A092e4d"
    ["AxiomExchangeHub"]="0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D"
    ["CitizenReputationOracle"]="0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643"
    ["IoTOracleNetwork"]="0xe38B3443E17A07993d10F7841D5568a27A73ec1a"
    ["MarketsAndListingsHub"]="0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830"
    ["OracleAndMetricsRelay"]="0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6"
    ["CommunitySocialHub"]="0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49"
    ["AxiomAcademyHub"]="0x30667931BEe54a58B76D387D086A975aB37206F4"
    ["GamificationHub"]="0x7F455b4614E05820AAD52067Ef223f30b1936f93"
    ["SustainabilityHub"]="0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046"
    ["AxiomSusuHub"]="0x6C69D730327930B49A7997B7b5fb0865F30c95A5"
)

# Role hashes (keccak256)
DEFAULT_ADMIN_ROLE="0x0000000000000000000000000000000000000000000000000000000000000000"
PAUSER_ROLE="0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a"
MINTER_ROLE="0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"
ADMIN_ROLE="0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"

echo ""
echo "========================================"
echo "  AXIOM PROTOCOL SECURITY AUDIT SCRIPT"
echo "========================================"
echo ""
echo "Network: Arbitrum One (Chain ID: $CHAIN_ID)"
echo "RPC: $RPC_URL"
echo "Explorer: $EXPLORER_API"
echo ""
echo "Treasury Vault: $TREASURY_VAULT"
echo "Deployer: $DEPLOYER"
echo ""

# Check for required tools
check_requirements() {
    echo -e "${BLUE}[1/6] Checking requirements...${NC}"
    
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}Error: curl is required but not installed${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} curl available"
    
    if command -v jq &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} jq available (optional)"
        HAS_JQ=true
    else
        echo -e "  ${YELLOW}⚠${NC} jq not available (some features limited)"
        HAS_JQ=false
    fi
    
    if command -v cast &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} cast available (Foundry)"
        HAS_CAST=true
    else
        echo -e "  ${YELLOW}⚠${NC} cast not available (advanced checks skipped)"
        HAS_CAST=false
    fi
    
    echo ""
}

# Verify contract is deployed and has code
verify_contract_deployed() {
    local name=$1
    local address=$2
    
    local result=$(curl -s -X POST "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$address\",\"latest\"],\"id\":1}")
    
    local code=$(echo "$result" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$code" = "0x" ] || [ -z "$code" ]; then
        echo -e "  ${RED}✗${NC} $name ($address) - NO CODE DEPLOYED"
        return 1
    else
        local code_size=$((${#code} / 2 - 1))
        echo -e "  ${GREEN}✓${NC} $name - Code size: $code_size bytes"
        return 0
    fi
}

# Check contract verification status on Blockscout
check_verification_status() {
    local name=$1
    local address=$2
    
    local result=$(curl -s "$EXPLORER_API?module=contract&action=getsourcecode&address=$address")
    
    if echo "$result" | grep -q '"SourceCode":"[^"]'; then
        echo -e "  ${GREEN}✓${NC} $name - Verified on Blockscout"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC} $name - Not verified or verification status unknown"
        return 1
    fi
}

# Check if address has a specific role (requires cast)
check_role() {
    local contract=$1
    local role_hash=$2
    local account=$3
    local role_name=$4
    
    if [ "$HAS_CAST" = true ]; then
        local result=$(cast call "$contract" "hasRole(bytes32,address)(bool)" "$role_hash" "$account" --rpc-url "$RPC_URL" 2>/dev/null)
        
        if [ "$result" = "true" ]; then
            echo -e "  ${GREEN}✓${NC} $role_name: $account"
        else
            echo -e "  ${YELLOW}⚠${NC} $role_name: $account - NOT assigned"
        fi
    fi
}

# Check paused status (requires cast)
check_paused() {
    local name=$1
    local address=$2
    
    if [ "$HAS_CAST" = true ]; then
        local result=$(cast call "$address" "paused()(bool)" --rpc-url "$RPC_URL" 2>/dev/null)
        
        if [ "$result" = "true" ]; then
            echo -e "  ${RED}⚠${NC} $name is PAUSED"
        else
            echo -e "  ${GREEN}✓${NC} $name is NOT paused"
        fi
    fi
}

# Check AXM token details (requires cast)
check_axm_token() {
    local address="${CONTRACTS["AxiomV2"]}"
    
    echo -e "${BLUE}[5/6] Checking AXM Token Details...${NC}"
    
    if [ "$HAS_CAST" = true ]; then
        local name=$(cast call "$address" "name()(string)" --rpc-url "$RPC_URL" 2>/dev/null)
        local symbol=$(cast call "$address" "symbol()(string)" --rpc-url "$RPC_URL" 2>/dev/null)
        local decimals=$(cast call "$address" "decimals()(uint8)" --rpc-url "$RPC_URL" 2>/dev/null)
        local totalSupply=$(cast call "$address" "totalSupply()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null)
        local maxSupply=$(cast call "$address" "MAX_SUPPLY()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null)
        local paused=$(cast call "$address" "paused()(bool)" --rpc-url "$RPC_URL" 2>/dev/null)
        
        echo "  Token Name: $name"
        echo "  Symbol: $symbol"
        echo "  Decimals: $decimals"
        echo "  Total Supply: $totalSupply"
        echo "  Max Supply: $maxSupply"
        echo "  Paused: $paused"
        
        # Check treasury vault
        local treasury=$(cast call "$address" "treasuryVault()(address)" --rpc-url "$RPC_URL" 2>/dev/null)
        echo "  Treasury Vault: $treasury"
        
        if [ "$treasury" = "$TREASURY_VAULT" ]; then
            echo -e "  ${GREEN}✓${NC} Treasury vault matches expected address"
        else
            echo -e "  ${RED}✗${NC} Treasury vault MISMATCH!"
        fi
    else
        echo "  Skipped (cast not available)"
    fi
    echo ""
}

# Check role assignments for key contracts
check_roles() {
    echo -e "${BLUE}[6/6] Checking Role Assignments...${NC}"
    
    if [ "$HAS_CAST" = true ]; then
        echo ""
        echo "AxiomV2 (AXM Token):"
        check_role "${CONTRACTS["AxiomV2"]}" "$DEFAULT_ADMIN_ROLE" "$TREASURY_VAULT" "DEFAULT_ADMIN_ROLE"
        check_role "${CONTRACTS["AxiomV2"]}" "$PAUSER_ROLE" "$TREASURY_VAULT" "PAUSER_ROLE"
        check_role "${CONTRACTS["AxiomV2"]}" "$MINTER_ROLE" "$TREASURY_VAULT" "MINTER_ROLE"
        
        echo ""
        echo "DePINNodeSales:"
        check_role "${CONTRACTS["DePINNodeSales"]}" "$DEFAULT_ADMIN_ROLE" "$TREASURY_VAULT" "DEFAULT_ADMIN_ROLE"
        check_role "${CONTRACTS["DePINNodeSales"]}" "$ADMIN_ROLE" "$TREASURY_VAULT" "ADMIN_ROLE"
        
        echo ""
        echo "AxiomSusuHub:"
        check_role "${CONTRACTS["AxiomSusuHub"]}" "$DEFAULT_ADMIN_ROLE" "$DEPLOYER" "DEFAULT_ADMIN_ROLE"
        check_role "${CONTRACTS["AxiomSusuHub"]}" "$ADMIN_ROLE" "$DEPLOYER" "ADMIN_ROLE"
    else
        echo "  Skipped (cast not available)"
    fi
    echo ""
}

# Main execution
main() {
    check_requirements
    
    echo -e "${BLUE}[2/6] Verifying contract deployment...${NC}"
    deployed_count=0
    total_count=${#CONTRACTS[@]}
    
    for name in "${!CONTRACTS[@]}"; do
        if verify_contract_deployed "$name" "${CONTRACTS[$name]}"; then
            ((deployed_count++))
        fi
    done
    echo ""
    echo "Deployed: $deployed_count / $total_count contracts"
    echo ""
    
    echo -e "${BLUE}[3/6] Checking verification status...${NC}"
    verified_count=0
    
    for name in "${!CONTRACTS[@]}"; do
        if check_verification_status "$name" "${CONTRACTS[$name]}"; then
            ((verified_count++))
        fi
    done 2>/dev/null
    echo ""
    echo "Verified: $verified_count / $total_count contracts"
    echo ""
    
    echo -e "${BLUE}[4/6] Checking pause status...${NC}"
    if [ "$HAS_CAST" = true ]; then
        check_paused "AxiomV2" "${CONTRACTS["AxiomV2"]}"
        check_paused "DePINNodeSales" "${CONTRACTS["DePINNodeSales"]}"
        check_paused "AxiomExchangeHub" "${CONTRACTS["AxiomExchangeHub"]}"
        check_paused "AxiomSusuHub" "${CONTRACTS["AxiomSusuHub"]}"
    else
        echo "  Skipped (cast not available)"
    fi
    echo ""
    
    check_axm_token
    check_roles
    
    echo "========================================"
    echo "          AUDIT CHECKLIST"
    echo "========================================"
    echo ""
    echo "Manual Verification Required:"
    echo "[ ] Verify constructor arguments match expected values"
    echo "[ ] Check that treasury vault is a multisig (recommended)"
    echo "[ ] Review role assignments for each contract"
    echo "[ ] Test emergency pause functions work correctly"
    echo "[ ] Verify fee configurations are reasonable"
    echo "[ ] Check that all critical addresses are non-zero"
    echo "[ ] Review timelocks for admin functions (recommended)"
    echo ""
    echo "Security Issues to Verify Fixed:"
    echo "[ ] H-05: SustainabilityHub.withdraw() has access control"
    echo "[ ] H-01/H-02: Lease functions validate msg.sender"
    echo "[ ] H-03: SUSU randomness is acceptable for use case"
    echo "[ ] M-04: Fee limits are implemented in AxiomV2"
    echo ""
    echo "========================================"
    echo "        AUDIT SCRIPT COMPLETE"
    echo "========================================"
}

main
