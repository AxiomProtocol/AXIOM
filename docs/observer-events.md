# Observer Dashboard - Event Mapping

**Version:** 1.0.0  
**Network:** Arbitrum One (42161)

This document maps smart contract events to dashboard fields and their purposes.

---

## TimelockController Events

### Contract: `AxiomTimelockController`
**Address:** `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `CallScheduled` | `id`, `index`, `target`, `value`, `data`, `predecessor`, `delay` | Timelock queue display | Governance |
| `CallExecuted` | `id`, `index`, `target`, `value`, `data` | Executed operations history | Governance |
| `CallSalt` | `id`, `salt` | Operation tracking | Governance |
| `Cancelled` | `id` | Cancelled operations | Governance |
| `MinDelayChange` | `oldDuration`, `newDuration` | Parameter change history | Governance |
| `ConfigurationLocked` | `locker`, `timestamp`, `minimumDelay` | Lock Forever status | Governance |
| `EmergencyPauseTriggered` | `guardian`, `timestamp` | Emergency events | Risk |
| `CircuitBreakerTriggered` | `triggerer`, `timestamp`, `reason` | Red flags panel | Risk |

### Event Decoding

```typescript
interface CallScheduledEvent {
  id: string;           // bytes32 operation ID
  index: number;        // uint256 call index
  target: string;       // address target contract
  value: bigint;        // uint256 ETH value
  data: string;         // bytes calldata
  predecessor: string;  // bytes32 predecessor operation
  delay: bigint;        // uint256 delay in seconds
}
```

---

## GovernanceHub Events

### Contract: `GovernanceHub`
**Address:** `0x52Dc85fd653a75323b5307f4D2629ab9A070530E`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `RoleGranted` | `role`, `account`, `sender` | Role holder tracking | Governance |
| `RoleRevoked` | `role`, `account`, `sender` | Role change history | Governance |
| `RoleAdminChanged` | `role`, `previousAdminRole`, `newAdminRole` | Admin hierarchy | Governance |
| `Paused` | `account` | Pause status | Overview, Risk |
| `Unpaused` | `account` | Resume status | Overview, Risk |
| `LendingPaused` | `account`, `timestamp` | Lending status | Risk |
| `LendingUnpaused` | `account`, `timestamp` | Lending status | Risk |

### Event Decoding

```typescript
interface RoleGrantedEvent {
  role: string;      // bytes32 role identifier
  account: string;   // address granted role
  sender: string;    // address granting role
}

// Role identifiers
const ROLES = {
  DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
  GUARDIAN_ROLE: keccak256("GUARDIAN_ROLE"),
  RISK_COMMITTEE_ROLE: keccak256("RISK_COMMITTEE_ROLE"),
  SETTLEMENT_AUTHORITY_ROLE: keccak256("SETTLEMENT_AUTHORITY_ROLE"),
  OPERATOR_ROLE: keccak256("OPERATOR_ROLE")
};
```

---

## Treasury Events

### Contract: `AxiomTreasuryAndRevenueHub`
**Address:** `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `RevenueDeposited` | `source`, `amount`, `timestamp` | Inflow tracking | Treasury |
| `FundsRouted` | `bucket`, `amount`, `timestamp` | Outflow tracking | Treasury |
| `AllocationUpdated` | `bucket`, `oldPercent`, `newPercent` | Routing rules | Treasury |
| `DrawExecuted` | `recipient`, `amount`, `purpose` | Draw history | Treasury |
| `EmergencySweep` | `token`, `amount`, `recipient` | Emergency actions | Risk |

### Event Decoding

```typescript
interface RevenueDepositedEvent {
  source: string;     // address revenue source
  amount: bigint;     // uint256 amount in wei
  timestamp: bigint;  // uint256 block timestamp
}

interface AllocationUpdatedEvent {
  bucket: number;     // uint8 bucket index (0-3)
  oldPercent: number; // uint256 old allocation %
  newPercent: number; // uint256 new allocation %
}

// Bucket indices
const BUCKETS = {
  OPERATING: 0,
  MAINTENANCE: 1,
  GROWTH: 2,
  LONG_TERM: 3
};
```

---

## Token Events

### Contract: `AxiomV2`
**Address:** `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `Transfer` | `from`, `to`, `value` | Token flows | Treasury |
| `FeeRatesUpdated` | `buyFee`, `sellFee`, `transferFee` | Fee tracking | Governance |
| `VaultAddressesUpdated` | `burn`, `staking`, `liquidity`, `treasury` | Routing config | Governance |
| `Paused` | `account` | Token pause status | Risk |
| `Unpaused` | `account` | Token resume status | Risk |

---

## Risk Config Events

### Contract: `RiskConfig`
**Address:** `0xD9a53c691B688351283Fecc33D8D9AF964A9a078`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `MaxLTVUpdated` | `oldValue`, `newValue` | LTV tracking | Risk |
| `LiquidationBonusUpdated` | `oldValue`, `newValue` | Liquidation params | Risk |
| `ExposureLimitUpdated` | `asset`, `oldLimit`, `newLimit` | Exposure caps | Risk |
| `CircuitBreakerTriggered` | `reason`, `timestamp` | Red flags | Risk |

### Contract: `DSCRRiskConfig`
**Address:** `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `DSCRThresholdUpdated` | `productId`, `oldDSCR`, `newDSCR` | DSCR requirements | Risk |
| `MaxLoanAmountUpdated` | `productId`, `oldAmount`, `newAmount` | Loan limits | Risk |

---

## Lending Events

### Contract: `FixFlipManager`
**Address:** `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `LoanOriginated` | `loanId`, `borrower`, `amount`, `rate` | Loan tracking | Assets |
| `LoanRepaid` | `loanId`, `amount`, `interest` | Revenue attribution | Assets |
| `LoanDefaulted` | `loanId`, `outstandingAmount` | Risk tracking | Risk |
| `InterestRateUpdated` | `productId`, `oldRate`, `newRate` | Rate history | Governance |

### Contract: `DSCRLoanManager`
**Address:** `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `DSCRLoanOriginated` | `loanId`, `borrower`, `amount`, `dscr` | DSCR loan tracking | Assets |
| `DSCRLoanRepaid` | `loanId`, `amount`, `interest` | Revenue attribution | Assets |
| `RefinanceCompleted` | `oldLoanId`, `newLoanId`, `terms` | BRRRR tracking | Assets |

---

## Asset Registry Events

### Contract: `AxiomScoreSBT`
**Address:** `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008`

| Event | Fields | Dashboard Use | Page |
|-------|--------|---------------|------|
| `ScoreUpdated` | `tokenId`, `oldScore`, `newScore` | Score history | Assets |
| `Transfer` | `from`, `to`, `tokenId` | SBT assignments | Assets |

---

## Event Query Patterns

### Fetching Historical Events

```typescript
// Example: Get last 100 governance events
async function getGovernanceEvents(provider: Provider): Promise<Event[]> {
  const governanceHub = new Contract(GOVERNANCE_HUB, GovernanceHubABI, provider);
  
  const filter = governanceHub.filters.RoleGranted();
  const events = await governanceHub.queryFilter(filter, -10000); // last 10k blocks
  
  return events.map(e => ({
    type: 'RoleGranted',
    role: e.args.role,
    account: e.args.account,
    sender: e.args.sender,
    blockNumber: e.blockNumber,
    transactionHash: e.transactionHash
  }));
}
```

### Aggregating Inflows/Outflows

```typescript
// Example: Calculate 30-day inflows
async function get30DayInflows(provider: Provider): Promise<bigint> {
  const treasury = new Contract(TREASURY_HUB, TreasuryABI, provider);
  const currentBlock = await provider.getBlockNumber();
  const blocksIn30Days = 30 * 24 * 60 * 4; // ~4 blocks per minute on Arbitrum
  
  const filter = treasury.filters.RevenueDeposited();
  const events = await treasury.queryFilter(filter, currentBlock - blocksIn30Days);
  
  return events.reduce((sum, e) => sum + e.args.amount, 0n);
}
```

---

## Event Indexing Strategy

### MVP Approach (Direct RPC)

```typescript
// Poll for new events every 30 seconds
setInterval(async () => {
  const newEvents = await fetchEventsSince(lastProcessedBlock);
  updateDashboardState(newEvents);
  lastProcessedBlock = currentBlock;
}, 30000);
```

### V2 Approach (Subgraph)

```graphql
# TheGraph subgraph schema
type GovernanceAction @entity {
  id: ID!
  type: String!
  actor: Bytes!
  target: Bytes
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}

type TreasuryFlow @entity {
  id: ID!
  direction: String! # "inflow" | "outflow"
  amount: BigInt!
  bucket: Int
  timestamp: BigInt!
}
```

---

## Rate Limiting Protection

| RPC Method | Max Calls/Min | Cache Strategy |
|------------|---------------|----------------|
| `eth_call` (state reads) | 100 | 30 sec cache |
| `eth_getLogs` (events) | 20 | 1 hour cache |
| `eth_blockNumber` | 60 | No cache |

---

## Proof Link Format

All events display with verifiable links:

```
Transaction: 0xabc123... → https://arbiscan.io/tx/0xabc123...
Block: 123456789 → https://arbiscan.io/block/123456789
Contract: 0xdef456... → https://arbiscan.io/address/0xdef456...
```
