# AXUSD Real Estate Lending Stack

## Step A: Contract Inventory & Mapping

### Existing Contracts to REUSE

| Role | Contract | Address | Reuse Strategy |
|------|----------|---------|----------------|
| **AXUSD Token** | AxiomStable (GENIUS) | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Settlement asset for all lending operations |
| **Treasury** | AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Fee routing destination |
| **Revenue Router** | AXUSDRevenueRouter | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Reference for routing patterns |
| **Oracle Adapter** | OracleAdapter (GENIUS) | `0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D` | Price feed integration |
| **Rate Limiter** | RateLimiter (GENIUS) | `0xE19E4172786A193997f985edC27f7932a0B65327` | Minting controls |
| **Vault Engine** | VaultEngine (GENIUS) | `0x4675C09dDC1B3094cd86F6b59904CC3E06c98028` | CDP minting reference |
| **Fee Burner** | AxiomFeeBurner | `0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94` | Protocol fee handling |
| **Credit SBT** | AxiomScoreSBT | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | Borrower credit scoring |
| **Segregated Custody** | SegregatedCustody | `0x1Ba851cfB9B3e34D88BC0cbf5a0042F9eb1Af66b` | GENIUS compliance reference |

### Existing Patterns to REFERENCE

| Pattern | Contract | Usage |
|---------|----------|-------|
| **Share-based pooling** | CapitalPoolsAndFunds | Fund/share accounting model |
| **Soulbound token** | AxiomScoreSBT | ERC-5192 pattern for loan receipts |
| **Emergency timelock** | BackstopVault | 24h withdrawal delay pattern |
| **Access control** | All contracts | OpenZeppelin AccessControl standard |
| **Pausable** | All contracts | Emergency pause capability |

### NEW Contracts Required

| Contract | Purpose | OpenZeppelin Base |
|----------|---------|-------------------|
| `Interfaces.sol` | Shared interfaces (IPoolVault, IRiskConfig, ILoanReceipt, IRepaymentRouter) | - |
| `FixFlipPoolVault.sol` | ERC4626 vault for AXUSD deposits | ERC4626, AccessControl, Pausable, ReentrancyGuard |
| `LoanReceiptNFT.sol` | ERC721 loan tracking token | ERC721, AccessControl |
| `RiskConfig.sol` | Per-product risk parameters | AccessControl |
| `RepaymentRouter.sol` | Payment splits (yield, insurance, treasury) | AccessControl, ReentrancyGuard |
| `FixFlipManager.sol` | Fix & Flip loan lifecycle | AccessControl, Pausable, ReentrancyGuard |
| `ProductRegistry.sol` | Product/manager registration | AccessControl |
| `ProductBase.sol` | Abstract base for future products | - |

## Folder Structure

```
contracts/realestate/
├── Interfaces.sol           # Shared interfaces
├── RiskConfig.sol           # Risk parameters
├── LoanReceiptNFT.sol       # ERC721 loan tracking
├── RepaymentRouter.sol      # Payment routing
├── FixFlipPoolVault.sol     # ERC4626 AXUSD vault
├── FixFlipManager.sol       # Fix & Flip product
├── ProductBase.sol          # Abstract base
├── ProductRegistry.sol      # Product registration
└── README.md               # This file
```

## Deployment Order

1. Deploy `RiskConfig`
2. Deploy `LoanReceiptNFT`
3. Deploy `FixFlipPoolVault` (with AXUSD address)
4. Deploy `RepaymentRouter` (with vault, treasury, insurance addresses)
5. Deploy `FixFlipManager` (with all dependencies)
6. Deploy `ProductRegistry`
7. Register FixFlipManager in ProductRegistry
8. Grant roles: ORIGINATOR_ROLE, MANAGER_ROLE

## Test Commands

```bash
npx hardhat test test/realestate/*.ts
```

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
