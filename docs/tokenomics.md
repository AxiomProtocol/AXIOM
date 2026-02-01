# AXM Token Economics - Canonical Specification

> **CANONICAL DOCUMENT**: This is the single source of truth for AXM tokenomics. All other references in documentation, wiki, frontend, and marketing materials MUST mirror this document. Last updated: November 2025.

---

## Token Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Axiom Protocol Token |
| **Symbol** | AXM |
| **Max Supply** | 15,000,000,000 (15 billion) |
| **Decimals** | 18 |
| **Standard** | ERC-20 |
| **Network** | Arbitrum One (Chain ID: 42161) |
| **Contract Address** | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| **Initial Circulating (at TGE)** | ~200,000,000 |
| **TGE Target** | Q1 2026 |

---

## Token Allocation

| Category | Allocation % | Token Amount | Vesting Schedule |
|----------|--------------|--------------|------------------|
| Community & Ecosystem | 35% | 5,250,000,000 | 48 months linear unlock |
| Treasury | 20% | 3,000,000,000 | 36 months, 6-month cliff |
| Team & Advisors | 15% | 2,250,000,000 | 24 months, 12-month cliff |
| Private Sale | 12% | 1,800,000,000 | 18 months, 6-month cliff |
| Public Sale | 8% | 1,200,000,000 | 10% at TGE, 12 months linear |
| Liquidity | 5% | 750,000,000 | Immediate unlock at TGE |
| Strategic Partners | 5% | 750,000,000 | 24 months, 6-month cliff |

---

## Vesting Details

### Community & Ecosystem (35%)
- **Purpose**: DePIN rewards, staking incentives, grants, airdrops
- **Unlock**: Linear over 48 months starting at TGE
- **Monthly Release**: ~109,375,000 AXM

### Treasury (20%)
- **Purpose**: Protocol development, operations, strategic initiatives
- **Cliff**: 6 months (no tokens released)
- **Unlock**: Linear over 30 months after cliff
- **Controller**: Multi-signature governance

### Team & Advisors (15%)
- **Purpose**: Core team compensation and advisor allocation
- **Cliff**: 12 months (no tokens released)
- **Unlock**: Linear over 12 months after cliff
- **Protection**: Longest cliff to demonstrate commitment

### Private Sale (12%)
- **Purpose**: Early institutional and strategic investors
- **Cliff**: 6 months
- **Unlock**: Linear over 12 months after cliff

### Public Sale (8%)
- **Purpose**: Community TGE participation
- **TGE Unlock**: 10% immediate (120,000,000 AXM)
- **Remaining**: Linear over 12 months

### Liquidity (5%)
- **Purpose**: DEX and CEX liquidity provision
- **Unlock**: 100% at TGE
- **Use**: Initial trading pairs on DEXs

### Strategic Partners (5%)
- **Purpose**: Technology partners, ecosystem builders
- **Cliff**: 6 months
- **Unlock**: Linear over 18 months after cliff

---

## Token Utility

### 1. Governance
- Vote on protocol proposals
- Elect council members
- Approve treasury spending
- Set platform parameters

### 2. Staking
- DePIN node operation staking
- General staking for rewards
- Option Consideration staking (8% APR for KeyGrow)
- Liquidity provision incentives

### 3. Fee Payment
- Transaction fees (with discount for AXM holders)
- Platform service fees
- Banking product fees
- Reduced fees for stakers

### 4. Access & Benefits
- Premium feature access
- Higher tier banking services
- Early access to new products
- Governance participation rights

---

## Emission Schedule

| Period | Circulating Supply (Approx.) |
|--------|------------------------------|
| TGE (Day 1) | ~200,000,000 |
| End of Year 1 | ~2,000,000,000 |
| End of Year 2 | ~3,500,000,000 |
| End of Year 3 | ~4,700,000,000 |
| End of Year 4 | ~6,500,000,000 |
| Full Unlock (Year 5) | 15,000,000,000 |

---

## Deflationary Mechanisms

1. **Fee Burns**: Portion of transaction fees permanently burned
2. **Treasury Buybacks**: Regular buyback and burn programs
3. **Staking Locks**: Tokens locked in staking reduce circulating supply
4. **Governance Deposits**: Tokens locked for proposal submission

---

## Contract Features

The AXM token contract (AxiomV2.sol) includes:

- **ERC-20 Standard** with Burnable, Permit, and Votes extensions
- **Dynamic Fee Routing** to 6 configured vaults
- **Role-Based Access Control** (7 distinct roles)
- **Pausable** functionality for emergency situations
- **Compliance Module** integration capability
- **Anti-Whale Protection** (configurable max transfer limits)
- **Governance Voting Power** with delegation support

---

## Verification

To verify this token on-chain:
1. Visit [Arbitrum Blockscout](https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D)
2. Confirm contract address: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
3. Verify token name: "Axiom Protocol Token"
4. Verify symbol: "AXM"
5. Verify max supply: 15,000,000,000 (15 billion)

---

**Copyright (c) 2024 Axiom Protocol. All Rights Reserved.**

*This document is the canonical tokenomics specification. Any discrepancies in other materials should be reported and corrected to match this document.*
