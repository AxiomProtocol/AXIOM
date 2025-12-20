# Axiom Smart City - Smart Contract Interface Map

**Generated:** December 2025  
**Network:** Arbitrum One (Chain ID: 42161)  
**Purpose:** Documents all deployed contracts, their interfaces, and compliance-relevant functions

---

## 1. Contract Registry

| # | Contract | Address | Version | Security Level |
|---|----------|---------|---------|----------------|
| 1 | AxiomV2 (AXM Token) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | v1 | CRITICAL |
| 2 | AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | v1 | HIGH |
| 3 | AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | v1 | CRITICAL |
| 4 | AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | v1 | HIGH |
| 5 | CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | v1 | HIGH |
| 6 | AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | v1 | HIGH |
| 7 | LeaseAndRentEngine | `0x00591d360416dE7b016bBedbC6AA1AE798eA873B` | v2 | HIGH |
| 8 | RealtorModule | `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412` | v1 | MEDIUM |
| 9 | CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | v1 | HIGH |
| 10 | UtilityAndMeteringHub | `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d` | v1 | MEDIUM |
| 11 | TransportAndLogisticsHub | `0x959c5dd99B170e2b14B1F9b5a228f323946F514e` | v1 | LOW |
| 12 | DePINNodeSuite | `0x223dF824B320beD4A8Fd0648b242621e4d01aAEF` | v2 | HIGH |
| 13 | DePINNodeSales | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | v1 | MEDIUM |
| 14 | CrossChainAndLaunchModule | `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d` | v1 | HIGH |
| 15 | AxiomExchangeHub | `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` | v1 | HIGH |
| 16 | CitizenReputationOracle | `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643` | v1 | MEDIUM |
| 17 | IoTOracleNetwork | `0xe38B3443E17A07953d10F7841D5568a27A73ec1a` | v1 | MEDIUM |
| 18 | MarketsAndListingsHub | `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830` | v1 | HIGH |
| 19 | OracleAndMetricsRelay | `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6` | v1 | MEDIUM |
| 20 | CommunitySocialHub | `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49` | v1 | LOW |
| 21 | AxiomAcademyHub | `0x30667931BEe54a58B76D387D086A975aB37206F4` | v1 | LOW |
| 22 | GamificationHub | `0x7F455b4614E05820AAD52067Ef223f30b1936f93` | v1 | LOW |
| 23 | SustainabilityHub | `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046` | v1 | LOW |
| 24 | AxiomSusuHub | `0x6C69D730327930B49A7997B7b5fb0865F30c95A5` | v1 | MEDIUM |

---

## 2. Common Security Patterns

All contracts implement:
- **AccessControl** - Role-based permissions (ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, etc.)
- **Pausable** - Emergency pause capability via `pause()` / `unpause()`
- **ReentrancyGuard** - `nonReentrant` modifier on state-changing functions
- **SafeERC20** - Safe token transfers

---

## 3. Contract Details

### 3.1 AxiomV2 (AXM Token)
**Purpose:** ERC20 governance and utility token

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `transfer()` | Public | Anti-whale limits (maxTxEnabled) |
| `transferFrom()` | Public | Anti-whale limits |
| `burn()` | Token Holder | Deflationary mechanism |
| `pause()` / `unpause()` | ADMIN_ROLE | Emergency controls |
| `setMaxTx()` | ADMIN_ROLE | Anti-manipulation |
| `setFeeVaults()` | ADMIN_ROLE | Fee distribution |

**Features:**
- ERC20Votes for governance
- ERC20Permit for gasless approvals
- Dynamic fee routing to treasury
- Max transaction limits

---

### 3.2 AxiomIdentityComplianceHub
**Purpose:** KYC/AML identity verification

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `registerIdentity()` | COMPLIANCE_ROLE | KYC onboarding |
| `verifyIdentity()` | COMPLIANCE_ROLE | KYC approval |
| `revokeIdentity()` | COMPLIANCE_ROLE | KYC rejection/revocation |
| `isVerified()` | Public | Verification check |

**Compliance Notes:**
- Central KYC registry for platform
- Integrates with CitizenCredentialRegistry
- Required for high-value transactions

---

### 3.3 AxiomTreasuryAndRevenueHub
**Purpose:** Multi-sig treasury management

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `deposit()` | Public | Fund inflows |
| `withdraw()` | ADMIN_ROLE + Multi-sig | Fund outflows (requires 3/5) |
| `allocateFunds()` | ADMIN_ROLE | Budget allocation |
| `emergencyWithdraw()` | ADMIN_ROLE + Multi-sig | Emergency recovery |

**Security:**
- Gnosis Safe integration
- 48-hour timelock on major changes
- Multi-signature requirement (3 of 5)

---

### 3.4 LeaseAndRentEngine (v2)
**Purpose:** Rent-to-own lease management for KeyGrow

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `createLease()` | User | Direct lease creation |
| `createLeaseAsAdmin()` | ADMIN_ROLE | Admin-assisted lease (pre-deposited funds) |
| `depositForLease()` | User | Pre-deposit pattern |
| `withdrawLeaseDeposit()` | User | Refund deposits |
| `payRent()` | Tenant | Monthly payments with equity accrual |
| `terminateLease()` | ADMIN_ROLE | Lease termination |

**Security Fix (v2):**
- Split `createLease()` to prevent arbitrary `transferFrom` (H-02)
- User must call `depositForLease()` first, then `createLease()`

**Compliance Notes:**
- 20% rent-to-equity conversion
- $500 option consideration staking
- ERC-1155 property tokens

---

### 3.5 AxiomSusuHub
**Purpose:** Rotating savings pools (ROSCA)

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `createPool()` | Public | Pool creation (2-50 members) |
| `joinPool()` | Public | Member enrollment |
| `contribute()` | Member | Cycle contributions |
| `triggerPayout()` | Contract/Admin | Distribute pooled funds |
| `ejectMember()` | ADMIN_ROLE | Remove delinquent members |
| `cancelPool()` | ADMIN_ROLE | Cancel with refunds |

**Features:**
- Sequential or randomized payout order
- Grace periods for late payments
- Protocol fee to treasury (configurable)

---

### 3.6 DePINNodeSuite (v2)
**Purpose:** DePIN node registration and leasing

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `registerNode()` | ADMIN_ROLE | Add node to network |
| `createLease()` | User | Direct node lease |
| `createLeaseAsAdmin()` | ADMIN_ROLE | Admin-assisted lease |
| `depositForLease()` | User | Pre-deposit for lease |
| `withdrawLeaseDeposit()` | User | Refund deposits |
| `claimRewards()` | Node Operator | Claim staking rewards |

**Security Fix (v2):**
- Split `createLease()` to prevent arbitrary `transferFrom` (H-01)

---

### 3.7 AxiomExchangeHub
**Purpose:** Internal DEX with liquidity pools

| Function | Access | Compliance Relevance |
|----------|--------|---------------------|
| `swap()` | Public | Token exchange |
| `addLiquidity()` | Public | LP provision |
| `removeLiquidity()` | LP | Withdraw liquidity |
| `createPool()` | ADMIN_ROLE | New trading pairs |

**Security:**
- Minimum liquidity checks
- Price bounds protection
- Rate limiting

---

## 4. Role Hierarchy

```
DEFAULT_ADMIN_ROLE (Multi-sig: 0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d)
├── ADMIN_ROLE
│   ├── Contract administration
│   ├── Emergency pause
│   └── Parameter updates
├── MINTER_ROLE
│   └── Token minting
├── PAUSER_ROLE
│   └── Pause/unpause
├── COMPLIANCE_ROLE
│   └── Identity verification
├── ORACLE_ROLE
│   └── Data feeds
└── REALTOR_ROLE
    └── Property listings
```

---

## 5. Compliance-Critical Functions

### High-Risk Functions (Require Disclosure)
| Contract | Function | Risk | Required Disclosure |
|----------|----------|------|---------------------|
| AxiomV2 | `transfer()` | Anti-whale limits | Transaction limits notice |
| LeaseAndRentEngine | `payRent()` | Equity accrual | Rent-to-own terms |
| AxiomSusuHub | `joinPool()` | Pool participation | Pool terms, payout schedule |
| AxiomExchangeHub | `swap()` | Trading | Trading risks, slippage |
| DePINNodeSuite | `createLease()` | Node leasing | Lease terms, rewards |

### Admin-Only Functions (Audit Trail Required)
| Contract | Function | Impact |
|----------|----------|--------|
| All | `pause()` / `unpause()` | Platform-wide halt |
| Treasury | `withdraw()` | Fund movements |
| Identity | `revokeIdentity()` | User access |
| SUSU | `ejectMember()` | Pool participation |

---

## 6. Emergency Procedures

### Pause All Contracts
```solidity
// Requires ADMIN_ROLE or PAUSER_ROLE
contract.pause();
```

### Emergency Withdrawals
```solidity
// Requires ADMIN_ROLE + Multi-sig (3/5)
// 48-hour timelock for major amounts
emergencyWithdrawETH(amount, recipient);
emergencyWithdrawAXM(amount, recipient);
```

### Recovery Procedures
1. Multi-sig signers coordinate via Gnosis Safe
2. 48-hour timelock starts
3. Community notification
4. Execute after timelock

---

## 7. Verification Links

All contracts verified on Arbiscan:
- [AxiomV2](https://arbiscan.io/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D#code)
- [AxiomSusuHub](https://arbiscan.io/address/0x6C69D730327930B49A7997B7b5fb0865F30c95A5#code)
- [LeaseAndRentEngine v2](https://arbiscan.io/address/0x00591d360416dE7b016bBedbC6AA1AE798eA873B#code)
- [DePINNodeSuite v2](https://arbiscan.io/address/0x223dF824B320beD4A8Fd0648b242621e4d01aAEF#code)

---

*Last updated: December 2025*
