# Axiom Protocol — Sui Phase 10 Operations Manual
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Scope:** AMC community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.

---

## 1. System Architecture

### 1.1 On-Chain Layer (Sui Mainnet)

```
Package: axiom_claim_mainnet_candidate (IMMUTABLE)
├── axiom_mainnet_claim     — AMC coin type, OTW initialization
├── claim_campaign          — Campaign lifecycle, Merkle-verified claims
├── guarded_treasury        — TreasuryCap wrapper, supply cap enforcement
└── merkle                  — keccak256 proof verification, MAX_PROOF_DEPTH guard

Shared Objects:
├── ClaimCampaign           — 0xa6dea4cc... (shared, mutable by AdminCap holder)
└── CoinMetadata<AMC>       — frozen

Owned Objects (operator wallet):
├── AdminCap                — 0x637ce7... (operator authorization)
└── GuardedTreasury         — 0x6576a7... (mint authorization)
```

### 1.2 Backend Layer (Next.js)

```
API Routes:
├── /api/sui/proof-request    — POST: eligibility check + Merkle proof generation
├── /api/sui/claim-submit     — POST: server-side validation gate
├── /api/health/sui           — GET: basic RPC health
├── /api/health/sui-rpc       — GET: detailed per-network RPC health
├── /api/health/sui-monitoring — GET: aggregate monitoring snapshot
└── /api/health/sui-campaigns  — GET: per-campaign on-chain health

Monitoring (lib/sui/monitoring/):
├── claimEventPoller         — Polls Claimed events, anomaly detection
├── campaignStatePoller      — Polls ClaimCampaign object state
├── rpcHealthCheck           — Dual-network RPC latency/status
├── proofRequestMonitor      — Proof request volume, abuse detection
├── campaignIntegrityMonitor — Merkle root, pool, state integrity checks
├── walletRiskMonitor        — Per-wallet risk profiling
└── monitoringRegistry       — Aggregate health snapshot
```

### 1.3 Frontend Layer

```
Public pages:
├── /sui/claim       — Claimant UX (wallet connect, eligibility, claim)
└── /sui/disclosure  — Public transparency disclosure

Operator pages:
├── /operator/chains/sui-phase9  — Phase 9 production dashboard
├── /operator/chains/sui-ops     — Phase 10 ops control console
└── /operator/chains/sui-analytics — Phase 10 analytics dashboard
```

---

## 2. Monitoring

### 2.1 Health Endpoints

| Endpoint | Purpose | Health Codes |
|---|---|---|
| `/api/health/sui-rpc` | RPC connectivity and latency | HEALTHY / DEGRADED / CRITICAL |
| `/api/health/sui-campaigns` | On-chain campaign state + integrity | HEALTHY / DEGRADED / CRITICAL |
| `/api/health/sui-monitoring` | Aggregate system health | HEALTHY / DEGRADED / CRITICAL |

HTTP 200 = HEALTHY or DEGRADED. HTTP 503 = CRITICAL.

### 2.2 Alert Thresholds

| Metric | Warning | Critical |
|---|---|---|
| RPC latency | >500ms | >2000ms |
| Claims in window | >100 in 5min | — |
| Pool drain | — | >10% MAX_SUPPLY in 5min |
| Proof requests | >15 per address/5min | >50 per address/5min |
| Duplicate attempts | >2 per address | >5 per address |
| Integrity checks | Any WARNING | Any CRITICAL |

### 2.3 Monitoring Limitations

- Telemetry is in-process (resets on server restart). See R-SUI-04.
- On-chain records via suiscan.xyz are always authoritative.
- Monitoring observes; it cannot take action.

---

## 3. Analytics

**Dashboard:** `/operator/chains/sui-analytics`

Displays:
- Campaign registry metrics (total eligible, claimed, pool balance, claim rate)
- Live telemetry from monitoring snapshot
- Per-campaign breakdown table
- RPC health per network
- Accepted risk status table

Refresh: manual or auto-refresh every 30 seconds.

---

## 4. Support

**Tiers:** L1 (user support) → L2 (tech ops) → L3 (protocol ops) → L4 (founder)

**Documents:**
- `AXIOM_SUI_SUPPORT_PLAYBOOK.md` — 11 scenario playbooks
- `AXIOM_SUI_SUPPORT_ESCALATION_MATRIX.md` — issue classification and escalation paths
- `AXIOM_SUI_FAQ.md` — public-facing FAQ

**Key escalation triggers:**
- Any security concern → escalate immediately to L3
- Unexpected campaign state → L2 → L3
- Multiple users reporting same failure simultaneously → L2

---

## 5. Incident Response

**Plan:** `AXIOM_SUI_INCIDENT_RESPONSE_PLAN.md`
**Runbook:** `AXIOM_SUI_EMERGENCY_OPERATIONS_RUNBOOK.md`

**Classification:**
- P0 Critical: wallet compromise, unexpected mint, campaign corruption
- P1 Major: unexpected pause/close, proof API down >1h
- P2 Degraded: RPC outage, elevated failures, abuse
- P3 Informational: single user failure, minor anomaly

**Emergency controls (all require AdminCap):**
- Pause: `claim_campaign::pause`
- Unpause: `claim_campaign::unpause`
- Close (irreversible): `claim_campaign::close_campaign`
- Update Merkle root (while paused): `claim_campaign::update_merkle_root`

---

## 6. Risk Governance

**Risk Register:** `AXIOM_SUI_PHASE10_ACCEPTED_RISK_REGISTER.md`

| Risk | Deadline | Owner |
|---|---|---|
| External audit deferred | 2026-07-14 | Protocol Ops |
| Single-wallet AdminCap | 2026-06-14 | Protocol Ops |
| Single-party authorization | 2026-08-13 | Governance |
| In-process monitoring state | 2026-07-31 | Engineering |

---

## 7. Future Migration Plan

### 7.1 AdminCap Multisig Migration (Phase 10 → deadline 2026-06-14)

Transfer AdminCap from single wallet to 2-of-3 multisig.
See `AXIOM_SUI_PHASE10_CUSTODY_EXCEPTION.md` and `AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md`.

### 7.2 External Move Audit (deadline 2026-07-14)

Engage OtterSec / MoveBit / Zellic for audit of the immutable package.
See `AXIOM_SUI_PHASE10_AUDIT_DEFERRAL_MEMO.md`.

### 7.3 Monitoring Persistence (Phase 11)

Migrate in-process monitoring state to Postgres via Drizzle ORM.
Enables historical analytics, cross-restart anomaly detection, and alerting history.

### 7.4 Expanded Eligibility

Future campaigns may expand the eligibility list via a new campaign object (new Merkle root, new pool).
The current immutable package supports unlimited campaign creation — each requires a new `create_campaign_entry` call and new AdminCap + ClaimCampaign objects.

---

## 8. Key References

| Item | Value |
|---|---|
| Package ID | `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487` |
| Campaign object | `0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982` |
| AdminCap | `0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a` |
| GuardedTreasury | `0x6576a7e8fab5bebbadef57336af3863ab58c15b0e653701dedd5bd47a8618ea7` |
| Operator wallet | `0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad` |
| Merkle root | `dd6b3d845ed2129701dac7cf2637baf7a0b599d27813be4c75d3deb80394c67a` |
| Proof data | `lib/sui/proofs/phase9-mainnet-eligibility.json` |
| Sui Explorer | https://suiscan.xyz/mainnet |
| Claimant UX | `/sui/claim` |
| Public disclosure | `/sui/disclosure` |

---

*Operations Manual v1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
*Community distribution only — NOT AXUSD, AXAU, AXM, SEED, or KAG*
