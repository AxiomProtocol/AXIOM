# Axiom Protocol - Module Taxonomy

This document defines the functional modules of the Axiom Protocol and maps them to implementing contracts.

---

## Module 1: Treasury Core

**Description:** Central treasury management with fund intake, routing, and bucket allocation.

### Submodules
- **1.1 Intake:** Token deposits, revenue collection
- **1.2 Routing:** Distribution to designated vaults
- **1.3 Thresholds:** Minimum/maximum allocation limits
- **1.4 Buckets:** Multi-vault treasury organization

### Implementing Contracts
- `AxiomTreasuryAndRevenueHub` - Primary treasury controller
- `AxiomV2` - Token with treasury vault routing

---

## Module 2: Budget Router

**Description:** Scheduled fund distribution and envelope-based budgeting.

### Submodules
- **2.1 Draw Schedules:** Time-based fund releases
- **2.2 Envelopes:** Categorized spending allocations

### Implementing Contracts
- `AxiomTreasuryAndRevenueHub` - Revenue stream routing
- `AxiomFeeDistributor` (DEX) - Fee distribution scheduling

---

## Module 3: Reserve Buckets

**Description:** Multi-purpose reserve fund management.

### Submodules
- **3.1 Operating Reserve:** Day-to-day operational funds
- **3.2 Maintenance Reserve:** Asset maintenance allocations
- **3.3 Growth Reserve:** Expansion and development funds
- **3.4 Long-term Reserve:** Strategic reserves

### Implementing Contracts
- `AxiomTreasuryAndRevenueHub` - Vault management per revenue stream
- `BackstopVault` (Stablecoin) - AXUSD reserve backing
- `SusuInsuranceFund` - SUSU default coverage

---

## Module 4: Governance Parameter Registry

**Description:** On-chain governance parameter storage and modification.

### Submodules
- **4.1 Parameter Storage:** Key-value governance settings
- **4.2 Timelock Updates:** Delayed parameter changes
- **4.3 Voting Integration:** veAXM-weighted governance

### Implementing Contracts
- `veAXM` - Vote-escrowed governance tokens
- `AxiomDEXGovernor` - DEX governance proposals
- `GovernanceHub` - Central governance coordination

---

## Module 5: Admin Role Separation

**Description:** Role-based access control with separation of duties.

### Submodules
- **5.1 Role Definitions:** ADMIN, OPERATOR, REGISTRAR, etc.
- **5.2 Role Assignment:** Grant/revoke capabilities
- **5.3 Multi-sig Integration:** Safe wallet requirements

### Implementing Contracts
- All contracts use OpenZeppelin `AccessControl`
- Key roles: DEFAULT_ADMIN_ROLE, OPERATOR_ROLE, REGISTRAR_ROLE, PAUSER_ROLE

---

## Module 6: Emergency Controls

**Description:** System-wide pause, intervention, and unwind capabilities.

### Submodules
- **6.1 Pause:** Halt all contract operations
- **6.2 Intervene:** Emergency parameter changes
- **6.3 Unwind:** Graceful system shutdown

### Implementing Contracts
- All contracts implement OpenZeppelin `Pausable`
- Emergency functions protected by ADMIN_ROLE

---

## Module 7: Liquidity Deployment Module

**Description:** Strategic liquidity provision and management.

### Submodules
- **7.1 LP Creation:** Automated market maker pools
- **7.2 LP Staking:** Liquidity mining rewards
- **7.3 LP Withdrawal:** Position management

### Implementing Contracts
- `AxiomExchangeHubV2` - Core DEX functionality
- `AxiomLPStaking` - LP token staking
- `AxiomDEXRouter` - Swap routing

---

## Module 8: Yield Accounting

**Description:** Revenue tracking, yield calculation, and distribution.

### Submodules
- **8.1 Revenue Tracking:** Income source attribution
- **8.2 Yield Calculation:** APY/APR computation
- **8.3 Distribution:** Reward payouts

### Implementing Contracts
- `AxiomStakingAndEmissionsHub` - Staking rewards
- `AxiomTradingRewards` - Trading incentives
- `AxiomFeeBurner` - Fee buyback and burn
- `veAXM` - Real yield distribution

---

## Module 9: Drawdown Protection

**Description:** Risk management for lending and credit systems.

### Submodules
- **9.1 Collateral Monitoring:** Health factor tracking
- **9.2 Liquidation Engine:** Underwater position handling
- **9.3 Insurance Claims:** Default recovery

### Implementing Contracts
- `CreditLineVault` - Collateralized lending with liquidation
- `InsurancePoolHub` - Protocol risk coverage
- `SusuInsuranceFund` - SUSU default protection
- `Liquidator` (Stablecoin) - AXUSD liquidations

---

## Module 10: Asset Registry

**Description:** On-chain registry of real-world and digital assets.

### Submodules
- **10.1 Land Parcels:** Real estate registration
- **10.2 Property Tokens:** Fractionalized ownership
- **10.3 Credential NFTs:** Identity and verification tokens

### Implementing Contracts
- `AxiomLandAndAssetRegistry` - Land parcel management
- `CitizenCredentialRegistry` - Citizen credentials
- `AxiomScoreSBT` - Credit score soulbound tokens
- `LoanReceiptNFT` - Loan documentation tokens

---

## Module 11: Revenue Attribution

**Description:** Source tracking and allocation of protocol revenues.

### Submodules
- **11.1 Source Tracking:** Origin identification
- **11.2 Fee Collection:** Revenue aggregation
- **11.3 Attribution Logic:** Distribution rules

### Implementing Contracts
- `AxiomV2` - Dynamic fee routing (burn, staking, liquidity, dividend, treasury)
- `AxiomTreasuryAndRevenueHub` - Revenue stream allocation
- `AxiomFeeDistributor` - DEX fee handling

---

## Module 12: Lifecycle Tracking

**Description:** State management for long-running financial instruments.

### Submodules
- **12.1 Lease Lifecycle:** Creation → Active → Terminated
- **12.2 Loan Lifecycle:** Origination → Servicing → Maturity
- **12.3 SUSU Lifecycle:** Formation → Active → Completed

### Implementing Contracts
- `LeaseAndRentEngine` - Real estate lease states
- `AxiomSusuHub` - SUSU pool lifecycle
- `CreditLineVault` - Credit line states
- `TreasuryNoteToken` - Fixed-income maturity tracking
