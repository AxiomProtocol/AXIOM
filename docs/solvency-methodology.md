# Solvency Methodology — Axiom Protocol

**Version:** 1.0  
**Effective Date:** 2026-03-30  
**Classification:** Institutional Disclosure — Not Investment Advice

---

## 1. Purpose

This document defines every financial ratio computed and disclosed in the Axiom Protocol Solvency Console (`/api/solvency/latest`, `/disclosure`). It specifies formulas, data sources, policy thresholds, and the logic that determines the protocol's current operating mode.

---

## 2. Core Metrics

### 2.1 Coverage Ratio (CR)

```
CR = Treasury Total Assets (USD) / Total Protocol Liabilities (USD)
```

- A CR of 1.0 means the protocol holds exactly enough assets to cover all outstanding obligations.
- A CR > 1.0 indicates a surplus buffer.
- A CR < 1.0 indicates under-collateralization.

**Inputs:**
- `treasuryTotalUsd` — aggregate USD value of all protocol-held assets (on-chain + off-chain, read at snapshot time)
- `liabilitiesTotalUsd` — total outstanding AXUSD supply denominated in USD (1 AXUSD = 1.00 USD)

### 2.2 Reserve Ratio (RR)

```
RR = Designated Reserves (USD) / Total Protocol Liabilities (USD)
```

Designated Reserves is the subset of treasury capital explicitly earmarked to cover redemption demand (see `docs/reserve-methodology.md` for full definition).

**Inputs:**
- `reservesTotalUsd` — Canonical PSM USDC + Legacy PSM USDC + Backstop Vault USDC (see reserve methodology)
- `liabilitiesTotalUsd` — same as CR denominator

### 2.3 Loss Buffer Ratio (LBR)

```
LBR = Loss Buffer Capital (USD) / Total Protocol Liabilities (USD)
```

Loss Buffer Capital is the first-loss tranche — capital that absorbs losses before any reserve impairment. In the current architecture this is the surplus above designated reserves held in the treasury.

**Inputs:**
- `lossBufferUsd` = `treasuryTotalUsd - reservesTotalUsd` (floored at 0)

### 2.4 Liquidity Depth (LD)

```
LD = Immediately Redeemable Capital (USD) / Total Protocol Liabilities (USD)
```

Immediately Redeemable Capital is the subset of treasury assets convertible to USDC within one Arbitrum block without market impact — currently equivalent to `treasuryLiquidUsd`.

**Inputs:**
- `treasuryLiquidUsd` — liquid holdings subset; reported separately from `treasuryTotalUsd`

---

## 3. Policy Mode Determination

The protocol operates in one of five policy modes. Mode is determined by evaluating CR and RR against threshold tables:

| Mode | CR Threshold | RR Threshold | Description |
|---|---|---|---|
| BOOTSTRAP | Explicit override | Any | Protocol initialization phase. Metrics are informational only. No stabilization actions active. |
| NORMAL | CR ≥ 1.50 AND RR ≥ 0.10 | — | Reserve and coverage ratios within target thresholds. Standard operations. |
| CAUTION | CR ≥ 1.00 AND RR ≥ 0.05 | — | Advisory threshold crossed. Enhanced monitoring active. No operational restrictions. |
| RESTRICTED | CR ≥ 0.50 | — | Intervention threshold breached. Capital deployment paused pending governance review. |
| EMERGENCY | CR < 0.50 | — | Critical threshold breach. All non-essential operations suspended. Governance intervention required. |

**Evaluation order:** BOOTSTRAP (if explicitly set) → NORMAL → CAUTION → RESTRICTED → EMERGENCY

### Mode Implications

| Mode | Capital Deployment | Mint Operations | Governance Action Required |
|---|---|---|---|
| BOOTSTRAP | Suspended (informational only) | Active | No |
| NORMAL | Permitted per governance | Active | No |
| CAUTION | Reduced (advisory review) | Active | Recommended |
| RESTRICTED | Paused | Review required | Yes |
| EMERGENCY | Suspended | Suspended | Mandatory |

---

## 4. Snapshot Methodology

### 4.1 Snapshot Structure

Each solvency computation produces a snapshot record with the following canonical fields:

```json
{
  "schemaVersion": "1.0",
  "dataStatus": "ok | empty | partial",
  "snapshotId": "<uuid>",
  "asOfUtc": "<ISO-8601 timestamp>",
  "checksum": "<SHA-256 of key fields>",
  "treasuryTotalUsd": 0.0,
  "treasuryLiquidUsd": 0.0,
  "reservesTotalUsd": 0.0,
  "liabilitiesTotalUsd": 0.0,
  "reserveRatio": 0.0,
  "coverageRatio": 0.0,
  "lossBufferUsd": 0.0,
  "policyMode": "BOOTSTRAP",
  "regimeState": "...",
  "hardBrake": "...",
  "gateStatus": "...",
  "composition": [],
  "limitations": [],
  "sources": []
}
```

### 4.2 Checksum Construction

The snapshot checksum is a SHA-256 hash over a deterministic concatenation of the key financial fields:

```
checksum = SHA-256(snapshotId + "|" + treasuryTotalUsd + "|" + liabilitiesTotalUsd + "|" + coverageRatio + "|" + policyMode)
```

This provides tamper-evidence for the published snapshot. The checksum is displayed on `/disclosure` alongside the Snapshot ID and timestamp.

### 4.3 Snapshot Storage

Snapshots are persisted to the `solvency_snapshots` PostgreSQL table. The latest snapshot is served by `/api/solvency/latest`. Historical snapshots are retained for trend analysis and audit.

### 4.4 Frequency

Snapshots are generated on-demand and are not auto-refreshed on a fixed schedule. A snapshot older than 24 hours may not reflect current on-chain state. The `asOfUtc` timestamp on every snapshot indicates its data vintage.

---

## 5. Data Sources

| Metric | Source | Method |
|---|---|---|
| AXUSD Total Supply | Arbitrum One — `0xD6110F59...` | `totalSupply()` RPC call via Alchemy |
| Canonical PSM USDC | Arbitrum One — USDC contract | `balanceOf(CANONICAL_PSM)` |
| Legacy PSM USDC | Arbitrum One — USDC contract | `balanceOf(ACTIVE_PSM)` |
| Backstop USDC | Arbitrum One — USDC contract | `balanceOf(BACKSTOP_VAULT)` |
| ETH Position | Arbitrum One — `0xF2540BD6...` | `address(vault).balance` |
| AXM Price (for ETH→USD conversion) | CoinGecko API | `simple/price?ids=ethereum` |
| Off-chain obligations | Internal ledger | Manual entry; founder-attested |

Note: ETH is **excluded** from the USDC-denominated reserve ratio but is included in `treasuryTotalUsd` using the CoinGecko ETH/USD price at snapshot time. ETH price feed failure causes the ETH component to be excluded with a `partial` data status flag.

---

## 6. Stress Testing

Three canonical scenarios are pre-defined in the solvency engine:

| Scenario ID | Name | Treasury Drawdown | Reserve Drawdown | Liability Increase |
|---|---|---|---|---|
| S-BASE | Baseline | 0% | 0% | 0% |
| S-MOD | Moderate Redemption (10%) | 10% | 10% | 0% |
| S-SEVERE | Severe Redemption (25%) | 25% | 25% | 10% |
| S-EXTREME | Extreme Redemption (50%) | 50% | 40% | 20% |

For each scenario, the engine computes adjusted CR, RR, loss buffer, and resulting policy mode to determine whether the stress event would trigger a mode change.

---

## 7. Bootstrap Phase Behavior

During BOOTSTRAP mode (the current operational phase):

- All computed ratios will appear near zero because AXUSD supply is negligible relative to total addressable reserves
- This is expected and correct — the ratios are mathematically valid but economically unrepresentative during launch
- The disclosure page and solvency console explicitly label bootstrap-phase metrics as informational
- BOOTSTRAP mode can only be exited by an explicit governance action setting `policyMode = NULL` in the database, which causes the engine to revert to threshold-based evaluation

---

## 8. Limitations

1. **Not a real-time attestation.** Snapshots are point-in-time reads. Balances can change between snapshot and viewing.
2. **Oracle dependency.** The ETH→USD conversion relies on CoinGecko. CoinGecko outages cause partial data status.
3. **Off-chain obligations are founder-attested.** No third party has verified the completeness of off-chain liability capture.
4. **No independent audit.** This methodology and the associated computations have not been reviewed by an independent auditor or accounting firm.
5. **Bootstrap metrics are not comparable to steady-state metrics.** Ratios computed during bootstrap carry no predictive information about steady-state health.

---

## 9. Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-03-30 | Initial document. Canonical PSM and ERC-3643 Unified AXUSD live. |

---

*Document produced by Axiom Protocol. Last updated: 2026-03-30.*
