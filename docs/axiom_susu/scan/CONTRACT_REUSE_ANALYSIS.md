# Axiom Contract Reuse Analysis for SUSU Features

**Analysis Date:** December 21, 2025  
**Prepared By:** Smart Contract Reuse Mandate  
**Objective:** Identify reusable primitives across all 24 Axiom contracts for SUSU functionality

---

## Executive Summary

**CRITICAL FINDING: AxiomSusuHub (Contract #24) already implements comprehensive SUSU/ROSCA functionality.**

The existing AxiomSusuHub contract at `0x6C69D730327930B49A7997B7b5fb0865F30c95A5` provides:
- Complete group/roster management (2-50 members)
- Cycle-based scheduling (1-90 days per cycle)
- Pooled contributions with ERC20 token support
- Sequential or randomized payout rotation
- Protocol fee routing to treasury
- Grace periods and late payment penalties
- Emergency pause capabilities
- Comprehensive event logging

**Recommendation:** Any new SUSU features should be built as extensions or wrappers around the existing AxiomSusuHub contract, NOT as new standalone contracts.

---

## SUSU Primitive Requirements Checklist

| Primitive | Required For | Status |
|-----------|--------------|--------|
| a) Group/roster management | Member enrollment | ✅ AxiomSusuHub |
| b) Schedules/epochs/cycles | Contribution timing | ✅ AxiomSusuHub |
| c) Pooled contributions/escrow | Fund collection | ✅ AxiomSusuHub |
| d) Payout/rotation logic | Distribution | ✅ AxiomSusuHub |
| e) Receipt-like event emission | Auditing | ✅ AxiomSusuHub |
| f) Permissioning (organizers/participants) | Access control | ✅ AxiomSusuHub |
| g) Template/factory patterns | Pool creation | ✅ AxiomSusuHub.createPool() |
| h) Dispute hooks/state flags | Conflict resolution | ⚠️ Partial (MemberStatus.Ejected) |
| i) Metadata storage (IPFS/CID) | Off-chain data | ❌ Not in AxiomSusuHub |

---

## Contract-by-Contract Analysis

### 1. AxiomV2 (AXM Token) - contracts/AxiomV2.sol

**Purpose:** ERC20 governance token with fee routing and compliance hooks

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | ERC20 token transfer | AxiomSusuHub already uses IERC20.safeTransferFrom() |
| ✅ Yes | Fee exemption mappings | Can exempt SUSU pools from transfer fees |
| ✅ Yes | Treasury vault routing | Fees already route to treasuryVault |
| ❌ No | Demurrage/burn mechanics | Not applicable to SUSU |

**Functions to Call:**
- `transfer()`, `transferFrom()`, `approve()` - Standard ERC20 for contributions
- `isFeeExempt(address)` - Check if SUSU contract is fee exempt

**Gaps:** None - fully compatible

---

### 2. AxiomIdentityComplianceHub - Interface Only

**Purpose:** Identity verification and compliance checking

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Role-based access | Can verify organizer credentials |
| ⚠️ Maybe | KYC status check | Could gate pool membership to verified users |

**Available Functions (interface only):**
- `hasRole(bytes32 role, address account)` - Check if user has specific role

**Gaps:** Full source not available; cannot assess membership verification features

---

### 3. AxiomTreasuryAndRevenueHub - Interface Only

**Purpose:** Treasury management and revenue distribution

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | Fee collection | AxiomSusuHub routes protocolFee to treasuryVault |
| ⚠️ Maybe | Vault management | Could store SUSU escrow in designated vaults |

**Available Functions (interface only):**
- `setVault(bytes32 vaultId, address vaultAddress)` - Configure fee destinations

**Gaps:** Full source not available; revenue routing already handled by AxiomSusuHub

---

### 4. AxiomStakingAndEmissionsHub - Interface Only

**Purpose:** Token staking and rewards distribution

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Reward distribution | Could incentivize consistent SUSU contributors |
| ❌ No | Staking mechanics | SUSU contributions are not staking |

**Available Functions (interface only):**
- `fundRewards(uint256 poolId, uint256 amount)` - Fund reward pools

**Gaps:** Not directly applicable to SUSU core functionality

---

### 5. CitizenCredentialRegistry - contracts/CitizenCredentialRegistry.sol

**Purpose:** Decentralized identity and credential management

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | Citizen identity | Verify SUSU participants are registered citizens |
| ✅ Yes | Verification levels | Gate premium pools to Verified/Premium citizens |
| ✅ Yes | Credential status | Check KYC/residency before pool enrollment |
| ⚠️ Maybe | metadataURI (IPFS) | Could link to SUSU membership metadata |

**Functions to Call:**
- `citizens(uint256 citizenId)` - Get citizen profile
- `addressToCitizenId(address)` - Map wallet to citizen ID
- `credentials(uint256 credentialId)` - Verify specific credentials
- `authorizedServices` mapping - Register AxiomSusuHub as authorized

**Integration Example:**
```solidity
function joinPool(uint256 poolId) external {
    uint256 citizenId = citizenRegistry.addressToCitizenId(msg.sender);
    require(citizenId > 0, "Must be registered citizen");
    // ... existing join logic
}
```

**Gaps:** None - can be integrated for enhanced member verification

---

### 6. AxiomLandAndAssetRegistry - Interface Only

**Purpose:** Real estate and asset tokenization

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Land registration | Not applicable to SUSU |
| ❌ No | Asset tokenization | SUSU pools don't involve assets |

**Gaps:** Not relevant to SUSU

---

### 7. LeaseAndRentEngine - contracts/LeaseAndRentEngine.sol

**Purpose:** Rent-to-own and lease management (KeyGrow)

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Escrow patterns | Similar escrow structure, but purpose-built for real estate |
| ⚠️ Maybe | Payment tracking | PaymentRecord struct similar to CycleContribution |
| ⚠️ Maybe | Equity accumulation | Could inspire SUSU "savings progress" tracking |
| ❌ No | Property ownership | Not applicable |

**Pattern Analysis:**
- `EscrowBalance` struct: Similar to tracking pooled funds
- `PaymentRecord` struct: Similar to `CycleContribution`
- `missedPayments` tracking: Already in AxiomSusuHub

**Gaps:** Patterns are already implemented in AxiomSusuHub; no reuse needed

---

### 8. RealtorModule - contracts/RealtorModule.sol

**Purpose:** Real estate transactions and realtor commissions

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Transaction escrow | TransactionStatus enum similar to pool states |
| ❌ No | Realtor management | Not applicable |
| ❌ No | Property listings | Not applicable |

**Gaps:** Transaction escrow pattern already in AxiomSusuHub

---

### 9. CapitalPoolsAndFunds - contracts/CapitalPoolsAndFunds.sol

**Purpose:** Investment fund management

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | Fund struct | Similar pool structure with members and shares |
| ✅ Yes | Investment tracking | Similar to tracking SUSU contributions |
| ⚠️ Maybe | Yield distribution | Could inspire SUSU bonus/incentive distribution |
| ⚠️ Maybe | Withdrawal queues | Could handle late contributor situations |

**Relevant Patterns:**
- `Fund` struct with memberCount, totalCapital, lockupPeriod
- `Investment` struct tracking individual positions
- `YieldDistribution` for periodic distributions
- `WithdrawalRequest` for managed exits

**Functions Potentially Reusable:**
- `distributeYield()` pattern for payout distribution
- Lockup period enforcement

**Gaps:** Patterns overlap with AxiomSusuHub; may inspire future enhancements

---

### 10. UtilityAndMeteringHub - contracts/UtilityAndMeteringHub.sol

**Purpose:** Smart city utility management

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Billing periods | Similar to SUSU cycle durations |
| ⚠️ Maybe | Bill status enum | Similar to pool/cycle status |
| ❌ No | Meter readings | Not applicable |
| ❌ No | Utility accounts | Not applicable |

**Gaps:** Billing patterns already in AxiomSusuHub

---

### 11. TransportAndLogisticsHub - contracts/TransportAndLogisticsHub.sol

**Purpose:** Transportation and logistics

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Driver/ride management | Not applicable |
| ❌ No | Route management | Not applicable |

**Gaps:** Not relevant to SUSU

---

### 12. DePINNodeSuite - contracts/DePINNodeSuite.sol

**Purpose:** DePIN node management and leasing

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Lease revenue sharing | Similar distribution pattern |
| ⚠️ Maybe | Performance tracking | Could inspire contributor reliability scoring |
| ❌ No | Node registration | Not applicable |
| ❌ No | Staking/slashing | Not applicable to SUSU |

**Gaps:** Patterns already in AxiomSusuHub

---

### 13. DePINNodeSales - contracts/DePINNodeSales.sol

**Purpose:** Node sales with dual payment options

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Node purchases | Not applicable |
| ⚠️ Maybe | Dual token payment | Could allow SUSU pools in multiple tokens |

**Gaps:** AxiomSusuHub already supports any ERC20 token

---

### 14. CrossChainAndLaunchModule - contracts/CrossChainAndLaunchModule.sol

**Purpose:** Cross-chain bridging

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Bridge transfers | Not applicable to SUSU |
| ❌ No | Multi-chain deployment | Not applicable |

**Gaps:** Not relevant to SUSU

---

### 15. AxiomExchangeHub (DEX) - contracts/AxiomExchangeHub.sol

**Purpose:** Automated market maker (AMM)

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Price oracle | Could value SUSU pool contributions in USD |
| ❌ No | Liquidity pools | Different purpose than SUSU |
| ❌ No | Swap mechanics | Not applicable |

**Gaps:** Not directly relevant; pricing already handled by contribution amounts

---

### 16. CitizenReputationOracle - contracts/CitizenReputationOracle.sol

**Purpose:** Credit scoring and reputation system

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | Reputation profiles | Score SUSU contributors based on payment history |
| ✅ Yes | Payment history | Track on-time vs late SUSU contributions |
| ✅ Yes | Credit score | Adjust based on SUSU participation |
| ⚠️ Maybe | Dispute resolution | DisputeStatus enum for SUSU disputes |

**Functions to Call:**
- `profiles(address)` - Get citizen reputation
- `paymentHistories(address)` - Track payment behavior
- `recordPayment()` pattern - Record SUSU contribution

**Integration Example:**
```solidity
function contribute(uint256 poolId) external {
    // ... contribution logic
    reputationOracle.reportPositiveAction(msg.sender, "SUSU_CONTRIBUTION", 10);
}
```

**Gaps:** Dispute resolution could be extended for SUSU-specific disputes

---

### 17. IoTOracleNetwork - contracts/IoTOracleNetwork.sol

**Purpose:** IoT sensor data collection

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Device registration | Not applicable |
| ❌ No | Sensor data | Not applicable |

**Gaps:** Not relevant to SUSU

---

### 18. MarketsAndListingsHub - contracts/MarketsAndListingsHub.sol

**Purpose:** Wall Street RWA marketplace

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Escrow balances | escrowBalances mapping pattern |
| ⚠️ Maybe | Order matching | Not applicable |
| ❌ No | Asset listings | Not applicable |

**Gaps:** Escrow pattern already in AxiomSusuHub

---

### 18. OracleAndMetricsRelay - contracts/OracleAndMetricsRelay.sol

**Purpose:** Price feeds and metrics aggregation

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ⚠️ Maybe | Price feeds | Could value pool contributions |
| ❌ No | Metric relay | Not applicable |

**Gaps:** Not directly relevant

---

### 19. CommunitySocialHub - contracts/CommunitySocialHub.sol

**Purpose:** Social networking and community groups

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | Group struct | Model for SUSU interest groups |
| ✅ Yes | Group membership | groupMembers mapping pattern |
| ✅ Yes | Member tracking | groupMemberList array pattern |
| ⚠️ Maybe | Moderation | isBanned mapping for bad actors |

**Functions/Patterns to Reuse:**
- `Group` struct with creator, memberCount, isPublic
- `groupMembers` mapping for membership checks
- `createGroup()`, `joinGroup()` function patterns

**Integration Example:**
```solidity
// Link SUSU pools to social groups for discovery
function linkPoolToGroup(uint256 poolId, uint256 groupId) external;
```

**Gaps:** Already implemented in AxiomSusuHub with Pool/Member structs

---

### 20. AxiomAcademyHub - contracts/AxiomAcademyHub.sol

**Purpose:** Educational platform

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Course management | Not applicable |
| ⚠️ Maybe | Certification | Could certify SUSU organizers |
| ❌ No | Learning modules | Not applicable |

**Gaps:** Not directly relevant

---

### 21. GamificationHub - contracts/GamificationHub.sol

**Purpose:** Achievements and gamification

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ✅ Yes | Achievement system | Award badges for SUSU completion |
| ✅ Yes | Quest tracking | Track SUSU participation goals |
| ⚠️ Maybe | Leaderboards | Rank consistent contributors |
| ⚠️ Maybe | Points/XP | Reward SUSU participation |

**Functions to Call:**
- `issueAchievement()` - Award SUSU completion badges
- `startQuest()` - Track "Complete 12 SUSU cycles" goals
- `updateProgress()` - Track contribution progress

**Integration Example:**
```solidity
function _processPayout(uint256 poolId) internal {
    // ... existing payout logic
    gamificationHub.issueAchievement(recipient, SUSU_PAYOUT_ACHIEVEMENT);
}
```

**Gaps:** None - can be integrated for member engagement

---

### 22. SustainabilityHub - contracts/SustainabilityHub.sol

**Purpose:** Carbon credits and sustainability

**SUSU Relevance:**
| Reusable | Feature | Integration Plan |
|----------|---------|------------------|
| ❌ No | Carbon credits | Not applicable |
| ❌ No | Environmental metrics | Not applicable |

**Gaps:** Not relevant to SUSU

---

### 23-24. AxiomSusuHub - contracts/AxiomSusuHub.sol

**Purpose:** ROSCA/SUSU rotating savings pools

**THIS IS THE PRIMARY SUSU CONTRACT - ALL PRIMITIVES IMPLEMENTED**

**Implemented Features:**
| Primitive | Implementation | Status |
|-----------|----------------|--------|
| Group management | Pool struct, poolMembers mapping | ✅ Complete |
| Schedules/cycles | cycleDuration, currentCycle, totalCycles | ✅ Complete |
| Pooled contributions | contribute(), cycleContributions mapping | ✅ Complete |
| Payout rotation | payoutOrder mapping, processPayout() | ✅ Complete |
| Event emission | 12 comprehensive events | ✅ Complete |
| Permissioning | ADMIN_ROLE, TREASURY_ROLE, POOL_MANAGER_ROLE | ✅ Complete |
| Factory pattern | createPool() with full customization | ✅ Complete |
| Dispute hooks | MemberStatus.Ejected, exitPool() | ⚠️ Basic |
| Metadata storage | Not implemented | ❌ Gap |

**Events Emitted:**
- `PoolCreated`, `PoolStarted`, `PoolCompleted`, `PoolCancelled`
- `MemberJoined`, `MemberExited`, `MemberEjected`
- `ContributionMade`, `PayoutProcessed`, `CycleAdvanced`
- `TreasuryVaultUpdated`, `DefaultParametersUpdated`

**Gaps Identified:**
1. **Metadata URI:** No IPFS/CID storage for pool descriptions or terms
2. **Dispute Resolution:** Basic ejection only; no formal dispute process
3. **Regional Discovery:** No on-chain grouping by region/purpose (handled off-chain in DB)

---

## Reuse Summary Matrix

| Contract | Directly Reusable | Partial/Inspiration | Not Applicable |
|----------|-------------------|---------------------|----------------|
| AxiomSusuHub | ✅✅✅ PRIMARY | - | - |
| AxiomV2 | ✅ Token transfers | - | - |
| CitizenCredentialRegistry | ✅ Member verification | - | - |
| CitizenReputationOracle | ✅ Payment scoring | ⚠️ Disputes | - |
| GamificationHub | ✅ Achievements | ⚠️ Quests | - |
| CommunitySocialHub | - | ⚠️ Group patterns | - |
| CapitalPoolsAndFunds | - | ⚠️ Fund patterns | - |
| All Others | - | - | ❌ |

---

## Conclusion: New Contract Requirements

**NO NEW CONTRACTS REQUIRED for core SUSU functionality.**

The existing AxiomSusuHub contract provides complete ROSCA implementation with:
- Pool creation and membership management
- Cycle-based contribution collection
- Automated payout rotation
- Protocol fee collection
- Emergency controls

### Potential Enhancements (Extensions, Not New Contracts)

If additional features are needed, they should be implemented as:

1. **Off-chain Wrappers:** Regional Interest Hubs (already in DB schema)
2. **Integration Calls:** Link AxiomSusuHub to CitizenReputationOracle
3. **Gamification Hooks:** Call GamificationHub on pool completion
4. **Metadata Extension:** Add optional metadataURI to Pool struct (v2 upgrade)

### If New Contract is Truly Required

Follow the CHANGE_PROPOSAL.md process in `docs/axiom_susu/contracts/` documenting:
- Which existing contracts were evaluated (all 24 above)
- Why reuse is insufficient (cite specific missing function/event)
- Minimal scope of new contract
- Security assumptions and threat model
- Test plan

---

## Appendix: AxiomSusuHub Key Functions

```solidity
// Pool Management
function createPool(...) external returns (uint256 poolId);
function joinPool(uint256 poolId) external;
function addPredefinedMembers(uint256 poolId, address[] calldata members) external;
function startPool(uint256 poolId) external;

// Contributions
function contribute(uint256 poolId) external;

// Payouts
function processPayout(uint256 poolId) external;

// Member Management
function exitPool(uint256 poolId) external;
function ejectMember(uint256 poolId, address member) external;

// Admin
function pause() external;
function unpause() external;
function setTreasuryVault(address vault) external;
function setDefaultParameters(...) external;
```

**Deployed Address:** `0x6C69D730327930B49A7997B7b5fb0865F30c95A5`
