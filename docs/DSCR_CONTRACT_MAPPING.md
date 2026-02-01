# AXUSD DSCR Loan Product - Contract Mapping

## Overview
This document maps existing contracts for reuse in the DSCR Rental and BRRRR Refinance Loan product.

## Contract Reuse Matrix

| Component | Existing Contract | Reuse Strategy | Notes |
|-----------|------------------|----------------|-------|
| Settlement Token | AXUSD (external) | Direct reuse | All deposits, disbursements, payments in AXUSD |
| Pool Vault | `FixFlipPoolVault.sol` | Deploy new instance as `DSCRPoolVault` | Same ERC4626 pattern, separate liquidity pool |
| Loan Receipt NFT | `LoanReceiptNFT.sol` | Extend | Add DSCR-specific fields via extended struct |
| Risk Config | `RiskConfig.sol` | Extend | Add `minDscrBps`, `termMonths` for DSCR products |
| Repayment Router | `RepaymentRouter.sol` | Deploy new instance | Wire to DSCR vault, same routing logic |
| Product Registry | `ProductRegistry.sol` | Reuse | Register DSCR products with IDs 100-199 |
| Insurance Fund | `SusuInsuranceFund.sol` | Reuse | Same claim mechanism for DSCR defaults |
| Access Control | OpenZeppelin AccessControl | Reuse | Same role patterns (ADMIN, MANAGER, SERVICER) |

## Existing Contracts (Arbitrum One Deployments)

| Contract | Address | Status |
|----------|---------|--------|
| RiskConfig | 0x... | Deployed |
| LoanReceiptNFT | 0x... | Deployed |
| FixFlipPoolVault | 0x... | Deployed |
| RepaymentRouter | 0x... | Deployed |
| ProductRegistry | 0x... | Deployed |
| FixFlipManager | 0x... | Deployed |

## New Contracts for DSCR

| Contract | Purpose |
|----------|---------|
| `DSCRRiskConfig.sol` | Extended risk config with DSCR-specific parameters |
| `DSCRPoolVault.sol` | ERC4626 vault for DSCR investor deposits |
| `DSCRLoanManager.sol` | Loan origination, payments, refinance logic |
| `DSCRLoanReceiptNFT.sol` | Extended loan NFT with amortization tracking |

## Product IDs

| Product ID | Name | Description |
|------------|------|-------------|
| 1 | AXUSD_FIXFLIP_V1 | Fix & Flip bridge loans (existing) |
| 100 | AXUSD_DSCR_RENTAL_V1_LOW | Conservative tier: 65% LTV, 1.25 DSCR, 7% APR |
| 101 | AXUSD_DSCR_RENTAL_V1_STANDARD | Standard tier: 70% LTV, 1.20 DSCR, 8% APR |
| 102 | AXUSD_DSCR_RENTAL_V1_YIELD | Yield tier: 75% LTV, 1.10 DSCR, 9.5% APR |

## DSCR Risk Tiers Configuration

### AXUSD_DSCR_RENTAL_V1_LOW (ID: 100)
- Max LTV: 6500 bps (65%)
- Min DSCR: 12500 bps (1.25x)
- Interest Rate: 700 bps (7%)
- Origination Fee: 100 bps (1%)
- Term: 360 months (30 years)
- Min Loan: 50,000 AXUSD
- Max Loan: 1,000,000 AXUSD

### AXUSD_DSCR_RENTAL_V1_STANDARD (ID: 101)
- Max LTV: 7000 bps (70%)
- Min DSCR: 12000 bps (1.20x)
- Interest Rate: 800 bps (8%)
- Origination Fee: 150 bps (1.5%)
- Term: 360 months (30 years)
- Min Loan: 50,000 AXUSD
- Max Loan: 1,500,000 AXUSD

### AXUSD_DSCR_RENTAL_V1_YIELD (ID: 102)
- Max LTV: 7500 bps (75%)
- Min DSCR: 11000 bps (1.10x)
- Interest Rate: 950 bps (9.5%)
- Origination Fee: 200 bps (2%)
- Term: 360 months (30 years)
- Min Loan: 75,000 AXUSD
- Max Loan: 2,000,000 AXUSD

## Events for Dashboard Indexing

All events match existing conventions:
- `LoanOriginated(loanId, borrower, principal, productId, dscrBps, ltvBps)`
- `LoanPayment(loanId, payer, amount, principalPortion, interestPortion)`
- `PaymentPosted(loanId, amount, referenceHash, postedBy)` - Off-chain payment
- `LoanStatusChanged(loanId, oldStatus, newStatus)`
- `LoanClosed(loanId, closedBy)`
- `RefinanceCompleted(oldLoanId, newLoanId, payoffAmount, cashOut)`

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Investor Flow                             │
├─────────────────────────────────────────────────────────────┤
│  Investor ──AXUSD──> DSCRPoolVault ──shares──> Investor     │
│                           │                                  │
│                     lockForLoan()                            │
│                           │                                  │
│                    DSCRLoanManager                           │
│                           │                                  │
│            ┌──────────────┼──────────────┐                   │
│            │              │              │                   │
│     originate()    payOnChain()   postOffChainPayment()     │
│            │              │              │                   │
│            v              v              v                   │
│     LoanReceiptNFT   RepaymentRouter  RepaymentRouter       │
│                           │                                  │
│              ┌────────────┼────────────┐                     │
│              │            │            │                     │
│          DSCRVault   Insurance    Treasury                   │
│         (principal)  (reserve)    (protocol)                 │
└─────────────────────────────────────────────────────────────┘
```

## BRRRR Refinance Flow

```
FixFlip Loan (Active) 
        │
        │ refinanceFromFixFlip()
        │
        v
┌───────────────────────────────────┐
│ 1. Validate FixFlip loan eligible │
│ 2. Calculate payoff amount        │
│ 3. Check DSCR & LTV thresholds    │
│ 4. Pay off FixFlip to FixFlipVault│
│ 5. Mint new DSCR LoanReceipt      │
│ 6. Disburse any cash-out (if cap) │
└───────────────────────────────────┘
        │
        v
DSCR Loan (Active) - 30 year term
```
