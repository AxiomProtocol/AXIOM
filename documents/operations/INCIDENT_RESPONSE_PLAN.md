# Axiom Protocol — Avalanche Compliance Stack Incident Response Plan

**Version:** 1.0.0  
**Network:** Avalanche C-Chain (Fuji testnet: 43113 / Mainnet: 43114)  
**Created:** 2026-05-14  
**Status:** DRAFT — Pending operations leadership review and acceptance  
**Gate:** G11 — Satisfies acceptance criteria for `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`

---

## 1. Purpose and Scope

This plan defines the procedures, roles, and escalation paths for responding to incidents affecting the Axiom Protocol Avalanche compliance stack. It covers the 8-contract ERC-3643 deployment (`AxiomStable3643`, `ModularCompliance`, `CountryAllowModule`, `TransferLimitModule`, `IdentityRegistry`, `IdentityRegistryStorage`, `TrustedIssuersRegistry`, `ClaimTopicsRegistry`) and the Capinfra AVALANCHE settlement adapter.

Incidents are classified into six categories: contract pause, account freeze, role compromise, RPC outage, compliance module failure, and reserve discrepancy.

---

## 2. Severity Levels

| Level | Definition | Target response time | Target resolution time |
|---|---|---|---|
| P1 — Critical | Loss of funds, unauthorized mint, role compromise, compliance bypass | 15 minutes | 4 hours |
| P2 — High | Settlement pipeline stuck, RPC total outage, reserve discrepancy exceeds tolerance | 30 minutes | 8 hours |
| P3 — Medium | Partial RPC degradation, single-node failure, non-critical module error | 2 hours | 24 hours |
| P4 — Low | Documentation gap, non-blocking alert, monitoring false positive | 1 business day | 1 week |

---

## 3. Roles and Responsibilities

| Role | Responsibilities |
|---|---|
| **On-call Engineer** | First responder; triage; execute technical remediation steps |
| **Technical Lead** | Owns escalation decisions; authorizes PAUSE and freeze actions; approves Safe transactions |
| **Operations Lead** | Coordinates communication; owns G11/G12 review sign-off; authorizes reserve reconciliation |
| **Compliance Counsel** | Authorizes account freeze for compliance reasons; approves jurisdiction allowlist changes |
| **Multi-sig Signers (Gnosis Safe)** | Sign any administrative transactions requiring multi-party authorization |

**Minimum on-call coverage:** At least one On-call Engineer and one Technical Lead must be reachable at all times once mainnet is live.

---

## 4. Contact Escalation Chain

```
Incident detected
    → On-call Engineer (immediate; Slack #avalanche-ops)
        → Technical Lead (if P1 or P2, or if engineer needs authorization)
            → Operations Lead (if business communication required)
                → Compliance Counsel (if jurisdiction or freeze decision needed)
                    → Multi-sig Signers (if Safe transaction required)
```

All P1 incidents must notify the Technical Lead within 15 minutes regardless of progress.

---

## 5. Incident Runbooks

---

### 5A — Contract Pause

**Trigger conditions:**
- Unauthorized mint detected on-chain
- Smart contract exploit or suspicious transfer pattern
- Compliance system failure that could allow unauthorized transfers
- Instruction from Technical Lead or Compliance Counsel

**Who can authorize:** Technical Lead (P1 decision, single actor). Safe signer threshold not required for emergency pause — the `PAUSER_ROLE` holder can act unilaterally.

**Runbook:**

1. Confirm the incident warrants a pause (check Snowtrace for suspicious activity, check settlement logs).
2. Technical Lead authorizes pause via Slack or direct communication.
3. On-call Engineer calls `AxiomStable3643.pause()` using the operations key that holds `PAUSER_ROLE`.
4. Verify the pause on-chain: `AxiomStable3643.paused()` must return `true`.
5. Verify that transfers fail with `PAUSED` error in smoke test environment.
6. Emit audit event in Capinfra: set `AVALANCHE_ADAPTER_MODE=DISABLED` to prevent any new LIVE dispatches while paused.
7. Notify all stakeholders: post in #avalanche-ops with txHash, block number, and reason.
8. Preserve all Snowtrace logs and Capinfra audit logs for post-incident review.
9. Investigate root cause before unpausing.

**Unpause criteria:**
- Root cause identified and remediated.
- Technical Lead and Operations Lead both approve unpause.
- Compliance Counsel reviews if the incident was compliance-related.
- Safe transaction required if multi-party authorization is in place (post G03–G06).

**Capinfra state during pause:**
- Set `AVALANCHE_ADAPTER_MODE=DISABLED`.
- Any in-flight SUBMITTED instructions should be monitored — do not call `externallySettleInstruction` until unpause.
- FAILED status can be assigned to stuck SUBMITTED instructions after Technical Lead review.

---

### 5B — Account Freeze

**Trigger conditions:**
- AML/KYC compliance flag on a wallet
- Instruction from Compliance Counsel
- Suspected fraud or sybil activity

**Who can authorize:** Compliance Counsel (compliance freeze) or Technical Lead (security freeze). Both require documentation before action.

**Runbook:**

1. Compliance Counsel or Technical Lead issues written freeze request (Slack DM or email with wallet address and reason).
2. On-call Engineer confirms the wallet is registered in `IdentityRegistry`.
3. On-call Engineer calls `AxiomStable3643.freezeAddress(walletAddress, true)` using the operations key with `AGENT_ROLE`.
4. Verify on-chain: `AxiomStable3643.isFrozen(walletAddress)` returns `true`.
5. Confirm that transfers from/to the frozen wallet are blocked (test with a minimal transfer if safe to do so).
6. Document in #avalanche-ops: wallet address (redacted if sensitive), freeze txHash, authorizing party.
7. File a freeze record: update `documents/operations/account-freezes.md` (create if first freeze).

**Unfreeze criteria:**
- Compliance Counsel confirms the flag is resolved.
- Written authorization from Compliance Counsel and Technical Lead.
- On-chain call: `freezeAddress(walletAddress, false)`.

---

### 5C — Role Compromise

**Trigger conditions:**
- `DEPLOYER_PRIVATE_KEY` or `AVALANCHE_DEPLOYER_PRIVATE_KEY` confirmed or suspected leaked
- Unauthorized `grantRole` or `revokeRole` event on Snowtrace
- Unauthorized mint or identity registration not matching internal records

**Severity:** Always P1.

**Who can authorize:** Technical Lead; requires immediate action without waiting for approval chain.

**Runbook:**

1. **Immediate:** Pause the token (`AxiomStable3643.pause()`) using any available role holder. Do not wait to confirm compromise — err on the side of pause.
2. **Immediate:** Set `AVALANCHE_ADAPTER_MODE=DISABLED` in production env.
3. **Within 15 minutes:** Rotate the compromised key. Revoke the compromised key from all roles via Gnosis Safe (post G06) or current role holder.
4. Check Snowtrace for any transactions sent by the compromised address in the last 24 hours. Document every unauthorized transaction.
5. Assess whether any unauthorized mint occurred:
   - Compare `AxiomStable3643.totalSupply()` against Capinfra `cap_settlement_instructions` SETTLED MINT records.
   - Any discrepancy is a reserve emergency — escalate to G12 reconciliation process.
6. If unauthorized mint occurred: freeze affected wallets, document affected amounts, notify Operations Lead and Compliance Counsel.
7. If DEFAULT_ADMIN_ROLE was compromised: all role grants since the compromise must be audited and reverted.
8. After containment: convene post-incident review within 24 hours.
9. Before unpause: new key must be provisioned, all roles verified, and second operator confirms on-chain state.

**Post-compromise hardening:**
- `AVALANCHE_DEPLOYER_PRIVATE_KEY` must be distinct from `DEPLOYER_PRIVATE_KEY` (Task #484).
- Private keys in cold storage after role renunciation (G06).
- Safe signer threshold enforces multi-party authorization going forward.

---

### 5D — RPC Outage

**Trigger conditions:**
- `AVALANCHE_RPC_URL` or `AVALANCHE_FUJI_RPC_URL` returns errors or timeouts.
- Capinfra `liveDispatch()` throws provider errors.
- LIVE instructions stuck in EXECUTING or SUBMITTED for > 10 minutes.

**Severity:** P2 (total outage), P3 (partial degradation).

**Runbook:**

1. Verify the outage: `curl -X POST $AVALANCHE_RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`.
2. If provider down, set `AVALANCHE_ADAPTER_MODE=DRY_RUN` immediately to prevent new LIVE dispatch failures.
3. Check the Alchemy / Ankr / Infura status page for the provider.
4. If the primary provider is down, switch `AVALANCHE_RPC_URL` to a backup RPC:
   - Alchemy: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
   - Public fallback: `https://api.avax.network/ext/bc/C/rpc` (rate-limited)
5. Restart the Capinfra adapter after env var update.
6. Verify recovery: confirm `eth_chainId` returns 43114 from the new RPC.
7. Re-enable LIVE mode: `AVALANCHE_ADAPTER_MODE=LIVE` if recovered.
8. For instructions stuck in SUBMITTED during the outage: manually verify on Snowtrace once RPC is restored, then call `externallySettleInstruction` for any confirmed transactions.
9. For instructions that never broadcast: check EXECUTING status — if no txHash in payloadJson.adapterReceipt, the dispatch failed before broadcast. Re-execute if appropriate.

**T03 chain ID safeguard:** After switching to a backup RPC, the `rpcChainId !== asset.chainId` check will catch any misconfigured endpoint automatically.

---

### 5E — Compliance Module Failure

**Trigger conditions:**
- `CountryAllowModule` or `TransferLimitModule` returns unexpected results.
- Transfers that should be blocked are succeeding (compliance bypass).
- Transfers that should succeed are being blocked (false positive).

**Severity:** P1 if compliance bypass; P2/P3 if false positive.

**Runbook for compliance bypass (P1):**
1. Pause the token immediately.
2. Check `ModularCompliance.getModules(compliance)` — verify both modules are still bound.
3. Check `CountryAllowModule.isAllowAll(compliance)` — if `true` and this was not authorized, this is a misconfiguration.
4. Check `TransferLimitModule.getTransferLimit(compliance)` — if `0`, limit is effectively disabled.
5. If either module was removed or misconfigured without authorization: treat as role compromise (5C).
6. Remediate: re-add missing module, reconfigure settings, verify on-chain.
7. Unpause only after module state is confirmed correct.

**Runbook for false positive (P2/P3):**
1. Do NOT pause — token is operational.
2. Check the blocked wallet's country code in `IdentityRegistry`.
3. Check the `CountryAllowModule` allowlist for that country code.
4. Check `TransferLimitModule` current limit and the wallet's rolling 24h total.
5. If the block is correct (compliant behavior): inform the user; document the case.
6. If the block is incorrect (misconfiguration): Compliance Counsel must authorize fix; Technical Lead applies the correction on-chain.
7. Correction options: update country allowlist, adjust transfer limit, update identity record.

---

### 5F — Reserve Discrepancy

**Trigger conditions:**
- Total `AxiomStable3643.totalSupply()` on Avalanche exceeds the authorized AXUSD bridge/issuance from the canonical reserve on Arbitrum One.
- Capinfra `cap_positions` aggregate for AXUSD-AVALANCHE does not reconcile with on-chain supply.
- Reserve reconciliation report (G12) flags a discrepancy exceeding tolerance.

**Severity:** P1 if supply > authorized issuance (unauthorized mint); P2 if supply < authorized issuance (unreported burn or accounting gap).

**Runbook:**

1. Capture snapshots:
   - `AxiomStable3643.totalSupply()` — on-chain Avalanche supply (in wei, 6 decimals).
   - Capinfra sum of all SETTLED MINT instructions for AXUSD-AVALANCHE assets.
   - Canonical reserve balance on Arbitrum One (PSM or reserve contract).
2. Compute: `delta = on_chain_supply - capinfra_settled_mints`.
3. If `delta > tolerance` (unauthorized supply):
   - Pause immediately (5A).
   - Treat as role compromise (5C) — investigate unauthorized mint source.
4. If `delta < -tolerance` (accounting gap):
   - Do not pause — no excess supply.
   - Audit Capinfra `cap_settlement_instructions` for SETTLED mints with missing `externallySettleInstruction` confirmation.
   - Check for SUBMITTED instructions that were confirmed on-chain but not settled in DB.
5. File a discrepancy report: document both snapshots, delta, block numbers, and timestamps.
6. Operations Lead and Compliance Counsel must review before any reconciliation adjustments.
7. If manual DB correction is required: must be authorized by Technical Lead and Operations Lead jointly, with full audit trail in `cap_audit_events`.

---

## 6. Monitoring and Alerting

The following monitoring must be in place before mainnet go-live:

| Signal | Target | Alert threshold |
|---|---|---|
| `AxiomStable3643.totalSupply()` | On-chain (Snowtrace, Alchemy webhook) | > authorized issuance |
| Capinfra SUBMITTED → SETTLED lag | Internal metrics | > 30 minutes |
| LIVE dispatch error rate | Capinfra logs | > 0 in 5 minutes |
| AVALANCHE_RPC_URL latency | External monitor | > 5000ms p99 |
| `cap_audit_events` settlement.failed count | DB query / Datadog | > 0 in 1 hour |
| Unauthorized `grantRole` event | Snowtrace event indexer | Any event |

---

## 7. Communication Templates

**P1 internal alert:**
```
[P1 AVALANCHE INCIDENT] <brief description>
Time detected: <UTC timestamp>
On-call: <name>
Action taken: <pause / freeze / disabled>
TxHash: <hash> Block: <number>
Next: <investigation step>
```

**Stakeholder update (every 30 min during P1):**
```
Update <N> — <UTC timestamp>
Status: <Investigating / Contained / Remediating / Resolved>
User impact: <Yes/No — describe>
ETA to resolution: <estimate>
```

---

## 8. Post-Incident Review

All P1 and P2 incidents require a post-incident review (PIR) within 48 hours of resolution. The PIR must document:

1. Incident timeline (detection → containment → resolution)
2. Root cause
3. User impact (wallets affected, amounts, duration)
4. Actions taken and their effectiveness
5. Follow-up items to prevent recurrence
6. Gate or hardening item created in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` if applicable

PIR documents are filed under `documents/operations/pir/` with naming `PIR-YYYY-MM-DD-<title>.md`.

---

## 9. Pre-Mainnet Checklist for This Plan

Before mainnet deployment, the following must be confirmed for this plan to be operational:

- [ ] Gnosis Safe deployed on Avalanche mainnet and operational (G03)
- [ ] AGENT_ROLE held by a controlled operations address (G04)
- [ ] PAUSER_ROLE holder identified (same as AGENT or separate)
- [ ] All role holders documented with current key custody info
- [ ] Backup RPC URL for Avalanche mainnet configured and tested
- [ ] Monitoring alerts active for all signals in §6
- [ ] On-call rotation established with at least 2 engineers
- [ ] This plan reviewed and accepted by Operations Lead

---

*Axiom Protocol Internal — Gate G11 — 2026-05-14*  
*Status: DRAFT — requires Operations Lead acceptance before mainnet.*
