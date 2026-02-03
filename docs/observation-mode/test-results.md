# Axiom Protocol - Component & Service Test Results

**Last Updated:** 2026-02-03  
**Status:** OBSERVATION WINDOW ACTIVE  
**Purpose:** Institutional transparency on implemented and verified components

---

## Executive Summary

This document provides institutional partners visibility into which components and services have been implemented, tested, and verified as functional within the Axiom Protocol platform.

| Category | Tests Passing | Coverage |
|----------|---------------|----------|
| Node Economy Contracts | 25/25 | 100% |
| Credits Ledger System | 28/28 | 100% |
| Readiness Gate System | 17/17 | 100% |
| API Endpoints | 5/5 | 100% |
| Contract ABIs | 20/20 | 100% |

---

## 1. Node Economy System

### 1.1 Smart Contract Integration Tests

**Test Suite:** `tests/node-economy-abi.test.ts`  
**Run Command:** `npm run test:node-economy`  
**Last Run:** 2026-02-02  
**Result:** 25/25 PASSING

#### NodeRegistry Contract (`0x31bc6268155219B627FC3B2d8434d010F33DCb03`)

| Function | Test Status | Description |
|----------|-------------|-------------|
| `getTotalNodeCount()` | PASS | Returns total registered nodes |
| `getActiveNodeCount(uint8)` | PASS | Returns active nodes by class |
| `getActiveNodeCount` (all 4 classes) | PASS | Storage, Execution, Indexing, Research |
| `getStakeRequirement(uint8)` | PASS | Returns stake requirements tuple |
| `areContractsConfigured()` | PASS | Returns contract configuration status |
| `getNodesByOperator(address)` | PASS | Returns node IDs for operator |
| `paused()` | PASS | Returns pause state |

#### NodeRewards Contract (`0x0c1c96F38566d056877cEf4791c701C4F5AEf362`)

| Function | Test Status | Description |
|----------|-------------|-------------|
| `getCurrentEpoch()` | PASS | Returns current epoch number |
| `epochStartTime()` | PASS | Returns epoch start timestamp |
| `globalEpochDuration()` | PASS | Returns epoch duration in seconds |
| `maxRewardsPerEpoch()` | PASS | Returns max distributable rewards |
| `getTimeUntilNextEpoch()` | PASS | Returns seconds until next epoch |
| `calculateNodeReward(uint256)` | PASS | Function exists, reverts for non-existent nodes |
| `paused()` | PASS | Returns pause state |

#### SlashingEngine Contract (`0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87`)

| Function | Test Status | Description |
|----------|-------------|-------------|
| `totalSlashed()` | PASS | Returns total slashed amount |
| `totalEscrowed()` | PASS | Returns total escrowed amount |
| `getAvailableForWithdrawal()` | PASS | Returns withdrawable amount |
| `getSlashingParams(uint8)` | PASS | Returns slashing parameters tuple |
| `getSlashingParams` (all 4 classes) | PASS | All node classes covered |
| `paused()` | PASS | Returns pause state |

### 1.2 API Endpoint Tests

| Endpoint | Test Status | Description |
|----------|-------------|-------------|
| `GET /api/observer/node-economy` | PASS | Returns full node economy data |
| API node class structure | PASS | 4 classes: storage, execution, indexing, research |
| API stakeRequirements | PASS | Returns requirements for all 4 classes |
| API slashingParams | PASS | Returns slashing params for all 4 classes |
| API contract addresses | PASS | Matches deployed contract addresses |

---

## 2. Deployed Contract Registry

### 2.1 Node Economy Contracts (Verified)

| Contract | Address | Size Verified | ABI Tested |
|----------|---------|---------------|------------|
| NodeRegistry | `0x31bc6268155219B627FC3B2d8434d010F33DCb03` | YES | YES |
| NodeRewards | `0x0c1c96F38566d056877cEf4791c701C4F5AEf362` | YES | YES |
| SlashingEngine | `0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87` | YES | YES |

### 2.2 Core Protocol Contracts (Documented)

| Contract | Address | Status |
|----------|---------|--------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | ACTIVE |
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | ACTIVE |
| TimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | ACTIVE |

See `docs/deployments.md` for complete contract registry (43 contracts documented).

---

## 3. UI Components

### 3.1 Node Economy Dashboard

**Component:** `components/observer/NodeEconomyDashboard.tsx`  
**Location:** `/operator` → Network tab  
**Status:** IMPLEMENTED & FUNCTIONAL

| Feature | Status | Description |
|---------|--------|-------------|
| Network Stats Display | FUNCTIONAL | Total nodes, active nodes, nodes by class |
| Epoch Countdown Timer | FUNCTIONAL | Live countdown to next epoch |
| Rewards Panel | FUNCTIONAL | Current epoch, duration, max rewards |
| Slashing Panel | FUNCTIONAL | Total escrowed, slashed, available for withdrawal |
| Stake Requirements Table | FUNCTIONAL | All 4 node classes with requirements |
| Contract Links | FUNCTIONAL | Direct links to Blockscout |
| Auto-refresh | FUNCTIONAL | 30-second refresh interval |
| Public Access | FUNCTIONAL | No wallet required |

### 3.2 Readiness Gate Dashboard

**Component:** `components/observer/ReadinessGateDashboard.tsx`  
**Location:** `/operator` → Network tab  
**Status:** IMPLEMENTED & FUNCTIONAL

| Feature | Status | Description |
|---------|--------|-------------|
| Readiness Status | FUNCTIONAL | Overall ready/not ready indicator |
| Observation Period Check | FUNCTIONAL | Days elapsed vs required |
| System Uptime Check | FUNCTIONAL | Uptime percentage vs minimum |
| Incident Count Check | FUNCTIONAL | Current incidents vs max allowed |
| TVL Threshold Check | FUNCTIONAL | Current TVL vs minimum required |
| Freeze Status Display | FUNCTIONAL | Shows if freeze window is active |
| Attestation Freshness | FUNCTIONAL | Time remaining on attestation validity |
| Progress Bar | FUNCTIONAL | Visual indicator of passed checks |
| Contract Link | FUNCTIONAL | Direct link to Blockscout |
| Auto-refresh | FUNCTIONAL | 30-second refresh interval |

### 3.3 Operator Portal

**Page:** `pages/operator.tsx`  
**Status:** IMPLEMENTED & FUNCTIONAL

| Tab | Status | Wallet Required |
|-----|--------|-----------------|
| Apply | FUNCTIONAL | YES |
| Status | FUNCTIONAL | YES |
| Rewards | FUNCTIONAL | YES |
| Network | FUNCTIONAL | NO (public) |
| Documentation | FUNCTIONAL | NO (public) |

---

## 4. Database Schema

### 4.1 Node Operator Tables

| Table | Status | Purpose |
|-------|--------|---------|
| `node_operators` | ACTIVE | Operator registration and status |
| `operator_rewards` | ACTIVE | Reward tracking per operator |
| `node_onboarding` | ACTIVE | Onboarding progress tracking |
| `node_chain_sync` | ACTIVE | On-chain synchronization status |
| `admin_audit_logs` | ACTIVE | Admin action audit trail |

### 4.2 Authentication Tables

| Table | Status | Purpose |
|-------|--------|---------|
| `siwe_nonces` | ACTIVE | SIWE authentication nonces |
| `wallet_sessions` | ACTIVE | Wallet session management |

---

## 5. Service Layer

### 5.1 Node Economy Service

**Location:** `lib/contracts/node-economy/service.ts`  
**Status:** IMPLEMENTED & TESTED

| Method | Status | Description |
|--------|--------|-------------|
| `getNetworkStats()` | FUNCTIONAL | Fetches all network statistics |
| `getTotalNodeCount()` | FUNCTIONAL | Total registered nodes |
| `getActiveNodeCount(class)` | FUNCTIONAL | Active nodes by class |
| `getStakeRequirement(class)` | FUNCTIONAL | Stake requirements by class |
| `getSlashingParams(class)` | FUNCTIONAL | Slashing parameters by class |
| `getCurrentEpoch()` | FUNCTIONAL | Current epoch number |
| `getEpochInfo()` | FUNCTIONAL | Full epoch information |

### 5.2 Email Service (Resend Integration)

**Location:** `lib/email/`  
**Status:** CONFIGURED

| Feature | Status |
|---------|--------|
| Operator status notifications | FUNCTIONAL |
| Admin email sending | FUNCTIONAL |
| Custom email templates | FUNCTIONAL |

---

## 6. Running Tests

### 6.1 Available Test Commands

```bash
# Node Economy ABI Integration Tests
npm run test:node-economy

# Hardhat Contract Tests
npm run test

# Invariant Tests
npm run test:invariants

# Scenario Tests
npm run test:scenarios
```

### 6.2 Test Environment

- **Network:** Arbitrum One (Chain ID: 42161)
- **RPC Provider:** Alchemy API
- **Test Framework:** Custom TypeScript runner with ethers.js
- **API Base URL:** http://localhost:5000

---

## 7. Verification Links

All contracts can be independently verified on Blockscout:

| Contract | Verification Link |
|----------|-------------------|
| NodeRegistry | [View on Blockscout](https://arbitrum.blockscout.com/address/0x31bc6268155219B627FC3B2d8434d010F33DCb03) |
| NodeRewards | [View on Blockscout](https://arbitrum.blockscout.com/address/0x0c1c96F38566d056877cEf4791c701C4F5AEf362) |
| SlashingEngine | [View on Blockscout](https://arbitrum.blockscout.com/address/0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87) |

---

## 8. Credits Ledger System

### 8.1 Credits Ledger API Tests

**Test Suite:** `tests/credits-ledger.test.ts`  
**Run Command:** `npx tsx tests/credits-ledger.test.ts`  
**Last Run:** 2026-02-03  
**Result:** 28/28 PASSING

#### Operator Credits Endpoints

| Endpoint | Method | Test Status | Description |
|----------|--------|-------------|-------------|
| `/api/operator/credits` | GET | PASS | Returns 400 without wallet parameter |
| `/api/operator/credits` | GET | PASS | Returns 404 for non-existent operator |
| `/api/operator/credits` | POST | PASS | Wallet and amount validation |

#### Admin Credits Endpoints

| Endpoint | Method | Test Status | Description |
|----------|--------|-------------|-------------|
| `/api/admin/credits` | GET | PASS | Admin authentication required |
| `/api/admin/credits` | GET | PASS | Returns ledgers with summary |
| `/api/admin/credits/accrue` | POST | PASS | Admin auth + operatorId validation |
| `/api/admin/credits/adjust` | POST | PASS | Admin auth + reason validation |
| `/api/admin/credits/sync` | POST | PASS | Admin auth + operatorId/syncAll validation |

#### Schema Validation

| Field | Test Status | Description |
|-------|-------------|-------------|
| `summary.totalAvailable` | PASS | Aggregate available balance |
| `summary.totalPending` | PASS | Aggregate pending balance |
| `summary.totalEarned` | PASS | Aggregate total earned |
| `summary.totalRedeemed` | PASS | Aggregate total redeemed |
| `summary.totalSlashed` | PASS | Aggregate total slashed |
| `summary.operatorCount` | PASS | Total operators with ledgers |
| `pagination.limit` | PASS | Limit parameter respected |
| `pagination.offset` | PASS | Offset parameter respected |
| `pagination.hasMore` | PASS | Pagination continuation flag |

### 8.2 Database Tables

| Table | Status | Description |
|-------|--------|-------------|
| `credits_ledger` | CREATED | Operator credit balances |
| `credits_transactions` | CREATED | Transaction history |
| `onchain_rewards_sync` | CREATED | On-chain sync tracking |

---

## 9. Readiness Gate System

### 9.1 Readiness Gate Contract Tests

**Test Suite:** `tests/readiness-gate.test.ts`  
**Run Command:** `npm run test:readiness-gate`  
**Last Run:** 2026-02-03  
**Result:** 17/17 PASSING

#### Contract Tests

| Test | Status | Description |
|------|--------|-------------|
| Contract address valid | PASS | CapitalReadinessGate at 0xc3f798066e1401aa30Da8703A4c0588A1076ff39 |
| checkReadiness() | PASS | Returns boolean and message string |
| getObservationDaysElapsed() | PASS | Returns observation period progress |
| getConfig() | PASS | Returns configuration struct |
| checkFreezeStatus() | PASS | Returns freeze window state |
| maxAttestationStaleness() | PASS | Returns max staleness duration |
| paused() | PASS | Returns pause state |

#### API Endpoint Tests

| Test | Status | Description |
|------|--------|-------------|
| isReady property | PASS | Overall readiness status |
| observationDaysElapsed | PASS | Days in observation period |
| freezeStatus | PASS | Freeze window information |
| attestationFreshness | PASS | Attestation validity time |
| config object | PASS | Gate configuration data |
| paused boolean | PASS | Contract pause state |
| GET returns 200 | PASS | Endpoint accessible |

#### Service Integration Tests

| Test | Status | Description |
|------|--------|-------------|
| Contract in config | PASS | CAPITAL_READINESS_GATE in NODE_ECONOMY_CONTRACTS |
| Service instance | PASS | getNodeEconomyService returns singleton |
| getReadinessStatus() | PASS | Returns valid readiness data |

### 9.2 Readiness Gate Contract

| Contract | Address | Verified |
|----------|---------|----------|
| CapitalReadinessGate | [0xc3f798066e1401aa30Da8703A4c0588A1076ff39](https://arbitrum.blockscout.com/address/0xc3f798066e1401aa30Da8703A4c0588A1076ff39) | Yes |

---

## 10. Institutional Contact

For technical due diligence inquiries regarding test results or system verification, please contact the AXIOM Protocol technical team.

---

*This document is part of the governance hardening observation window documentation.*
*Updated automatically as new components are tested and verified.*
