# Axiom Protocol — Avalanche AXUSD Reserve Reconciliation Model

**Version:** 1.0.0  
**Network:** Avalanche C-Chain (chainId 43114 mainnet / 43113 Fuji)  
**Created:** 2026-05-14  
**Status:** DRAFT — Pending operations leadership review  
**Gate:** G12 — Satisfies acceptance criteria for `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`

---

## 1. Purpose

AXUSD issued on Avalanche C-Chain must be fully backed by the canonical reserve position. This model defines how to detect, measure, and resolve any divergence between the AXUSD supply on Avalanche and the authorized issuance recorded in Capinfra and the Arbitrum One reserve.

---

## 2. Definitions

| Term | Definition |
|---|---|
| **Avalanche on-chain supply** | `AxiomStable3643.totalSupply()` — the live ERC-20 total supply on Avalanche (6 decimals) |
| **Capinfra authorized issuance** | Sum of all Capinfra `cap_settlement_instructions` with `status=SETTLED`, `actionType=MINT`, and `settlementType=AVALANCHE` (or `assetId` matching an AXUSD-AVALANCHE asset) |
| **Capinfra authorized redemptions** | Sum of all `status=SETTLED`, `actionType=REDEEM`, `settlementType=AVALANCHE` instructions |
| **Net authorized supply** | Authorized issuance − authorized redemptions |
| **Discrepancy** | `on_chain_supply − net_authorized_supply` |
| **Tolerance** | Acceptable rounding or timing delta (see §5) |

---

## 3. Reserve Architecture

```
Canonical Reserve (Arbitrum One)
  PAXG / LandNAVOracle
  ↓ authorized issuance events → Capinfra
  
Capinfra (PostgreSQL)
  cap_settlement_instructions (MINT/REDEEM, SETTLED, AVALANCHE)
  cap_positions (AXUSD-AVALANCHE position per user)
  cap_audit_events (immutable audit trail)
  
Avalanche C-Chain
  AxiomStable3643.totalSupply()   ← derived from MINT/burn calls
  per-wallet balanceOf(address)   ← ERC-20 ledger
```

AXUSD issued on Avalanche represents a claim on the reserve held on Arbitrum One. Each MINT instruction on Avalanche must be matched by either:
1. A corresponding reserve entry on Arbitrum One (cross-chain issuance model), or
2. A direct bridge authorization (future bridge model — not in scope for Phase 2).

In Phase 2 (Fuji testnet), all AXUSD minting on Avalanche is authorized exclusively through Capinfra MINT instructions executed by the deployer key. No autonomous bridge exists.

---

## 4. Reconciliation Queries

### 4a. On-chain supply snapshot

```bash
# Via Alchemy / public RPC (Fuji):
cast call 0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 "totalSupply()(uint256)" \
  --rpc-url $AVALANCHE_FUJI_RPC_URL

# Convert: divide by 10^6 (6 decimals) for human-readable AXUSD.
```

For mainnet, replace with `AVALANCHE_CONTRACTS.AxiomStable3643` address and `AVALANCHE_RPC_URL`.

### 4b. Capinfra authorized issuance query

```sql
-- Net authorized AXUSD supply on Avalanche from Capinfra
SELECT
  SUM(
    CASE WHEN csi.action_type = 'MINT' THEN CAST(csi.amount AS NUMERIC)
         WHEN csi.action_type = 'REDEEM' THEN -CAST(csi.amount AS NUMERIC)
         ELSE 0
    END
  ) AS net_authorized_supply_axusd,
  COUNT(*) FILTER (WHERE csi.action_type = 'MINT') AS mint_count,
  COUNT(*) FILTER (WHERE csi.action_type = 'REDEEM') AS redeem_count,
  MIN(csi.settled_at) AS first_settled,
  MAX(csi.settled_at) AS last_settled
FROM cap_settlement_instructions csi
JOIN cap_assets ca ON ca.id = csi.asset_id
WHERE csi.status = 'SETTLED'
  AND csi.action_type IN ('MINT', 'REDEEM')
  AND csi.settlement_type = 'AVALANCHE'
  AND ca.symbol LIKE 'AXUSD%';
```

### 4c. Discrepancy computation

```
on_chain_supply_raw    = AxiomStable3643.totalSupply()   [6-decimal integer]
net_authorized_raw     = net_authorized_supply_axusd × 10^6   [from DB, converted]
discrepancy_raw        = on_chain_supply_raw − net_authorized_raw
discrepancy_axusd      = discrepancy_raw / 10^6
```

### 4d. Per-wallet attribution check

```sql
-- Capinfra position per user for AXUSD-AVALANCHE
SELECT
  cp.user_id,
  cp.quantity AS db_quantity,
  ca.symbol,
  ca.contract_address
FROM cap_positions cp
JOIN cap_assets ca ON ca.id = cp.asset_id
WHERE ca.settlement_type = 'AVALANCHE'
  AND ca.symbol LIKE 'AXUSD%'
ORDER BY cp.quantity DESC;
```

Compare against on-chain `balanceOf(address)` for each wallet. The sum of all on-chain balances must equal `totalSupply()`. The sum of all Capinfra `cp.quantity` values must equal the `net_authorized_supply`.

---

## 5. Tolerance Thresholds

| Condition | Threshold | Action |
|---|---|---|
| Normal operating range | `|discrepancy| ≤ 0.000001 AXUSD` (1 raw unit) | No action; log in report |
| Timing delta (SUBMITTED not yet SETTLED) | `|discrepancy| ≤ max_single_pending_instruction` | Identify pending SUBMITTED; recheck after settlement |
| Warning threshold | `0.000001 < |discrepancy| ≤ 0.01 AXUSD` | Operations Lead notified; investigate within 4 hours |
| Escalation threshold | `|discrepancy| > 0.01 AXUSD` | P2 incident (5F in INCIDENT_RESPONSE_PLAN.md); escalate immediately |
| Critical threshold | `discrepancy > 0 AND > 1.00 AXUSD` | P1 incident; pause token; treat as unauthorized mint |

**Note on timing delta:** SUBMITTED instructions have been dispatched (tx broadcast) but not yet confirmed in Capinfra as SETTLED. During this window, `on_chain_supply` may reflect the mint while `net_authorized_supply` does not yet. Timing deltas resolve when `externallySettleInstruction` is called.

---

## 6. Reconciliation Frequency

| Environment | Frequency | Method |
|---|---|---|
| Fuji testnet | On-demand (before each Gate proof run) | Manual script / SQL |
| Mainnet (pre-launch) | Before go-live | Manual verification |
| Mainnet (ongoing) | Daily at 00:00 UTC | Automated script (see §7) |
| Mainnet (incident) | Immediately on trigger | On-demand |

---

## 7. Automated Reconciliation Script

The following script runs the daily reconciliation. It must be registered as a cron job or Capinfra background task before mainnet go-live.

**Script path:** `scripts/reconcile-avalanche-reserve.ts`

**Script contract:**
1. Call `AxiomStable3643.totalSupply()` via the configured Avalanche RPC.
2. Query Capinfra DB for `net_authorized_supply` (query from §4b).
3. Compute `discrepancy`.
4. Write reconciliation report to `documents/operations/reconciliation-reports/YYYY-MM-DD.json`.
5. If `|discrepancy|` exceeds the warning threshold → emit a Capinfra audit event `reconciliation.warning`.
6. If `|discrepancy|` exceeds the escalation threshold → emit `reconciliation.escalation` and page the on-call engineer.
7. Exit 0 if within tolerance, exit 1 if escalation threshold exceeded.

**Report format (`YYYY-MM-DD.json`):**
```json
{
  "date": "2026-05-14",
  "network": "avalanche-mainnet",
  "chainId": 43114,
  "contract": "0x...",
  "onChainSupplyRaw": "1000000",
  "onChainSupplyAxusd": "1.000000",
  "capinfraNetAuthorizedRaw": "1000000",
  "capinfraNetAuthorizedAxusd": "1.000000",
  "discrepancyRaw": "0",
  "discrepancyAxusd": "0.000000",
  "status": "OK",
  "mintCount": 1,
  "redeemCount": 0,
  "pendingSubmittedCount": 0,
  "snapshotBlockNumber": 12345678,
  "snapshotTimestampUtc": "2026-05-14T00:00:12Z"
}
```

---

## 8. Test Reconciliation (Pre-Mainnet Requirement)

Before mainnet go-live, a test reconciliation must be run on Fuji testnet to verify the script operates correctly. The test reconciliation must:

1. Confirm `totalSupply()` on Fuji matches the sum of all SETTLED MINT instructions for `AXUSD-FUJI` in Capinfra.
2. Confirm `discrepancy = 0` (or within tolerance for any pending SUBMITTED instructions).
3. Confirm the report JSON is written correctly.
4. Confirm that the script exits 0 on a clean run.

**Fuji test reconciliation reference data (as of 2026-05-14):**

| Field | Value |
|---|---|
| Fuji contract | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` |
| Known Gate 5 MINT txHash 1 | `0xf10d156a9328b9c4ad32f7bd6dd1df143f92449a270146b209c2129ddb69ef8c` |
| Known Gate 5 MINT txHash 2 | `0x738a90c5f3d6c1f37a133947e598155e58b92b7123ae6a575b00f06700b662ee` |
| Amount per mint | 0.000001 AXUSD (raw = 1 at 6 decimals) |
| Expected on-chain supply (at minimum) | 2 raw units (both mints confirmed) |
| Capinfra AXUSD-FUJI asset symbol | `AXUSD-FUJI` |

Run the test reconciliation script against Fuji before marking this gate SATISFIED for mainnet.

---

## 9. Reserve Model for Cross-Chain AXUSD (Future State)

Phase 2 establishes AXUSD on Avalanche as an extension of the Arbitrum One reserve. The canonical accounting model is:

```
Total AXUSD supply across all chains
  = Arbitrum One supply (AXUSD ERC-3643 on Arb)
  + Avalanche supply (AxiomStable3643 on Avax)
  + [future chains]

Total reserve backing
  = PAXG held in custody (Arbitrum One)
  + LandNAV (appraisal-based, Arbitrum One oracle)
  ≥ Total AXUSD supply across all chains

Cross-chain issuance: each Avalanche MINT must be matched by
  either a corresponding reserve increase OR an explicit bridge
  authorization from the Arbitrum canonical reserve.
```

**Phase 2 constraint:** No automated bridge exists. All AXUSD minted on Avalanche is authorized manually through Capinfra. The reserve reconciliation for Phase 2 therefore only checks Capinfra authorization records against on-chain supply.

A cross-chain reserve reconciliation spanning Arbitrum + Avalanche will be defined as a separate model in `documents/operations/CROSS_CHAIN_RESERVE_MODEL.md` prior to any bridge deployment.

---

## 10. Pre-Mainnet Checklist for This Model

- [ ] Automated reconciliation script (`scripts/reconcile-avalanche-reserve.ts`) implemented
- [ ] Script registered as daily cron at 00:00 UTC
- [ ] Alert wiring from `reconciliation.escalation` audit event to on-call pager
- [ ] Test reconciliation run on Fuji and report filed (see §8 reference data)
- [ ] Operations Lead reviews and accepts this model
- [ ] Report storage path `documents/operations/reconciliation-reports/` created

---

*Axiom Protocol Internal — Gate G12 — 2026-05-14*  
*Status: DRAFT — requires Operations Lead acceptance and test reconciliation run before mainnet.*
