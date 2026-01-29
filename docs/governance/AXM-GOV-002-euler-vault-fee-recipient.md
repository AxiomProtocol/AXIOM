# AXM-GOV-002: Euler Vault Fee Recipient Configuration

**Document ID:** AXM-GOV-002  
**Version:** 1.0.0  
**Created:** 2026-01-29  
**Status:** PROPOSED  
**Network:** Arbitrum One (Chain ID: 42161)

---

## Executive Summary

This governance proposal configures the fee recipient for the AXUSD Lending Vault on Euler V2 to route protocol revenue to the Axiom Revenue Router. Currently, the vault has a 10% interest fee configured but the fee recipient is not set (zero address), meaning no protocol revenue is being collected.

---

## Current State

| Parameter | Current Value | Status |
|-----------|---------------|--------|
| **Fee Receiver** | `0x0000000000000000000000000000000000000000` | ❌ Not Set |
| **Interest Fee** | 10.00% (1000 basis points) | ✅ Configured |
| **Governor Admin** | `0xE742Ee9b946043ecc75bFc71B47216C1f8248316` | ✅ AxiomVaultGovernorV2 |

**Impact:** All interest earned on the vault currently goes to liquidity providers. The protocol collects zero revenue from lending operations.

---

## Proposed Change

Set the vault's fee recipient to the AXUSDRevenueRouter contract to begin collecting protocol revenue.

### Target Configuration

| Parameter | New Value | Description |
|-----------|-----------|-------------|
| **Fee Receiver** | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | AXUSDRevenueRouter |
| **Interest Fee** | 10.00% (unchanged) | 10% of interest to protocol |

---

## Contract Addresses

| Contract | Address | Role |
|----------|---------|------|
| **AXUSD Lending Vault** | `0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429` | Target vault |
| **AxiomVaultGovernorV2** | `0xE742Ee9b946043ecc75bFc71B47216C1f8248316` | Vault governor |
| **AXUSDRevenueRouter** | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Fee recipient |
| **GovernanceHub** | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Governance timelock |

---

## Execution Path

### Option A: Direct Governor Action (Recommended)

If the deployer wallet (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) still has governor privileges:

```solidity
// Call from deployer wallet or authorized governance address
IEVault vault = IEVault(0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429);
vault.setFeeReceiver(0x39A9Ca593d350450d93aF7F24dC1A682df47F30a);
```

**Function Signature:**
```
setFeeReceiver(address newFeeReceiver)
```

**Calldata:**
```
0x62d2860200000000000000000000000039a9ca593d350450d93af7f24dc1a682df47f30a
```

### Option B: Via Vault Governor Contract

If governance goes through AxiomVaultGovernorV2:

1. Submit proposal to AxiomVaultGovernorV2
2. Wait for 24h timelock period
3. Execute proposal after timelock

```typescript
// Governance proposal parameters
const target = '0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429'; // AXUSD Vault
const value = 0;
const data = vault.interface.encodeFunctionData('setFeeReceiver', [
  '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a' // RevenueRouter
]);
const description = 'AXM-GOV-002: Set Euler Vault Fee Recipient to Revenue Router';
```

---

## Revenue Flow After Configuration

Once configured, protocol revenue flows as follows:

```
Borrower Interest (100%)
    ├── 90% → Liquidity Providers (LPs)
    └── 10% → AXUSDRevenueRouter
                   ├── SEED Yield Distributor
                   ├── Axiom Treasury
                   └── Backstop Vault
```

---

## Revenue Projections

Based on documented fee structure (10% interest spread):

| TVL | Est. Annual Interest | Protocol Revenue (10%) |
|-----|----------------------|------------------------|
| $100K | $8,000 | $800 |
| $500K | $40,000 | $4,000 |
| $1M | $80,000 | $8,000 |
| $10M | $800,000 | $80,000 |

---

## Risk Assessment

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Transaction failure | Low | Verify calldata before submission |
| Wrong recipient address | Medium | Double-check Revenue Router address |
| Revenue Router malfunction | Low | Revenue Router is battle-tested |

### Reversibility

This action is **reversible**. The governor can call `setFeeReceiver()` again to change or reset the fee recipient at any time.

---

## Observation Window Considerations

This proposal is compatible with the observation window policy (ends 2026-03-26):

1. **No treasury capital deployment** - This only configures fee routing
2. **Conservative approach** - Uses existing Revenue Router infrastructure
3. **Governance-controlled** - Requires timelock execution
4. **Revenue begins accruing** - Immediately upon execution

---

## Verification Steps

After execution, verify configuration via API:

```bash
curl https://axiomsmartcity.com/api/euler/vault-stats | jq '.feeConfiguration'
```

Expected result:
```json
{
  "feeReceiver": "0x39A9Ca593d350450d93aF7F24dC1A682df47F30a",
  "interestFeePercent": "10.00",
  "status": {
    "isFeeRecipientConfigured": true,
    "isRevenueRouterSet": true,
    "feeRoutingStatus": "CONFIGURED_REVENUE_ROUTER",
    "actionRequired": null
  }
}
```

---

## Voting

| Option | Description |
|--------|-------------|
| **FOR** | Set fee recipient to Revenue Router |
| **AGAINST** | Keep fee recipient unset (LPs receive all interest) |
| **ABSTAIN** | No vote |

---

## Timeline

| Phase | Date | Status |
|-------|------|--------|
| Proposal Created | 2026-01-29 | ✅ Complete |
| Community Review | 2026-01-29 to 2026-01-31 | Pending |
| Governance Vote | 2026-02-01 | Pending |
| Timelock (24h) | 2026-02-02 | Pending |
| Execution | 2026-02-03 | Pending |

---

## References

- [AXM-LEND-001: AXUSD Lending Markets Specification](../lending/AXM-LEND-001-axusd-lending-markets.md)
- [AXM-GOV-001: Observation Window Rationale](./AXM-GOV-001-observation-window-rationale.md)
- [Euler V2 EVK Documentation](https://docs.euler.finance/creator-tools/vaults/evk/)
- [AXUSD Vault on Euler](https://app.euler.finance/vault/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429?network=arbitrumone)
