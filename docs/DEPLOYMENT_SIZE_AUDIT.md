# AXIOM Protocol Deployment Size Audit

**Version:** 1.1
**Date:** February 2, 2026
**Phase:** 0 - Stabilization
**Status:** VERIFIED ON-CHAIN

---

## Purpose

This document audits contract deployment sizes with actual on-chain measurements to identify contracts that may need modularization before L3 migration. The EVM has a contract size limit of 24,576 bytes (24 KB) per EIP-170.

---

## Size Limit Reference

| Threshold | Status | Action Required |
|-----------|--------|-----------------|
| < 16 KB | Safe | No action needed |
| 16-20 KB | Warning | Consider optimization |
| 20-24 KB | Critical | Plan modularization |
| > 24 KB | Cannot Deploy | Must split contract |

---

## Verified Contract Sizes (On-Chain Measurement)

### Core Governance Contracts

| Contract | Address | Size (bytes) | Size (KB) | Status |
|----------|---------|--------------|-----------|--------|
| GovernanceHub | `0x52Dc...530E` | 9,134 | 8.92 KB | **Safe** |
| AxiomTimelockController | `0xf1B1...Ed899` | 7,164 | 7.00 KB | **Safe** |
| AxiomGovernanceConfig | `0xa645...b2CC` | 4,430 | 4.33 KB | **Safe** |
| ProductRegistry | `0x31AD...0e5d` | 4,180 | 4.08 KB | **Safe** |
| RiskConfig | `0xD9a5...9078` | 4,876 | 4.76 KB | **Safe** |
| DSCRRiskConfig | `0xd9d5...2B26` | 5,227 | 5.10 KB | **Safe** |

### Token Contracts

| Contract | Address | Size (bytes) | Size (KB) | Status |
|----------|---------|--------------|-----------|--------|
| AxiomV2 (AXM) | `0x864F...39D` | 17,282 | 16.88 KB | **Warning** |
| AXUSD Token | `0x7358...b89C` | 6,456 | 6.30 KB | **Safe** |

### Lending Contracts

| Contract | Address | Size (bytes) | Size (KB) | Status |
|----------|---------|--------------|-----------|--------|
| DSCRLoanManager | `0x1051...8E16` | 16,189 | 15.81 KB | **Safe** |
| FixFlipManager | `0xD6eb...8958` | 11,377 | 11.11 KB | **Safe** |
| DSCRPoolVault V2 | `0x5a09...4A7d` | 8,987 | 8.78 KB | **Safe** |

### Treasury & Identity Contracts

| Contract | Address | Size (bytes) | Size (KB) | Status |
|----------|---------|--------------|-----------|--------|
| AxiomTreasuryAndRevenueHub | `0x3fD6...A929` | 6,328 | 6.18 KB | **Safe** |
| AxiomStakingAndEmissionsHub | `0x8b99...B885` | 6,202 | 6.06 KB | **Safe** |
| AxiomIdentityComplianceHub | `0xf88b...B3ED` | 2,943 | 2.87 KB | **Safe** |
| CitizenCredentialRegistry | `0x8EF8...C344` | 9,187 | 8.97 KB | **Safe** |

### Real Estate Contracts

| Contract | Address | Size (bytes) | Size (KB) | Status |
|----------|---------|--------------|-----------|--------|
| AxiomLandAndAssetRegistry | `0xaB15...6591` | 3,637 | 3.55 KB | **Safe** |
| LeaseAndRentEngine | `0x26a2...5297` | 12,028 | 11.75 KB | **Safe** |
| RealtorModule | `0x579E...0412` | 12,804 | 12.50 KB | **Safe** |
| CapitalPoolsAndFunds | `0xFcCd...a701` | 10,938 | 10.68 KB | **Safe** |

### DePIN Contracts

| Contract | Address | Size (bytes) | Size (KB) | Status |
|----------|---------|--------------|-----------|--------|
| DePINNodeSuite | `0x16dC...0F1` | 11,818 | 11.54 KB | **Safe** |
| DePINNodeSales | `0x8769...Edbd` | 13,929 | 13.60 KB | **Safe** |

### DEX V2 Contracts (Proxy Indicators)

| Contract | Address | Size (bytes) | Size (KB) | Notes |
|----------|---------|--------------|-----------|-------|
| ExchangeHubV2 | `0x31eF...cd28` | 170 | 0.17 KB | **Proxy** |
| OracleAdapter | `0xe007...35c7` | 170 | 0.17 KB | **Proxy** |
| LPStaking | `0x0666...00a5` | 170 | 0.17 KB | **Proxy** |
| FeeDistributor | `0xD981...5ae8` | 170 | 0.17 KB | **Proxy** |
| TradingRewards | `0xb75b...5984` | 170 | 0.17 KB | **Proxy** |

---

## Analysis Summary

### Contracts by Status

| Status | Count | Percentage |
|--------|-------|------------|
| Safe (< 16 KB) | 14 | 74% |
| Warning (16-20 KB) | 1 | 5% |
| Critical (20-24 KB) | 0 | 0% |
| Proxy (< 1 KB) | 5 | 21% |
| Cannot Deploy (> 24 KB) | 0 | 0% |

### Key Findings

1. **All contracts are well under the 24 KB limit** - No immediate modularization required
2. **AxiomV2 (AXM) at 16.88 KB** - Only contract in warning zone, but still has 7+ KB headroom
3. **5 DEX V2 contracts are proxies** (170 bytes) - Implementation contracts are separate
4. **GovernanceHub is 8.92 KB** - Much smaller than estimated, no split needed

---

## Contracts Approaching Warning Zone

### AxiomV2 (AXM Token) - 16.88 KB

**Current headroom:** 7.12 KB (29%)

**If future features needed:**
- Extract fee calculation logic to library
- Move compliance checks to external contract
- Use custom errors instead of string reverts

**Recommendation:** Monitor during upgrades, no immediate action needed.

---

## Proxy Contract Analysis

The following contracts are proxies (170 bytes indicates minimal proxy pattern):

| Contract | Likely Pattern | Implementation Status |
|----------|---------------|----------------------|
| ExchangeHubV2 | Transparent Proxy | Implementation verified separately |
| OracleAdapter | Minimal Proxy | Points to Chainlink integration |
| LPStaking | Transparent Proxy | Staking implementation |
| FeeDistributor | Transparent Proxy | Distribution logic |
| TradingRewards | Transparent Proxy | Rewards logic |

**Note:** Proxy contracts delegate to implementation contracts which hold the actual logic. Implementation contract sizes should be checked if upgrades are planned.

---

## Verification Commands

```bash
# Check contract size (using curl)
addr="0x52Dc85fd653a75323b5307f4D2629ab9A070530E"
hex=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["'"$addr"'", "latest"],"id":1}' \
  https://arb1.arbitrum.io/rpc | jq -r '.result')
len=$((${#hex} - 2))
bytes=$((len / 2))
echo "$addr: $bytes bytes"

# Check multiple contracts
for addr in "0x52Dc..." "0x31AD..."; do
  # ... (same logic)
done
```

---

## Recommendations

### No Immediate Action Required

All contracts are within safe deployment limits. The original estimates were overly conservative.

### Future Planning

1. **Monitor AXM token** during any upgrade that adds features
2. **Document proxy implementation sizes** when planning DEX V2 upgrades
3. **Continue using proxy patterns** for new complex contracts

### L3 Migration

Contract sizes are not a blocker for L3 migration. All contracts can be deployed as-is on Universe Blockchain.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial estimates |
| 1.1 | 2026-02-02 | AXIOM Team | Updated with verified on-chain measurements |
