# AXUSD Real Estate Lending System

## Overview

This directory contains smart contracts for the AXUSD Fix & Flip Lending Fund - a real estate bridge loan platform that allows accredited investors to pool AXUSD and earn returns by funding short-term fix-and-flip loans.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AXUSD FIX & FLIP SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    │
│  │   Investors  │───▶│ FixFlipPoolVault│───▶│  FixFlipManager  │    │
│  │  (Deposit    │    │   (ERC4626)     │    │  (Origination)   │    │
│  │   AXUSD)     │    │                 │    │                  │    │
│  └─────────────┘    └─────────────────┘    └────────┬─────────┘    │
│                              │                       │              │
│                              │                       ▼              │
│                              │            ┌──────────────────┐      │
│                              │            │  LoanReceiptNFT  │      │
│                              │            │    (ERC721)      │      │
│                              │            └──────────────────┘      │
│                              │                       │              │
│                              ▼                       │              │
│                    ┌─────────────────┐               │              │
│                    │ RepaymentRouter │◀──────────────┘              │
│                    │  (Splits Yield) │                              │
│                    └────────┬────────┘                              │
│                              │                                      │
│            ┌─────────────────┼─────────────────┐                    │
│            ▼                 ▼                 ▼                    │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│    │    Vault     │  │  Insurance   │  │   Treasury   │            │
│    │   (Yield)    │  │    Fund      │  │  (Protocol)  │            │
│    └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                        │
│  │   RiskConfig    │    │ ProductRegistry │                        │
│  │ (LTV, Rates,    │    │ (Product IDs)   │                        │
│  │  Terms)         │    │                 │                        │
│  └─────────────────┘    └─────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Contracts

| Contract | Description | Key Functions |
|----------|-------------|---------------|
| **FixFlipPoolVault.sol** | ERC4626 vault for AXUSD deposits | `deposit()`, `withdraw()`, `lockForLoan()` |
| **LoanReceiptNFT.sol** | ERC721 tokens representing loans | `mintLoan()`, `recordPayment()`, `getLoan()` |
| **RiskConfig.sol** | Per-product risk parameters | `getProductRisk()`, `setProductRisk()` |
| **RepaymentRouter.sol** | Payment routing engine | `routePayment()`, `getRoutingSplit()` |
| **FixFlipManager.sol** | Loan lifecycle management | `originate()`, `pay()`, `closeLoan()` |
| **ProductRegistry.sol** | Product registration | `registerProduct()`, `getManager()` |
| **Interfaces.sol** | Shared interfaces and types | N/A |

## Existing Contracts REUSED

| Role | Contract | Address | Reuse Strategy |
|------|----------|---------|----------------|
| **AXUSD Token** | AxiomStable (GENIUS) | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Settlement asset for all lending operations |
| **Treasury** | AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Fee routing destination |
| **Revenue Router** | AXUSDRevenueRouter | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Reference for routing patterns |
| **Credit SBT** | AxiomScoreSBT | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | Borrower credit scoring |

## Product ID

| ID | Product | Status |
|----|---------|--------|
| 1 | Fix & Flip Bridge Loans | Active |

## Risk Parameters (Product 1)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxLtvBps` | 7000 | 70% max LTV on ARV |
| `maxTermDays` | 365 | 12-month maximum term |
| `minLoanSize` | $50,000 | Minimum loan amount |
| `maxLoanSize` | $500,000 | Maximum loan amount |
| `interestRateBps` | 1400 | 14% annual interest |
| `originationFeeBps` | 300 | 3 points origination |
| `lateFeePerDayBps` | 50 | 0.5% per day late fee |
| `insuranceReserveBps` | 200 | 2% to insurance fund |
| `protocolFeeBps` | 150 | 1.5% to treasury |

## Yield Distribution

When a borrower makes an interest payment:

1. **Vault (Investors)**: ~96.5% of interest → shared among depositors
2. **Insurance Fund**: 2% of interest → covers defaults
3. **Protocol Treasury**: 1.5% of interest → protocol operations

## Roles

| Role | Capabilities |
|------|-------------|
| `ADMIN_ROLE` | Full configuration, pause/unpause |
| `MANAGER_ROLE` | Lock/unlock funds, report yield |
| `UNDERWRITER_ROLE` | Originate loans |
| `GUARDIAN_ROLE` | Emergency pause |

## Deployment Order

1. Deploy `RiskConfig`
2. Deploy `LoanReceiptNFT`
3. Deploy `FixFlipPoolVault` (with AXUSD address)
4. Deploy `RepaymentRouter` (with vault, treasury, insurance addresses)
5. Deploy `FixFlipManager` (with all dependencies)
6. Deploy `ProductRegistry`
7. Register FixFlipManager in ProductRegistry
8. Grant roles: MANAGER_ROLE, UNDERWRITER_ROLE

## Deployment Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test test/realestate/FixFlipSystem.test.js

# Deploy to Arbitrum One
npx hardhat run scripts/deploy-realestate.js --network arbitrum
```

## Environment Variables

```env
AXUSD_ADDRESS=0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C
TREASURY_ADDRESS=<your_treasury>
INSURANCE_FUND_ADDRESS=<your_insurance_fund>
ALCHEMY_RPC_URL=<your_alchemy_url>
DEPLOYER_PK=<your_private_key>
```

## Security Considerations

- All functions use OpenZeppelin's `ReentrancyGuard`
- Pausable emergency stops via `GUARDIAN_ROLE`
- Access control for sensitive operations
- 70% max LTV provides equity buffer
- Insurance reserve for default coverage

## Legal Structure

- **Entity**: Axiom Nexus LLC (Mississippi)
- **Offering**: SEC Rule 506(c)
- **Investors**: Accredited only
- **Minimum**: $10,000 AXUSD

## Key Events

### Pool Events
- `PoolDeposit(user, assets, shares)`
- `PoolWithdraw(user, assets, shares)`
- `YieldReported(amount)`
- `FundsLocked(amount)`
- `FundsUnlocked(amount)`

### Loan Events
- `LoanOriginated(loanId, borrower, principal, productId)`
- `LoanPayment(loanId, payer, amount)`
- `LoanStatusChanged(loanId, status)`
- `LoanClosed(loanId)`

### Payment Events
- `PaymentRouted(loanId, principal, yieldToVault, toInsurance, toTreasury)`

## Related Files

- Legal documents: `/docs/legal/`
- Frontend pages: `/pages/lending-fund/`
- API endpoints: `/pages/api/realestate/`
- Tests: `/test/realestate/`
- Deployment script: `/scripts/deploy-realestate.js`
