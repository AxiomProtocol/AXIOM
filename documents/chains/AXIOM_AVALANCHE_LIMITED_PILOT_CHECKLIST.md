# Axiom Protocol — Avalanche Limited Pilot Checklist

**Document type:** Operational Checklist  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.1.0  
**Created:** 2026-05-14  
**Updated:** 2026-05-14  

---

## How to Use This Checklist

Complete each section in order. Do not proceed to the next phase if any item fails.
Record operator initials and timestamp for each completed section.

```bash
# Pre-mint preflight
npx tsx scripts/deploy/avalanche/preflight-mainnet.ts

# Post-mint reconciliation (read-only)
npx tsx scripts/deploy/avalanche/post-mint-reconcile.ts

# Full reserve reconciliation
AVALANCHE_MAINNET=true npx tsx scripts/reconcile-avalanche-reserve.ts
```

---

## SECTION 1 — Before First Pilot Mint

Complete once before any minting activity begins.

### 1A — Accepted-Risk Authorization

- [x] `AXIOM_AVALANCHE_LIMITED_PILOT_ACCEPTED_RISK.md` is signed by all three parties (Technical Lead, Operations Lead, Compliance Counsel) — SIGNED 2026-05-14
- [x] Pilot policy `AXIOM_AVALANCHE_LIMITED_PILOT_POLICY.md` has been read and acknowledged
- [x] Pilot ledger `AXIOM_AVALANCHE_LIMITED_PILOT_LEDGER.md` has been initialized with starting state

### 1B — On-Chain State Verification

- [x] Confirm US-only allowlist still active: `isCountryAllowed(MC, 840) = true` ✓
- [x] Confirm no unintended country enabled: `isCountryAllowed(MC, 826) = false` (UK) ✓
- [x] Confirm transfer cap: `getTransferLimit(MC) = 5000000000` (5,000 AXUSD) ✓
- [x] Confirm totalSupply: `totalSupply() = 0` (starting baseline) ✓
- [x] Confirm modules bound: `isModuleBound(CountryAllowModule) = true` ✓
- [x] Confirm modules bound: `isModuleBound(TransferLimitModule) = true` ✓
- [x] Confirm deployer roles: `isAgent(deployer) = true` (accepted-risk configuration) ✓
- [x] Confirm token wiring: `identityRegistry()` → `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` ✓
- [x] Confirm token wiring: `compliance()` → `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` ✓

### 1C — Pilot Cap Verification

- [x] Confirm total pilot TVL cap: 2,500 AXUSD (hard limit) ✓
- [x] Confirm single-wallet mint cap: 1,000 AXUSD per participant ✓
- [x] Record starting totalSupply in pilot ledger: **0.000000 AXUSD**
- [x] Record starting block number in pilot ledger: **85380043**

### 1D — Participant Wallet Verification

- [x] First participant wallet address pre-approved: `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`
- [x] Jurisdiction confirmed as US: **840** (attestation method: on-chain IdentityRegistry registration + CountryAllowModule)
- [x] Wallet recorded in pilot ledger ✓
- [x] Mint amount for first mint: **100.000000 AXUSD** (≤ 1,000 AXUSD ✓)
- [x] Cumulative after first mint: **100.000000 AXUSD** (≤ 2,500 AXUSD ✓)

### 1E — Reconciliation Baseline

- [x] Run read-only reconciliation against mainnet ✓
- [x] Record reconciliation result: **CLEAN**
- [x] Confirm reconciliation exit code = 0 ✓
- [x] Record on-chain totalSupply: **0.000000 AXUSD** (pre-mint baseline)

**Operator initials:** AXIOM-OP  **Timestamp (UTC):** 2026-05-14T03:07:19Z

---

## SECTION 2 — After Each Pilot Mint

### MINT #1 — 2026-05-14

### 2A — Transaction Confirmation

- [x] Identity registration tx: `0x6cb5471eb7c0704bca69d53615314de5050a04a0053aafb039bdb2ffb8d75169` — block 85380049 — status 1
- [x] Mint transaction hash: `0x4eae11395b76da739df8e74a8b15ba984a79b13636b19f6d6f8b649a4574432a`
- [x] Transaction mined: confirmed at block **85380054** ✓
- [x] Transaction status: **1** (success) ✓

### 2B — Supply Delta Verification

- [x] totalSupply before mint: **0.000000 AXUSD**
- [x] Mint amount: **100.000000 AXUSD**
- [x] Expected totalSupply after: **100.000000 AXUSD**
- [x] Actual totalSupply after: **100.000000 AXUSD** ✓
- [x] Supply delta matches: **YES** ✓

### 2C — Recipient Verification

- [x] Recipient wallet address: `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`
- [x] Wallet was pre-approved in pilot ledger: **YES** ✓
- [x] Balance confirmed at recipient: **100.000000 AXUSD** ✓
- [x] Jurisdiction on-chain: **840 (US)** ✓
- [x] `isVerified(recipient)` = **true** ✓

### 2D — Reconciliation

- [x] Run reconciliation script after mint ✓
- [x] On-chain totalSupply: **100.000000 AXUSD**
- [x] Discrepancy: **0 AXUSD** (manual pilot — no Capinfra position yet)
- [x] Reconciliation result: **CLEAN** ✓

### 2E — Pilot Ledger Update

- [x] New row added to `AXIOM_AVALANCHE_LIMITED_PILOT_LEDGER.md` ✓
- [x] Cumulative pilot minted updated: **100.000000 AXUSD**
- [x] Cumulative vs cap: **100.000000 / 2,500 AXUSD (4%)**
- [x] Cap check: **WITHIN CAP** ✓

**Operator initials:** AXIOM-OP  **Timestamp (UTC):** 2026-05-14T03:11:34Z

---

## SECTION 3 — Daily During Pilot

Complete once per calendar day while pilot is active.

### 3A — Daily Reconciliation

- [ ] Run daily reconciliation: `npx tsx scripts/deploy/avalanche/post-mint-reconcile.ts`
- [ ] Reconciliation exit code: __________
- [ ] totalSupply on-chain: __________ AXUSD
- [ ] Result: CLEAN / WARNING / CRITICAL

### 3B — Role-Risk Check

- [ ] `isAgent(0x8d7892CF226B43d48B6e3ce988A1274e6D114C96)` = true (expected — accepted-risk)
- [ ] No unexpected additional agents registered
- [ ] No unusual transactions from deployer EOA on Snowtrace

### 3C — Cap Check

- [ ] Cumulative pilot minted today: __________ AXUSD
- [ ] Remaining capacity: __________ AXUSD

### 3D — Module Status Check

- [ ] `isModuleBound(CountryAllowModule)` = true
- [ ] `isModuleBound(TransferLimitModule)` = true
- [ ] `isCountryAllowed(MC, 840)` = true
- [ ] `getTransferLimit(MC)` = 5000000000

### 3E — Incident Log Review

- [ ] No unresolved incidents active

**Operator initials:** __________  **Timestamp (UTC):** __________________

---

## SECTION 4 — Stop Conditions

If any of the following are observed, **immediately halt all minting** and initiate incident response.

| ID | Condition | Check | Action |
|---|---|---|---|
| S01 | Unauthorized mint | totalSupply increased without ledger entry | HALT + escalate |
| S02 | Role anomaly | Unexpected agent/admin/minter address | HALT + escalate |
| S03 | Failed reconciliation | Discrepancy > 0.01 AXUSD | HALT + investigate |
| S04 | Cap breach | Cumulative ≥ 2,500 AXUSD | HALT + review before next mint |
| S05 | Module detachment | CAM or TLM `isModuleBound = false` | HALT + escalate |
| S06 | Country allowlist anomaly | 840 = false OR unintended country = true | HALT + escalate |
| S07 | Deployer key activity | Unexpected nonce increase | HALT + escalate + incident |
| S08 | Contract code change | Bytecode at address changed | HALT + escalate |

**Escalation contact:** Per `documents/operations/INCIDENT_RESPONSE_PLAN.md` escalation chain.

---

## SECTION 5 — Pilot Close

Complete when the pilot is ended (cap reached or operator decision).

- [ ] Final reconciliation run and report filed
- [ ] Final pilot ledger row completed
- [ ] Total minted confirmed: __________ AXUSD
- [ ] All ledger entries reviewed — no unresolved anomalies
- [ ] Pilot close report filed: `documents/chains/AXIOM_AVALANCHE_PILOT_CLOSE_REPORT.md`
- [ ] Begin exit criteria checklist (`AXIOM_AVALANCHE_LIMITED_PILOT_POLICY.md §10`)

**Operator initials:** __________  **Timestamp (UTC):** __________________

---

*Axiom Protocol Internal — Pilot Checklist v1.1.0 — Updated 2026-05-14*
