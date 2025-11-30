# KeyGrow Rent-to-Own Program

## Overview

KeyGrow is a first-of-its-kind tokenized rent-to-own real estate platform that enables tenants to build equity through blockchain technology.

> **Patent Pending:** The KeyGrow tokenization system is protected by pending patent applications.

---

## How It Works

### 1. Property Tokenization
Each property is tokenized into **100,000 ERC-1155 shares**:
- Each share represents **0.001%** of the property
- Shares are minted on Arbitrum One blockchain
- Full ownership = 100,000 shares

### 2. Tenant Enrollment
1. Browse available properties
2. Submit application
3. Pay **Option Consideration** ($500)
4. Sign lease agreement
5. Begin earning equity

### 3. Equity Accumulation
- **20% of monthly rent** converts to property tokens
- Tokens are minted and transferred to tenant wallet
- Track ownership percentage in real-time
- Full transparency on blockchain

### 4. Path to Ownership
- Accumulate shares over time
- Option to purchase remaining equity
- Traditional financing for balance
- Full ownership transfer

---

## Option Consideration

The $500 Option Consideration is NOT a deposit—it's a legally binding option fee:

| Feature | Details |
|---------|---------|
| **Amount** | $500 |
| **Staking** | Converted to AXM tokens |
| **APR** | 8% annual yield |
| **At Closing** | Credited toward purchase price |
| **Rewards** | Accumulate toward down payment |

> **Legal Note:** We use "Option Consideration" not "Good Faith Deposit" as the legally correct term for rent-to-own agreements.

---

## Property Selection

### Criteria
- Price range: $50,000 - $375,000
- Affordable for median income
- Growing markets
- Good rental yields

### Data Sources
- **ATTOM Data** - Property valuations
- **RentCast API** - Market rent estimates
- **Walk Score** - Location scores

### Financial Metrics
Each property displays:
- Price-to-rent ratio
- Affordability index
- Equity projections (1/3/5 year)
- Monthly ownership cost breakdown
- Cap rate
- Time-to-ownership estimate

---

## Smart Contract Architecture

```
KeyGrowPropertyRegistry.sol
├── Property tokenization (ERC-1155)
├── Share minting/transfers
├── Ownership tracking
└── Purchase execution

KeyGrowEnrollment.sol
├── Tenant applications
├── Option consideration handling
├── Lease management
└── Equity calculations

KeyGrowStaking.sol
├── Option fee staking
├── AXM rewards (8% APR)
├── Reward claiming
└── Purchase credit tracking
```

---

## User Journeys

### For Tenants
1. Connect wallet
2. Browse properties
3. View financial analysis
4. Apply for enrollment
5. Pay option consideration
6. Sign lease
7. Pay rent monthly
8. Watch equity grow
9. Purchase when ready

### For Property Sellers
1. List property
2. Set terms
3. Review applications
4. Accept tenants
5. Receive rent payments
6. Transfer ownership at close

---

## Benefits

### For Tenants
- Build equity while renting
- Transparent blockchain tracking
- Option consideration earns yield
- Path to homeownership

### For Sellers
- Guaranteed rental income
- Premium pricing
- Reduced vacancy
- Motivated tenants

### For Investors
- Fractional real estate exposure
- Liquid property shares
- Diversification
- Passive income

---

## Technical Integration

### Required APIs
- ATTOM_API_KEY (property data)
- RENTCAST_API_KEY (rental estimates)
- WALKSCORE_API_KEY (location scores)

### Database Tables
- `keygrow_properties`
- `keygrow_enrollments`
- `keygrow_deposits`
- `keygrow_equity_events`
- `keygrow_payments`

---

## Regulatory Compliance

- SEC Regulation D exemptions
- State real estate laws
- Option contract requirements
- Consumer protection compliance

---

**Contact:** licensing@axiomprotocol.io

Copyright (c) 2024 Axiom Protocol. All Rights Reserved.
