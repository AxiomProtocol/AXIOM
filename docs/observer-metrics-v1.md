# Institutional Observer - Metrics v1 Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-26  
**Status:** MVP-Ready  
**Dashboard:** `/observer`

---

## Purpose

This document defines the **Institutional Metrics v1** for the Observer Dashboard, including:
- Metric definitions (how computed, source events/state)
- Risk rationale (why it matters)
- Refresh cadence
- Edge cases

---

## Metric Categories

| Category | Metric Count | Primary Use |
|----------|--------------|-------------|
| Treasury | 6 | Balance tracking, flow analysis |
| Governance | 5 | Control verification, delay monitoring |
| Risk | 4 | Exposure limits, concentration |
| Lending | 4 | Portfolio health, default tracking |
| System | 3 | Infrastructure status |
| **TOTAL** | **22** | - |

---

## Treasury Metrics

### TM-1: Treasury Total Balance

**Definition:** Sum of all assets held by TreasuryHub contract.

**Computation:**
```typescript
const balance = await provider.getBalance(TREASURY_HUB_ADDRESS);
const ethValue = ethers.formatEther(balance);
const usdValue = ethValue * ethPriceUSD;
```

**Source:** `TreasuryHub` (`0x3fD63728288546AC41dAe3bf25ca383061c3A929`)

**Why It Matters:** Primary indicator of protocol capitalization and operational runway.

**Refresh Cadence:** Real-time (30-second cache)

**Edge Cases:**
- Zero balance: Normal for new deployment
- Large sudden drop: Potential security issue, trigger alert

---

### TM-2: Bucket Allocations

**Definition:** Current balance in each treasury bucket (Operating, Maintenance, Growth, Long-Term).

**Computation:**
```typescript
const buckets = {
  operating: totalBalance * allocationPercent[0] / 10000,
  maintenance: totalBalance * allocationPercent[1] / 10000,
  growth: totalBalance * allocationPercent[2] / 10000,
  longTerm: totalBalance * allocationPercent[3] / 10000
};
```

**Source:** `TreasuryHub.allocations()` + balance calculation

**Why It Matters:** Shows fund distribution and operational reserve status.

**Refresh Cadence:** Real-time (30-second cache)

**Edge Cases:**
- Sum != 100%: Contract invariant violation (should never occur)
- Bucket below minReserve: Routing paused to that bucket

---

### TM-3: 7/30/90-Day Inflows

**Definition:** Sum of all `RevenueDeposited` events over time periods.

**Computation:**
```typescript
const events = await treasury.queryFilter(
  treasury.filters.RevenueDeposited(),
  currentBlock - blocksIn7Days
);
const inflow = events.reduce((sum, e) => sum + e.args.amount, 0n);
```

**Source:** `RevenueDeposited(source, amount, timestamp)` events

**Why It Matters:** Revenue trend analysis, runway calculation.

**Refresh Cadence:** Hourly (cached aggregation)

**Edge Cases:**
- RPC limits: May need subgraph for deep history
- Zero inflow: Not an error, but operational concern

---

### TM-4: 7/30/90-Day Outflows

**Definition:** Sum of all `FundsRouted` and `DrawExecuted` events over time periods.

**Computation:** Similar to inflows, using outflow events.

**Source:** `FundsRouted`, `DrawExecuted` events

**Why It Matters:** Burn rate analysis, sustainability assessment.

**Refresh Cadence:** Hourly (cached aggregation)

**Edge Cases:**
- Outflow > Inflow: Runway decreasing, flag for review

---

### TM-5: Net Flow (Burn Rate)

**Definition:** Inflows - Outflows over rolling periods.

**Computation:** `TM-3 - TM-4`

**Why It Matters:** Sustainability metric, runway projection.

**Refresh Cadence:** Derived from TM-3/TM-4

**Edge Cases:**
- Negative: Burning reserves, calculate remaining runway
- Highly volatile: May need smoothing

---

### TM-6: Min Reserve Status

**Definition:** Per-bucket status relative to minimum reserve threshold.

**Computation:**
```typescript
const status = bucketBalance >= minReserve ? 'HEALTHY' : 'BELOW_MIN';
```

**Source:** `TreasuryHub.minReserves(bucket)`

**Why It Matters:** Operational stability indicator.

**Refresh Cadence:** Real-time

**Edge Cases:**
- All below min: Protocol stress condition

---

## Governance Metrics

### GM-1: Timelock Status

**Definition:** Current configuration state of the timelock controller.

**Computation:**
```typescript
const status = {
  minDelay: await timelock.getMinDelay(),
  maxDelay: await timelock.MAX_DELAY(),
  configurationLocked: await timelock.configurationLocked(),
  lockTimestamp: await timelock.lockTimestamp()
};
```

**Source:** `AxiomTimelockController` (`0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899`)

**Why It Matters:** Core governance assurance - is the lock active?

**Refresh Cadence:** Real-time

**Edge Cases:**
- Not locked: Configurable mode, flag for institutional concern
- Locked: Irreversible, highest assurance level

---

### GM-2: Pending Operations Queue

**Definition:** Count and list of scheduled timelock operations awaiting execution.

**Computation:**
```typescript
const events = await timelock.queryFilter(
  timelock.filters.CallScheduled(),
  fromBlock
);
const pending = events.filter(e => !isExecuted(e.args.id));
```

**Source:** `CallScheduled`, `CallExecuted` events

**Why It Matters:** Visibility into upcoming governance changes.

**Refresh Cadence:** Real-time

**Edge Cases:**
- Empty queue: Normal operation
- Large queue: Governance backlog, review needed

---

### GM-3: Emergency Pause Status

**Definition:** Current pause state across all pausable contracts.

**Computation:**
```typescript
const paused = {
  timelockEmergency: await timelock.emergencyPaused(),
  circuitBreaker: await timelock.circuitBreakerActive(),
  lending: await governance.lendingPaused()
};
```

**Source:** State variables on respective contracts

**Why It Matters:** Critical safety indicator - is anything halted?

**Refresh Cadence:** Real-time (immediate alert if true)

**Edge Cases:**
- Any true: Immediate investigation required

---

### GM-4: Role Holder Count

**Definition:** Number of addresses holding each governance role.

**Computation:** Query `RoleGranted`/`RoleRevoked` events and compute net holders.

**Source:** AccessControl events

**Why It Matters:** Role concentration risk - single points of failure.

**Refresh Cadence:** On role change events

**Edge Cases:**
- Zero holders for critical role: Governance lockout risk
- Many holders: Diluted security

---

### GM-5: Last Governance Action

**Definition:** Timestamp and details of most recent governance execution.

**Computation:** Most recent `CallExecuted` event.

**Source:** `CallExecuted` events

**Why It Matters:** Governance activity monitoring.

**Refresh Cadence:** On new events

---

## Risk Metrics

### RM-1: Exposure Utilization

**Definition:** Current exposure as percentage of maximum allowed.

**Computation:**
```typescript
const utilization = (totalOutstanding * 100) / maxExposure;
const status = utilization >= 90 ? 'CRITICAL' : 
               utilization >= 75 ? 'WARNING' : 'SAFE';
```

**Source:** 
- `FixFlipManager.totalOutstanding()`
- `RiskConfig.maxExposure()`

**Why It Matters:** Primary risk capacity indicator.

**Refresh Cadence:** Real-time

**Edge Cases:**
- 100%: No new loans possible
- Suddenly drops: Large repayment or default write-off

---

### RM-2: LTV Distribution

**Definition:** Distribution of loan LTVs across the portfolio.

**Computation:** Aggregate individual loan LTVs.

**Source:** Loan origination events

**Why It Matters:** Collateralization health of lending book.

**Refresh Cadence:** Hourly

**Edge Cases:**
- Concentrated at max: High risk
- Bimodal: Different risk profiles

---

### RM-3: Concentration Analysis

**Definition:** Exposure concentration by counterparty/asset type.

**Computation:**
```typescript
const concentration = exposureByType.map(e => ({
  type: e.type,
  amount: e.amount,
  percent: (e.amount * 100) / totalExposure
}));
```

**Source:** Loan registry

**Why It Matters:** Single-point-of-failure risk.

**Refresh Cadence:** Daily

**Edge Cases:**
- >50% single type: High concentration risk

---

### RM-4: Red Flags Count

**Definition:** Number of active risk alerts.

**Computation:**
```typescript
const redFlags = [
  !emergencyPaused ? null : { type: 'pause', severity: 'CRITICAL' },
  !circuitBreaker ? null : { type: 'circuit_breaker', severity: 'CRITICAL' },
  exposureUtil < 90 ? null : { type: 'exposure', severity: 'WARNING' }
].filter(Boolean);
```

**Source:** Multiple risk sources

**Why It Matters:** Quick risk summary.

**Refresh Cadence:** Real-time

---

## Lending Metrics

### LM-1: Total Outstanding

**Definition:** Sum of all active loan principals.

**Computation:**
```typescript
const outstanding = await fixFlipManager.totalOutstanding() +
                    await dscrManager.totalOutstanding();
```

**Source:** Lending contracts

**Why It Matters:** Total lending book size.

**Refresh Cadence:** Real-time

---

### LM-2: Active Loan Count

**Definition:** Number of loans not yet repaid or defaulted.

**Computation:**
```typescript
const active = await fixFlipManager.activeLoans() +
               await dscrManager.activeLoans();
```

**Source:** Lending contracts

**Why It Matters:** Portfolio diversity.

**Refresh Cadence:** Real-time

---

### LM-3: Default Rate

**Definition:** Defaulted loans / Total originated (by count or value).

**Computation:**
```typescript
const defaultRate = (defaultedLoans * 100) / totalLoans;
```

**Source:** `LoanDefaulted` events

**Why It Matters:** Credit quality indicator.

**Refresh Cadence:** Daily

**Edge Cases:**
- Zero denominator: No loans originated yet

---

### LM-4: Interest Collected (MTD/YTD)

**Definition:** Sum of interest payments received.

**Computation:** Aggregate `LoanRepaid` event interest fields.

**Source:** `LoanRepaid` events

**Why It Matters:** Revenue generation from lending.

**Refresh Cadence:** Daily

---

## System Metrics

### SM-1: RPC Health

**Definition:** Connectivity and latency to blockchain RPC.

**Computation:**
```typescript
const start = Date.now();
const block = await provider.getBlockNumber();
const latency = Date.now() - start;
const status = latency < 1000 ? 'HEALTHY' : 'DEGRADED';
```

**Source:** RPC call timing

**Why It Matters:** Dashboard data freshness.

**Refresh Cadence:** Every request

---

### SM-2: Data Freshness

**Definition:** Age of cached data.

**Computation:** `Date.now() - cacheTimestamp`

**Source:** Internal cache metadata

**Why It Matters:** Data reliability indicator.

**Refresh Cadence:** Displayed with each metric

---

### SM-3: Contract Accessibility

**Definition:** Can we read from all required contracts?

**Computation:** Batch `eth_call` to each contract.

**Source:** RPC calls

**Why It Matters:** Infrastructure health.

**Refresh Cadence:** Every 5 minutes

---

## Dashboard Implementation

### Metric Cards

Each metric displays:
- **Value**: Current computed value
- **Status**: Color-coded (green/yellow/red)
- **Trend**: Arrow indicator (if applicable)
- **Last Updated**: Timestamp
- **Proof Link**: Arbiscan link to source

### Proof Links

| Data Type | Link Format |
|-----------|-------------|
| Contract state | `arbiscan.io/address/{address}#readContract` |
| Event-based | `arbiscan.io/tx/{txHash}#eventlog` |
| Block-based | `arbiscan.io/block/{blockNumber}` |

---

## Edge Case Handling

| Scenario | Handling |
|----------|----------|
| RPC unavailable | Show cached data with "stale" warning |
| Contract reverts | Show error state, don't cache |
| Zero values | Display $0 / 0%, not "N/A" |
| Large numbers | Use K/M/B abbreviations |
| Negative trends | Red coloring, trend arrow down |

---

## Future Enhancements (V2)

- [ ] Subgraph indexing for historical aggregations
- [ ] WebSocket real-time updates
- [ ] PDF report generation
- [ ] Token-gated access for detailed views
- [ ] Custom alert configuration
