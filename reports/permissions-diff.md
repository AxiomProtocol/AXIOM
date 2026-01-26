# Axiom Protocol - Permissions & Role Analysis

**Generated:** 2026-01-26  
**Network:** Arbitrum One (42161)

---

## Role Hierarchy

```
DEFAULT_ADMIN_ROLE (0x00)
├── OPERATOR_ROLE
├── PAUSER_ROLE / GUARDIAN
├── REGISTRAR_ROLE
├── MINTER_ROLE
├── RISK_COMMITTEE_ROLE
└── SETTLEMENT_AUTHORITY_ROLE
```

---

## Role to Address Mapping

| Role | Address | Type | Description |
|------|---------|------|-------------|
| DEFAULT_ADMIN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe | Master admin with all privileges |
| OPERATOR_ROLE | `0xDFf9e47eb007bF02e47477d577De9ffA99791528` | EOA | Deployer/operator wallet |
| PAUSER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe | Emergency pause capability |
| REGISTRAR_ROLE | `0xDFf9e47eb007bF02e47477d577De9ffA99791528` | EOA | Asset/credential registration |

---

## Contract → Role → Function Mapping

### AxiomV2 (AXM Token)
**Address:** `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `pause()` | PAUSER_ROLE | Halt all transfers |
| `unpause()` | DEFAULT_ADMIN_ROLE | Resume transfers |
| `setFeeRates()` | DEFAULT_ADMIN_ROLE | Configure fee distribution |
| `setVaultAddresses()` | DEFAULT_ADMIN_ROLE | Update vault destinations |
| `mint()` | MINTER_ROLE | Mint new tokens (if enabled) |
| `burn()` | - | Token holder burns own tokens |

### AxiomTreasuryAndRevenueHub
**Address:** `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `depositRevenue()` | - | Accept revenue deposits |
| `routeToVault()` | OPERATOR_ROLE | Route funds to vaults |
| `setAllocation()` | DEFAULT_ADMIN_ROLE | Configure allocation BPS |
| `emergencySweep()` | DEFAULT_ADMIN_ROLE | Emergency fund extraction |
| `pause()` | PAUSER_ROLE | Halt operations |
| `unpause()` | DEFAULT_ADMIN_ROLE | Resume operations |

### AxiomSusuHub
**Address:** `0x6C69D730327930B49A7997B7b5fb0865F30c95A5`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `createPool()` | - | Any user can create pool |
| `joinPool()` | - | Any user can join open pool |
| `contribute()` | - | Pool members contribute |
| `claimPayout()` | - | Winner claims payout |
| `advanceCycle()` | - | Advance to next cycle |
| `ejectMember()` | OPERATOR_ROLE | Remove delinquent member |
| `cancelPool()` | DEFAULT_ADMIN_ROLE | Cancel pool with refunds |
| `pause()` | PAUSER_ROLE | Halt operations |

### AxiomScoreSBT
**Address:** `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `mint()` | MINTER_ROLE | Issue credit score SBT |
| `updateScore()` | OPERATOR_ROLE | Update credit score |
| `recordPayment()` | OPERATOR_ROLE | Track payment history |
| `pause()` | PAUSER_ROLE | Halt operations |

### veAXM (Vote-Escrowed AXM)
**Address:** `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `lock()` | - | Any holder can lock AXM |
| `extend()` | - | Extend own lock duration |
| `increase()` | - | Increase own locked amount |
| `withdraw()` | - | Withdraw after lock expires |
| `checkpoint()` | - | Public checkpoint update |
| `pause()` | PAUSER_ROLE | Halt operations |

### CreditLineVault
**Address:** `0xc997416666686A22EBAE8Eb7cc9224c10B08a35c`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `depositCollateral()` | - | User deposits collateral |
| `withdrawCollateral()` | - | User withdraws collateral |
| `borrow()` | - | User borrows against collateral |
| `repay()` | - | User repays debt |
| `liquidate()` | - | Anyone can liquidate |
| `setCollateralParams()` | DEFAULT_ADMIN_ROLE | Configure LTV/rates |
| `pause()` | PAUSER_ROLE | Halt operations |

### GovernanceHub
**Address:** `0x52Dc85fd653a75323b5307f4D2629ab9A070530E`

| Function | Required Role | Description |
|----------|---------------|-------------|
| `queueAction()` | RISK_COMMITTEE_ROLE | Queue governance action |
| `executeAction()` | - | Execute after timelock |
| `cancelAction()` | GUARDIAN | Cancel queued action |
| `emergencyPause()` | GUARDIAN | Emergency system pause |
| `setTimelock()` | DEFAULT_ADMIN_ROLE | Configure timelock delay |

### DEX Contracts (AxiomExchangeHubV2, etc.)
**Address:** Multiple (see deployments.md)

| Function | Required Role | Description |
|----------|---------------|-------------|
| `swap()` | - | Any user can swap |
| `addLiquidity()` | - | Any user can add LP |
| `removeLiquidity()` | - | LP holder removes liquidity |
| `createPool()` | DEFAULT_ADMIN_ROLE | Create new trading pair |
| `setFees()` | DEFAULT_ADMIN_ROLE | Configure trading fees |
| `pause()` | PAUSER_ROLE | Halt trading |

---

## Permission Risk Assessment

### High Risk Functions

| Contract | Function | Risk | Mitigation |
|----------|----------|------|------------|
| All | `pause()` | System halt | Limited to Safe multisig |
| Treasury | `emergencySweep()` | Fund extraction | Requires admin Safe |
| Token | `setFeeRates()` | Economic impact | Rate limits in contract |
| DEX | `setFees()` | Trading cost impact | Bounded by max fee |

### Privilege Escalation Vectors

| Vector | Current State | Recommendation |
|--------|--------------|----------------|
| Admin key compromise | Single Safe controls all | Implement role separation |
| Operator key compromise | Limited damage | Monitor operator actions |
| Role granting | Only admin can grant | Add timelock to role changes |

---

## Recommendations

1. **Role Separation:** Use different Safe wallets for different risk levels
   - Critical Safe (3/5): `unpause`, `emergencySweep`, `upgradeContracts`
   - Operational Safe (2/3): `pause`, `setParameters`
   - Automated EOA: `routeToVault`, `advanceCycle`

2. **Timelock Addition:** Queue all admin operations through timelock
   - 24-hour delay for parameter changes
   - 48-hour delay for critical functions
   - Immediate for emergency pause only

3. **Monitoring:** Implement role change monitoring
   - Alert on any `RoleGranted` or `RoleRevoked` events
   - Daily audit of role assignments

4. **Key Rotation:** Establish key rotation schedule
   - Quarterly review of EOA access
   - Annual Safe signer review

---

## Audit Trail

All role changes emit events:
- `RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`
- `RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)`

Query these events on-chain or via block explorer for complete audit trail.

---

*This document should be updated whenever role assignments change.*
