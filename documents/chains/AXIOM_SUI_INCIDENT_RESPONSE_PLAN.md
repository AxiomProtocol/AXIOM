# Axiom Protocol — Sui Incident Response Plan
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Scope:** AMC community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.

---

## Incident Classification

| Class | Description | Response SLA | Escalation |
|---|---|---|---|
| P0 — Critical | Campaign compromise, key theft, unexpected mint | Immediate | L4 |
| P1 — Major | Campaign closed/paused unexpectedly, proof API down >1h | 1 hour | L3 |
| P2 — Degraded | RPC outage, elevated claim failures, proof abuse | 4 hours | L2 |
| P3 — Informational | Single user failure, monitoring anomaly, minor UI issue | 24 hours | L1 |

---

## P0 — Critical Incidents

### P0-A: Admin Wallet Compromise

**Indicators:**
- Unauthorized pause, unpause, or close transaction on-chain
- Unauthorized Merkle root update
- Unexpected token mint event
- AdminCap transferred to an unknown address

**Immediate actions (within 15 minutes):**
1. Verify the incident on suiscan.xyz — confirm transaction is genuine and not a monitoring false alarm.
2. Escalate to L4 immediately.
3. If campaign is active and uncompromised: attempt emergency close from backup access if available.
4. Prepare public notice (do not publish until L4 approves).
5. Document all observed transactions with digests.

**Recovery path:**
- If AdminCap is transferred: recovery requires the recipient to cooperate OR campaign operates read-only until pool depletion.
- If campaign was closed: remaining pool returned to operator wallet.
- Engage legal and security counsel.
- Post-incident: full security review before any new campaign.

---

### P0-B: Unexpected Mint Event

**Indicators:**
- `TokensMinted` event observed on-chain from an unrecognized transaction.
- GuardedTreasury total_minted increases without an authorized fund_campaign call.

**Immediate actions:**
1. Verify on-chain immediately. Note: `guarded_mint` requires holding the `GuardedTreasury` object — only the operator wallet can call it.
2. If authorized: confirm it was a legitimate fund operation and update campaign registry.
3. If unauthorized: impossible without wallet compromise. Treat as P0-A.

---

### P0-C: Campaign Corruption

**Indicators:**
- Integrity check returns CRITICAL with Merkle root mismatch.
- `is_active` and `is_closed` both true simultaneously (contract prevents this, so indicates RPC data error or a critical bug).
- Pool value decreasing without corresponding claim events.

**Immediate actions:**
1. Re-run integrity check to confirm. Check `/api/health/sui-monitoring`.
2. Compare on-chain object state via suiscan.xyz with expected values.
3. If confirmed: escalate P0 immediately.
4. Pause campaign if wallet is accessible.

---

## P1 — Major Incidents

### P1-A: Unexpected Campaign Pause or Close

**Indicators:**
- Campaign state poller detects `is_active = false` without operator action.
- Users reporting inability to claim.

**Actions:**
1. Verify on-chain.
2. If pause was unauthorized: P0-A escalation.
3. If pause was authorized but undocumented: document retroactively, inform users.
4. Resume via `unpause` when safe.

---

### P1-B: Proof API Down >1 Hour

**Indicators:**
- `/api/health/sui-monitoring` shows proof API errors.
- Users cannot check eligibility.

**Actions:**
1. Check application logs for root cause (server error, RPC dependency, code error).
2. Attempt restart of application server if recoverable.
3. Post status notice: "Proof API temporarily unavailable."
4. Escalate to L3 if root cause unclear after 30 minutes.

---

## P2 — Degraded Incidents

### P2-A: RPC Provider Outage

**Indicators:**
- `/api/health/sui-rpc` returns DOWN.
- Sui network status page shows degradation.

**Actions:**
1. Check status.sui.io.
2. Switch to backup RPC if configured (update `getSuiNetworkUrl` in `lib/sui/client.ts`).
3. Post status notice.
4. Monitor and restore primary RPC when available.

**Backup RPC endpoints (configure as needed):**
- Primary: Sui Foundation fullnode
- Backup: Alchemy Sui node (ALCHEMY_API_KEY available)
- Tertiary: Triton One, Ankr, Blockeden

---

### P2-B: Elevated Claim Failure Rate

**Indicators:**
- Claim failure rate >20% of attempts over 15-minute window.
- Monitoring anomaly alert from `detectClaimAnomalies`.

**Actions:**
1. Identify error codes from failed transactions.
2. If pool depleted: inform users, consider closing campaign gracefully.
3. If proof API error: see P1-B.
4. If RPC: see P2-A.

---

### P2-C: Proof Abuse / Bot Attack

**Indicators:**
- `detectProofAbuse` alerts with HIGH severity.
- Single address with >20 proof requests in 5 minutes.

**Actions:**
1. Review wallet risk profile in monitoring.
2. The proof API is server-side read-only — abuse cannot drain the pool or affect on-chain state.
3. Consider rate limiting at the API layer (Next.js middleware or Vercel edge rules).
4. Log abusing addresses. No on-chain action required.

---

## P3 — Informational Incidents

### P3-A: Single-User Claim Failure

**Actions:** Follow Support Playbook. Document and resolve at L1/L2.

### P3-B: Monitoring Anomaly (Low Severity)

**Actions:** Review anomaly, confirm false positive, document, close.

---

## Post-Incident Protocol

For P0 and P1 incidents:
1. Write incident report within 24 hours.
2. Root cause analysis within 72 hours.
3. Update this plan if gaps were identified.
4. Review and update accepted risk register.
5. Communicate to community if user-facing impact occurred.

---

*Plan version 1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
