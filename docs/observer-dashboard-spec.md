# Institutional Observer Dashboard Specification

**Version:** 1.0.0  
**Created:** 2026-01-26  
**Status:** MVP Specification  
**Access Model:** Read-Only (No transaction signing)

---

## Executive Summary

The Institutional Observer Dashboard provides allocators, auditors, and institutional partners with a transparent, verifiable view of Axiom Protocol's governance and treasury operations. All data is derived from on-chain state and events, with proof links to original transactions.

---

## Information Architecture

```
/observer
├── /overview          → Executive summary for allocators
├── /treasury          → Bucket totals, routing, draw schedules
├── /governance        → Roles, parameters, timelock queue
├── /risk              → Exposure limits, concentration, red flags
├── /assets            → Registry entries, revenue attribution
└── /reports           → Export options, integrity checks
```

---

## Page Specifications

### 1. Overview (`/observer`)

**Purpose:** Quick executive view for allocators and auditors

| Metric | Data Source | Update Frequency |
|--------|-------------|------------------|
| Treasury Total (ETH/USD) | `TreasuryHub.totalBalance()` | Real-time |
| Bucket Totals | `TreasuryHub.getBucketBalances()` | Real-time |
| 7/30/90d Inflows | `RevenueDeposited` events, aggregated | Hourly cache |
| 7/30/90d Outflows | `FundsRouted` events, aggregated | Hourly cache |
| Governance Status | `GovernanceHub.paused()`, parameter hash | Real-time |
| Risk Posture | `RiskConfig.maxExposure()` vs current | Real-time |
| Latest 10 Actions | Recent governance events | Real-time |

**Proof Links:**
- Contract addresses (clickable to Arbiscan)
- Transaction hashes for recent actions
- Block numbers for state snapshots

---

### 2. Treasury (`/observer/treasury`)

**Purpose:** Detailed treasury operations and projections

#### 2.1 Bucket Breakdown

| Bucket | Contract/Field | Description |
|--------|---------------|-------------|
| Operating | `TreasuryHub.operatingBalance` | Day-to-day operations |
| Maintenance | `TreasuryHub.maintenanceReserve` | Infrastructure upkeep |
| Growth | `TreasuryHub.growthFund` | Expansion capital |
| Long-Term | `TreasuryHub.longTermReserve` | Strategic reserves |

#### 2.2 Routing Rules

| Parameter | Source | Description |
|-----------|--------|-------------|
| Allocation Percentages | `TreasuryHub.allocations()` | Current split ratios |
| Min Reserve Thresholds | `TreasuryHub.minReserves()` | Floor amounts |
| Routing Priority | `TreasuryHub.routingPriority()` | Bucket fill order |

#### 2.3 Draw Schedule Projections

- Next 7 days: Scheduled draws with amounts
- Next 30 days: Projected burn rate
- Historical: Last 90 days actuals

#### 2.4 Audit Trail Table

| Column | Filter | Sort |
|--------|--------|------|
| Timestamp | Date range | Asc/Desc |
| Event Type | Dropdown | - |
| Amount | Min/Max | Asc/Desc |
| Actor | Address | - |
| Tx Hash | Search | - |

---

### 3. Governance (`/observer/governance`)

**Purpose:** Complete governance transparency

#### 3.1 Roles & Permissions

| Role | Holder(s) | Privileges | Since |
|------|-----------|------------|-------|
| DEFAULT_ADMIN | Gnosis Safe | Full admin | Block # |
| GUARDIAN | Gnosis Safe | Emergency pause | Block # |
| RISK_COMMITTEE | Gnosis Safe | Risk params | Block # |
| OPERATOR | EOA | Day-to-day ops | Block # |

**Data Source:** `RoleGranted` / `RoleRevoked` events

#### 3.2 Parameter Registry

| Parameter | Current Value | Last Changed | Tx Hash |
|-----------|---------------|--------------|---------|
| Min Delay | 24 hours | 2026-01-26 | 0x... |
| Fee Rate | 1.5% | 2026-01-15 | 0x... |
| Max LTV | 75% | 2026-01-20 | 0x... |

**Data Source:** Parameter change events from each contract

#### 3.3 Timelock Queue

| Operation ID | Target | Function | ETA | Status |
|--------------|--------|----------|-----|--------|
| 0xabc... | AxiomV2 | setFeeRates | 2026-01-27 12:00 | Pending |

**Data Source:** `CallScheduled` / `CallExecuted` events from TimelockController

#### 3.4 Emergency Controls

| Control | Holder | Policy | Current State |
|---------|--------|--------|---------------|
| Pause | GUARDIAN | Immediate | Active/Inactive |
| Circuit Breaker | CIRCUIT_BREAKER | Immediate | Active/Inactive |
| Emergency Sweep | GUARDIAN | Immediate | N/A |

---

### 4. Risk (`/observer/risk`)

**Purpose:** Risk metrics and alerts

#### 4.1 Exposure Limits vs Actuals

| Metric | Limit | Current | Utilization |
|--------|-------|---------|-------------|
| Max LTV | 75% | 68% | 91% |
| Max Single Loan | $5M | $3.2M | 64% |
| Max Total Exposure | $50M | $42M | 84% |

**Visual:** Progress bars with color coding (green/yellow/red)

#### 4.2 Concentration Analysis

| Counterparty/Asset | Exposure | % of Total |
|--------------------|----------|------------|
| Property Pool A | $15M | 35% |
| Property Pool B | $12M | 28% |
| Staking Vault | $8M | 19% |

#### 4.3 Red Flags Panel

| Flag | Status | Description |
|------|--------|-------------|
| Invariant Violations | ✓ None | All invariants passing |
| Missing Events | ✓ None | No gaps detected |
| Oracle Staleness | ✓ OK | All feeds fresh |
| Pause Events | ✓ None | No recent pauses |

---

### 5. Assets (`/observer/assets`)

**Purpose:** Asset registry and revenue tracking

#### 5.1 Asset Registry

| Asset ID | Type | Status | Registered | Revenue |
|----------|------|--------|------------|---------|
| LAND-001 | Real Estate | Active | 2026-01-10 | $5,200/mo |
| NODE-042 | DePIN | Active | 2026-01-15 | $320/mo |

**Data Source:** `AssetRegistered` / `AssetUpdated` events

#### 5.2 Revenue Attribution

| Stream | Source | MTD | YTD |
|--------|--------|-----|-----|
| Loan Interest | FixFlipManager | $45,000 | $180,000 |
| Staking Fees | veAXM | $12,000 | $48,000 |
| DEX Fees | ExchangeHub | $8,500 | $34,000 |

#### 5.3 Lifecycle Actions

| Date | Asset | Action | Actor | Tx |
|------|-------|--------|-------|-----|
| 2026-01-25 | LAND-002 | Acquired | Safe | 0x... |
| 2026-01-20 | NODE-015 | Deprecated | Safe | 0x... |

---

### 6. Reports (`/observer/reports`)

**Purpose:** Export and verification tools

#### 6.1 Export Options

| Format | Contents | Access |
|--------|----------|--------|
| JSON | Full state snapshot | Public |
| CSV | Event history | Public |
| PDF | Monthly summary | Token-gated |

#### 6.2 Integrity Checks

| Check | Status | Last Run |
|-------|--------|----------|
| Balance Reconciliation | ✓ Pass | 5 min ago |
| Event Continuity | ✓ Pass | 5 min ago |
| Parameter Consistency | ✓ Pass | 5 min ago |
| Timelock Verification | ✓ Pass | 5 min ago |

---

## Data Sources

### Contract Addresses (Arbitrum One)

| Contract | Address | Purpose |
|----------|---------|---------|
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | Governance timelock |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | Function registry |
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Central governance |
| TreasuryHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Treasury management |
| AxiomV2 | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | AXM token |
| veAXM | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` | Vote escrow |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Risk parameters |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | DSCR risk params |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Bridge loans |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | DSCR loans |
| AxiomScoreSBT | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | Credit scores |

### RPC Provider Strategy

| Priority | Provider | Use Case |
|----------|----------|----------|
| 1 | Alchemy (API key) | Primary reads |
| 2 | Public Arbitrum RPC | Fallback |
| 3 | Cached responses | Rate limit protection |

### Caching Strategy

| Data Type | Cache Duration | Invalidation |
|-----------|----------------|--------------|
| Balances | 30 seconds | On new block |
| Events (historical) | 1 hour | Manual refresh |
| Parameters | 5 minutes | On change event |
| Aggregates (7/30/90d) | 1 hour | Scheduled |

---

## Technical Implementation

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS with existing Axiom theme
- **Data Fetching:** ethers.js / viem for RPC calls
- **State:** React Query for caching
- **Charts:** Recharts (existing in project)

### Folder Structure

```
pages/observer/
├── index.tsx              → Overview dashboard
├── treasury.tsx           → Treasury details
├── governance.tsx         → Governance transparency
├── risk.tsx               → Risk metrics
├── assets.tsx             → Asset registry
└── reports.tsx            → Export & verification

server/services/observer/
├── ObserverService.ts     → Main data service
├── TreasuryReader.ts      → Treasury state reads
├── GovernanceReader.ts    → Governance event reads
├── RiskReader.ts          → Risk metric calculations
└── types.ts               → TypeScript interfaces

components/observer/
├── MetricCard.tsx         → Key metric display
├── ProofLink.tsx          → Tx/contract links
├── EventTable.tsx         → Filterable event log
├── RiskGauge.tsx          → Utilization visualization
└── ExportButton.tsx       → JSON/CSV export
```

### Access Model

| Level | Access | Authentication |
|-------|--------|----------------|
| Public | Overview, basic metrics | None |
| Investor | Full dashboard | Token-gated (AXM holder) |
| Auditor | Full + exports | API key |

---

## Implementation Plans

### MVP (7 Days)

| Day | Deliverable |
|-----|-------------|
| 1 | Spec finalized, routes created, types defined |
| 2 | ObserverService with treasury reads |
| 3 | Overview page with live data |
| 4 | Treasury + Governance pages |
| 5 | Risk page with gauges |
| 6 | Assets + Reports pages |
| 7 | Testing, polish, documentation |

### Institutional V2 (30 Days)

| Week | Deliverable |
|------|-------------|
| 1 | Subgraph indexer for historical data |
| 2 | PDF report generation |
| 3 | Token-gated access implementation |
| 4 | Real-time WebSocket updates |
| 5 | Audit trail compliance features |

---

## Security Considerations

1. **Read-Only:** No private keys, no signing, no admin actions
2. **Public Data Only:** All displayed data is on-chain and verifiable
3. **No Secrets:** Dashboard uses public RPC endpoints
4. **Rate Limiting:** Caching prevents RPC abuse
5. **Proof Links:** Every metric links to source transaction

---

## Appendix: Key Events

See `/docs/observer-events.md` for complete event-to-field mapping.
