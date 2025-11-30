# KeyGrow Rent-to-Own Program - Technical Specification

> **Patent Pending Technology**
> 
> The KeyGrow tokenization system is proprietary technology protected by pending patent applications.

---

## Overview

KeyGrow is a tokenized rent-to-own real estate platform that enables tenants to build equity through blockchain technology. Each property is fractionalized into ERC-1155 tokens, with rent payments automatically converting to ownership shares.

---

## Tokenization Model

### Property Shares

| Attribute | Value |
|-----------|-------|
| **Token Standard** | ERC-1155 (Multi-Token) |
| **Shares Per Property** | 100,000 |
| **Share Value** | 0.001% of property per share |
| **Full Ownership** | 100,000 shares = 100% |

### Example Property

For a $200,000 property:
- Total shares: 100,000
- Value per share: $2.00
- Minimum purchase: 1 share ($2.00)
- Maximum: 100,000 shares ($200,000)

---

## Rent-to-Equity Conversion

### Conversion Rate

| Parameter | Value |
|-----------|-------|
| **Equity Allocation** | 20% of monthly rent |
| **Conversion Frequency** | Monthly |
| **Token Minting** | Automatic after rent payment |

### Conversion Formula

```
Monthly Equity (USD) = Monthly Rent × 0.20
Shares Earned = Monthly Equity (USD) / Share Price (USD)
```

---

## Concrete Numeric Example

### Scenario: $1,500/Month Rent on $200,000 Property

**Property Details:**
- Purchase Price: $200,000
- Total Shares: 100,000
- Share Price: $2.00

**Monthly Rent Breakdown:**
- Total Monthly Rent: $1,500
- Equity Portion (20%): $300
- Landlord Portion (80%): $1,200

**Monthly Equity Accumulation:**
- Monthly Equity: $300
- Shares Earned: $300 ÷ $2.00 = **150 shares/month**
- Ownership Gained: 150 ÷ 100,000 = **0.15%/month**

**Annual Accumulation (Year 1):**
- Total Equity: $300 × 12 = **$3,600**
- Total Shares: 150 × 12 = **1,800 shares**
- Ownership Percentage: **1.8%**

**5-Year Projection:**
- Total Equity Accumulated: $300 × 60 = **$18,000**
- Total Shares: 150 × 60 = **9,000 shares**
- Ownership Percentage: **9.0%**
- Remaining to Purchase: 91,000 shares = $182,000

---

## Option Consideration and Staking

### Option Consideration Fee

| Attribute | Value |
|-----------|-------|
| **Amount** | $500 |
| **Type** | Legally binding option fee |
| **Refundable** | No (credited at closing) |

> **Legal Note:** We use "Option Consideration" as the legally correct term for rent-to-own agreements, not "Good Faith Deposit."

### Staking Mechanism

The $500 Option Consideration is staked in AXM tokens:

| Parameter | Value |
|-----------|-------|
| **Staking Token** | AXM |
| **APR** | 8% annual yield |
| **Reward Frequency** | Accrued daily, claimable monthly |
| **At Closing** | Full amount + rewards credited to purchase |

### Staking Rewards Example

**$500 Option Consideration Staked:**

| Time Period | Rewards Earned | Total Value |
|-------------|----------------|-------------|
| 1 Year | $40 | $540 |
| 2 Years | $80 | $580 |
| 3 Years | $120 | $620 |
| 5 Years | $200 | $700 |

**At Closing:**
The full $500 + accumulated rewards are credited toward the down payment.

---

## Smart Contract Architecture

### Core Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| LeaseAndRentEngine | [`0x26a20dEa57F951571AD6e518DFb3dC60634D5297`](https://arbitrum.blockscout.com/address/0x26a20dEa57F951571AD6e518DFb3dC60634D5297) | Lease management, rent processing, equity minting |
| AxiomLandAndAssetRegistry | [`0xaB15907b124620E165aB6E464eE45b178d8a6591`](https://arbitrum.blockscout.com/address/0xaB15907b124620E165aB6E464eE45b178d8a6591) | Property registration and tokenization |
| CapitalPoolsAndFunds | [`0xFcCdC1E353b24936f9A8D08D21aF684c620fa701`](https://arbitrum.blockscout.com/address/0xFcCdC1E353b24936f9A8D08D21aF684c620fa701) | Option consideration staking |

### Contract Functions

```solidity
// LeaseAndRentEngine.sol
function createLease(
    uint256 propertyId,
    address tenant,
    uint256 monthlyRent,
    uint256 leaseDuration
) external returns (uint256 leaseId);

function processRentPayment(
    uint256 leaseId
) external payable;

function mintEquityShares(
    uint256 propertyId,
    address tenant,
    uint256 shares
) internal;

// Option Consideration Staking
function stakeOptionConsideration(
    uint256 leaseId,
    uint256 amount
) external;

function claimStakingRewards(
    uint256 leaseId
) external returns (uint256 rewards);
```

---

## Property Selection Criteria

### Affordability Filters

| Parameter | Range |
|-----------|-------|
| **Price Range** | $50,000 - $375,000 |
| **Target Demographic** | Median income households |
| **Market Type** | Growing markets with strong rental yields |

### Data Sources

| Source | Data Provided |
|--------|---------------|
| ATTOM Data | Property valuations, sales history |
| RentCast API | Market rent estimates, comparables |
| Walk Score API | Walkability, transit, bike scores |

### Financial Metrics Displayed

- Price-to-rent ratio
- Affordability index
- Equity projections (1/3/5 year)
- Monthly ownership cost breakdown
- Cap rate
- Estimated time-to-ownership

---

## User Journey

### For Tenants

1. Connect Web3 wallet
2. Browse available properties
3. View financial analysis and equity projections
4. Submit enrollment application
5. Pay $500 Option Consideration (staked in AXM)
6. Sign digital lease agreement
7. Pay rent monthly (automatic equity conversion)
8. Track ownership percentage in real-time
9. Exercise purchase option when ready

### For Property Sellers

1. Register property on platform
2. Property is tokenized (100,000 ERC-1155 shares)
3. Set rental terms and pricing
4. Review tenant applications
5. Receive 80% of monthly rent
6. Transfer ownership at tenant's purchase

---

## Regulatory Compliance

- SEC Regulation D exemptions for accredited investors
- State-specific real estate regulations
- Option contract legal requirements
- Consumer protection compliance
- ISO 20022 compliant transaction formats

---

## Database Schema

Key tables for KeyGrow functionality:

| Table | Purpose |
|-------|---------|
| `keygrow_properties` | Property listings and tokenization data |
| `keygrow_enrollments` | Tenant enrollment records |
| `keygrow_deposits` | Option consideration tracking |
| `keygrow_equity_events` | Equity share minting events |
| `keygrow_payments` | Rent payment history |

---

**Copyright (c) 2024 Axiom Protocol. All Rights Reserved.**

*KeyGrow is a trademark of Axiom Protocol. The tokenization methodology is protected by pending patent applications.*
