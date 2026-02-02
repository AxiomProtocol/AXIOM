# AXIOM Protocol Genesis Snapshot

**Version:** 1.0
**Snapshot Date:** February 2, 2026
**Network:** Arbitrum One (Chain ID: 42161)

---

## Purpose

This document serves as the authoritative reference for AXIOM Protocol's deployed infrastructure as of the Genesis snapshot date. All future upgrades, migrations, and L3 deployments will reference this baseline.

---

## Core Governance Contracts

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Yes | 24hr timelock governance |
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | Yes | Loan product registration |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Yes | Fix & Flip risk params |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | Yes | DSCR loan risk params |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Yes | Bridge loan origination |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | Yes | Rental loan origination |

---

## DEX V2 Ecosystem Contracts

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| ExchangeHubV2 | `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28` | Yes | Central trading router |
| OracleAdapter | `0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7` | Yes | Chainlink price aggregation |
| LPStaking | `0x066623787044440015f7Ea2eC04cA58126cA00a5` | Yes | Liquidity incentives |
| FeeDistributor | `0xD981748E2ed17681D8088be84480FE294d635ae8` | Yes | Protocol revenue distribution |
| TradingRewards | `0xb75b6e3D02116421fbd7c830a0f24d9a42420984` | Yes | Volume-based incentives |
| DEXRouter | `0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8` | Yes | Order execution |
| DEXAnalytics | `0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9` | Yes | On-chain metrics |
| LimitOrders | `0xBdC968773915095b71156bf265b0b10B23B9F8E2` | Yes | Conditional execution |
| DEXGovernor | `0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d` | Yes | DEX parameter governance |
| InsuranceFund | `0x449769453e5bc43345092EeD31780bbbfc400F39` | Yes | Trading loss coverage |

---

## AXUSD System Contracts

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| AXUSD Token | TBD | Yes | Stablecoin (ERC-20) |
| VaultEngine | TBD | Yes | CDP creation & management |
| PSM | TBD | Yes | 1:1 USDC mint/redeem |
| Liquidator | TBD | Yes | Undercollateralized position handling |
| BackstopVault | TBD | Yes | Protocol reserve layer |
| MarketOperations | TBD | Yes | Peg defense mechanisms |

---

## Token Contracts

| Token | Address | Standard | Purpose |
|-------|---------|----------|---------|
| AXM | TBD | ERC-20 | Governance & fee routing |
| AXUSD | TBD | ERC-20 | Settlement stablecoin |
| SEED | TBD | Custom | Staking & voting power |
| AxiomScoreSBT | TBD | Soulbound | On-chain reputation |
| LandOptionRegistry | TBD | ERC-1155 | Fractional land ownership |
| PMA Membership | TBD | ERC-1155/1400 | Association membership |

---

## Governance Parameters

### GovernanceHub Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Minimum Delay | 24 hours | Hardcoded floor: 1 hour |
| Default Delay | 24 hours | Configured at deployment |
| Maximum Delay | 30 days | Hardcoded cap |
| Grace Period | 14 days | Actions expire after ETA + grace |

### Role Assignments

| Role | Holder | Notes |
|------|--------|-------|
| DEFAULT_ADMIN_ROLE | Deployer | Pending multi-sig transfer |
| RISK_COMMITTEE_ROLE | TBD | |
| SETTLEMENT_AUTHORITY_ROLE | TBD | |
| GUARDIAN_ROLE | TBD | |

---

## Registered Loan Products

| Product ID | Name | LTV | DSCR | APR | Range | Term |
|------------|------|-----|------|-----|-------|------|
| 1 | Fix & Flip Bridge | 75% | N/A | 12% | $50K-$5M | 6-18 mo |
| 2 | DSCR 30-Year Rental | 75% | 1.25 | 8% | $75K-$3M | 360 mo |
| 3 | DSCR 15-Year Rental | 80% | 1.15 | 7.25% | $75K-$3M | 180 mo |
| 4 | BRRRR Refinance | 70% | 1.30 | 8.5% | $100K-$2M | 240 mo |

---

## Oracle Configuration

### Chainlink Price Feeds

| Asset | Feed Address | Heartbeat |
|-------|--------------|-----------|
| ETH/USD | 0x639F...612 | 1 hour |
| USDC/USD | 0x5083...D3 | 1 hour |
| ARB/USD | 0xb2A8...D6 | 1 hour |
| LINK/USD | 0x86E5...CB | 1 hour |

### Property Valuation Oracles

- ATTOM Data API
- RentCast API
- Walk Score API

---

## Upgrade Classification

### Core Contracts (Require Proxy Upgrade)

These contracts hold critical state and cannot be redeployed:

- GovernanceHub
- ProductRegistry
- VaultEngine
- AXUSD Token
- AXM Token

### Product Contracts (Can Redeploy)

These contracts can be redeployed and reregistered:

- RiskConfig
- DSCRRiskConfig
- FixFlipManager
- DSCRLoanManager

### Utility Contracts (Stateless)

These contracts are stateless and can be replaced:

- OracleAdapter
- DEXRouter
- DEXAnalytics

---

## Verification Links

All contracts verified on Arbitrum Blockscout:

```
https://arbiscan.io/address/0x52Dc85fd653a75323b5307f4D2629ab9A070530E
https://arbiscan.io/address/0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d
https://arbiscan.io/address/0xD9a53c691B688351283Fecc33D8D9AF964A9a078
https://arbiscan.io/address/0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26
https://arbiscan.io/address/0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958
https://arbiscan.io/address/0x105117F1AD1B65a5d0C7F0E9A870683A06738E16
```

---

## Next Steps

1. Complete TBD addresses from on-chain registry
2. Export full ABI set for each contract
3. Create contract size audit
4. Identify upgrade proxy candidates
5. Tag git commit as `genesis-snapshot`

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial snapshot |
