# Axiom Protocol - Module to Contract Mapping

This document provides line-by-line mapping from functional modules to implementing contracts.

---

## Module 1: Treasury Core

### 1.1 AxiomTreasuryAndRevenueHub
**File:** `contracts/` (deployed, source in legacy archive)  
**Address:** `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `depositRevenue()` | Revenue intake from modules | `nonReentrant` |
| `routeToVault()` | Route funds to designated vault | `onlyRole(OPERATOR)` |
| `setAllocation()` | Set BPS allocation per stream | `onlyRole(ADMIN)` |
| `emergencySweep()` | Emergency fund extraction | `onlyRole(ADMIN)` |

**Storage Variables:**
- `vaults`: mapping(bytes32 => address) - vault addresses by stream ID
- `allocations`: mapping(bytes32 => uint256) - BPS allocations

**Events:**
- `RevenueDeposited(address indexed from, uint256 amount, bytes32 streamId)`
- `FundsRouted(bytes32 indexed streamId, address vault, uint256 amount)`

---

### 1.2 AxiomV2 (Token with Treasury Routing)
**File:** `contracts/AxiomV2.sol`  
**Address:** `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `_transfer()` | 180-220 | Transfer with fee routing | internal |
| `setFeeRates()` | 280-295 | Configure fee distribution | `onlyRole(ADMIN)` |
| `setVaultAddresses()` | 300-320 | Configure vault destinations | `onlyRole(ADMIN)` |

**Storage Variables:**
- `burnVault`: address - destination for burn fees
- `stakingVault`: address - staking rewards destination
- `liquidityVault`: address - liquidity pool destination
- `dividendVault`: address - dividend distribution destination
- `treasuryVault`: address - treasury accumulation

**Fee Structure (BPS):**
- Burn: configurable
- Staking: configurable
- Liquidity: configurable
- Dividend: configurable
- Treasury: configurable

---

## Module 3: Reserve Buckets

### 3.1 BackstopVault (AXUSD)
**File:** `contracts/stablecoin/core/BackstopVault.sol`  
**Lines:** 1-180

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `deposit()` | 45-65 | Add reserves | `nonReentrant` |
| `withdraw()` | 70-90 | Remove reserves | `onlyRole(ADMIN)` |
| `coverShortfall()` | 95-115 | Cover AXUSD undercollateralization | `onlyRole(OPERATOR)` |

**Storage Variables:**
- `totalReserves`: uint256
- `reserveToken`: IERC20
- `axusd`: address

---

### 3.2 SusuInsuranceFund
**File:** (deployed)  
**Address:** `0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `divertNodeRewards()` | 5% diversion from node rewards | `onlyRole(OPERATOR)` |
| `submitClaim()` | Submit insurance claim | `nonReentrant` |
| `approveClaim()` | Approve claim payout | `onlyRole(ADMIN)` |
| `directContribute()` | Direct fund contribution | `nonReentrant` |

---

## Module 5: Admin Role Separation

All contracts implement OpenZeppelin `AccessControl` with these standard roles:

| Role | Bytes32 Hash | Purpose |
|------|--------------|---------|
| `DEFAULT_ADMIN_ROLE` | `0x00` | Full administrative access |
| `OPERATOR_ROLE` | `keccak256("OPERATOR_ROLE")` | Day-to-day operations |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | Emergency pause capability |
| `REGISTRAR_ROLE` | `keccak256("REGISTRAR_ROLE")` | Registration/verification |
| `MINTER_ROLE` | `keccak256("MINTER_ROLE")` | Token minting (where applicable) |

---

## Module 6: Emergency Controls

### Standard Pause Pattern (All Contracts)

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `pause()` | Halt all operations | `onlyRole(PAUSER_ROLE)` |
| `unpause()` | Resume operations | `onlyRole(ADMIN)` |

**Protected Functions:** All state-changing functions use `whenNotPaused` modifier.

---

## Module 7: Liquidity Deployment

### 7.1 AxiomExchangeHubV2
**File:** `contracts/AxiomExchangeHubV2.sol` (920 lines)  
**Address:** `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28`

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `addLiquidity()` | 150-200 | Add LP position | `nonReentrant`, `whenNotPaused` |
| `removeLiquidity()` | 205-250 | Remove LP position | `nonReentrant` |
| `swap()` | 260-320 | Execute swap | `nonReentrant`, `whenNotPaused` |
| `createPool()` | 100-140 | Create new trading pair | `onlyRole(ADMIN)` |

**Storage Variables:**
- `pools`: mapping(bytes32 => Pool)
- `lpTokens`: mapping(bytes32 => address)
- `fees`: FeeConfig

### 7.2 AxiomLPStaking
**File:** `contracts/dex/AxiomLPStaking.sol`  
**Address:** `0x066623787044440015f7Ea2eC04cA58126cA00a5`

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `stake()` | 80-110 | Stake LP tokens | `nonReentrant`, `whenNotPaused` |
| `unstake()` | 115-145 | Unstake LP tokens | `nonReentrant` |
| `claimRewards()` | 150-180 | Claim pending rewards | `nonReentrant` |
| `setRewardRate()` | 200-220 | Configure reward rate | `onlyRole(ADMIN)` |

---

## Module 8: Yield Accounting

### 8.1 AxiomStakingAndEmissionsHub
**Address:** `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `stake()` | Stake tokens in pool | `nonReentrant`, `whenNotPaused` |
| `unstake()` | Withdraw staked tokens | `nonReentrant` |
| `claimRewards()` | Claim accumulated rewards | `nonReentrant` |
| `setRewardRate()` | Adjust emission rate | `onlyRole(ADMIN)` |
| `fundRewards()` | Add reward tokens | `onlyRole(OPERATOR)` |

### 8.2 veAXM (Vote-Escrowed AXM)
**Address:** `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `lock()` | Lock AXM for veAXM | `nonReentrant` |
| `extend()` | Extend lock duration | `nonReentrant` |
| `increase()` | Increase locked amount | `nonReentrant` |
| `withdraw()` | Withdraw after lock expires | `nonReentrant` |
| `balanceOfAt()` | Historical balance query | view |
| `checkpoint()` | Update decay calculations | public |

---

## Module 9: Drawdown Protection

### 9.1 CreditLineVault
**File:** `contracts/phase3/CreditLineVault.sol`  
**Address:** `0xc997416666686A22EBAE8Eb7cc9224c10B08a35c`

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `depositCollateral()` | 80-120 | Add collateral | `nonReentrant`, `whenNotPaused` |
| `withdrawCollateral()` | 125-160 | Remove collateral | `nonReentrant` |
| `borrow()` | 165-210 | Draw credit line | `nonReentrant`, `whenNotPaused` |
| `repay()` | 215-250 | Repay borrowed amount | `nonReentrant` |
| `liquidate()` | 255-300 | Liquidate undercollateralized position | `nonReentrant` |
| `getHealthFactor()` | 305-320 | Calculate position health | view |

**Collateral Types & LTV:**
- AXM: 50% LTV
- SEED: 40% LTV
- LP Tokens: 60% LTV
- Land NFT: 40% LTV

### 9.2 Liquidator (AXUSD)
**File:** `contracts/stablecoin/core/Liquidator.sol`

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `liquidate()` | 40-80 | Liquidate vault | `nonReentrant` |
| `setLiquidationBonus()` | 85-95 | Configure bonus | `onlyRole(ADMIN)` |

---

## Module 10: Asset Registry

### 10.1 AxiomLandAndAssetRegistry
**Address:** `0xaB15907b124620E165aB6E464eE45b178d8a6591`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `registerParcel()` | Register land parcel | `onlyRole(REGISTRAR)` |
| `updateParcel()` | Update parcel metadata | `onlyRole(REGISTRAR)` |
| `linkFractionalToken()` | Link to tokenized shares | `onlyRole(ADMIN)` |
| `activateParcel()` | Enable parcel | `onlyRole(ADMIN)` |
| `deactivateParcel()` | Disable parcel | `onlyRole(ADMIN)` |

### 10.2 AxiomScoreSBT
**Address:** `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `mint()` | Issue credit score SBT | `onlyRole(MINTER)` |
| `updateScore()` | Update credit score (300-850) | `onlyRole(OPERATOR)` |
| `recordPayment()` | Track payment history | `onlyRole(OPERATOR)` |

**Score Tiers:**
- Excellent: 750-850
- Good: 670-749
- Fair: 580-669
- Poor: 300-579

---

## Module 11: Revenue Attribution

### 11.1 AxiomV2 Fee Distribution
**File:** `contracts/AxiomV2.sol`

**Fee Flow (on transfer):**
```
Transfer Amount
    ├── Burn Fee (BPS) → burnVault
    ├── Staking Fee (BPS) → stakingVault
    ├── Liquidity Fee (BPS) → liquidityVault
    ├── Dividend Fee (BPS) → dividendVault
    └── Treasury Fee (BPS) → treasuryVault
```

### 11.2 AxiomFeeBurner
**Address:** `0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94`

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `collectFees()` | Aggregate protocol fees | `nonReentrant` |
| `executeBuyback()` | Buy AXM from DEX | `onlyRole(OPERATOR)` |
| `burnAndDistribute()` | Burn 50%, distribute 50% to veAXM | `onlyRole(OPERATOR)` |

---

## Module 12: Lifecycle Tracking

### 12.1 AxiomSusuHub
**File:** `contracts/AxiomSusuHub.sol`  
**Address:** `0x6C69D730327930B49A7997B7b5fb0865F30c95A5`

**Pool States:**
1. `FORMING` - Collecting members
2. `ACTIVE` - Cycle in progress
3. `COMPLETED` - All cycles complete
4. `CANCELLED` - Pool terminated early

| Function | Line Range | Purpose | Modifiers |
|----------|------------|---------|-----------|
| `createPool()` | 120-180 | Create SUSU pool | `nonReentrant`, `whenNotPaused` |
| `joinPool()` | 185-230 | Join as member | `nonReentrant` |
| `contribute()` | 235-280 | Make cycle contribution | `nonReentrant` |
| `claimPayout()` | 285-330 | Claim winning payout | `nonReentrant` |
| `advanceCycle()` | 335-380 | Move to next cycle | `nonReentrant` |
| `ejectMember()` | 385-420 | Remove delinquent member | `onlyRole(OPERATOR)` |
| `cancelPool()` | 425-460 | Cancel and refund | `onlyRole(ADMIN)` |

### 12.2 TreasuryNoteToken
**File:** `contracts/phase3/TreasuryNoteToken.sol`  
**Address:** `0x712640Fde009a7FB0c3668e9eFb9AD5Bf67bEAbd`

**Note Series:**
| ID | Duration | Coupon Rate |
|----|----------|-------------|
| 1 | 6 months | 6% APY |
| 2 | 12 months | 8% APY |
| 3 | 24 months | 10% APY |
| 4 | 36 months | 12% APY |

| Function | Purpose | Modifiers |
|----------|---------|-----------|
| `purchase()` | Buy treasury notes | `nonReentrant`, KYC verified |
| `claimCoupon()` | Claim interest payment | `nonReentrant` |
| `redeem()` | Redeem at maturity | `nonReentrant` |
| `verifyInvestor()` | KYC/accredited verification | `onlyRole(REGISTRAR)` |
