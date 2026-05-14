# Axiom Protocol — Avalanche Limited Pilot Checklist

**Document type:** Operational Checklist  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.0.0  
**Created:** 2026-05-14  

---

## How to Use This Checklist

Complete each section in order. Do not proceed to the next phase if any item fails.
Record operator initials and timestamp for each completed section.

Commands use `scripts/deploy/avalanche/verify-mainnet-onchain.ts` for read-only checks.

```bash
# Read-only on-chain check
npx tsx scripts/deploy/avalanche/verify-mainnet-onchain.ts

# Reserve reconciliation
AVALANCHE_MAINNET=true npx tsx scripts/reconcile-avalanche-reserve.ts
```

---

## SECTION 1 — Before First Pilot Mint

Complete once before any minting activity begins.

### 1A — Accepted-Risk Authorization

- [ ] `AXIOM_AVALANCHE_LIMITED_PILOT_ACCEPTED_RISK.md` is signed by all three parties (Technical Lead, Operations Lead, Compliance Counsel)
- [ ] Pilot policy `AXIOM_AVALANCHE_LIMITED_PILOT_POLICY.md` has been read and acknowledged
- [ ] Pilot ledger `AXIOM_AVALANCHE_LIMITED_PILOT_LEDGER.md` has been initialized with starting state

### 1B — On-Chain State Verification

- [ ] Confirm US-only allowlist still active: `isCountryAllowed(MC, 840) = true`
- [ ] Confirm no unintended country enabled: `isCountryAllowed(MC, 826) = false` (UK), `isCountryAllowed(MC, 276) = false` (DE)
- [ ] Confirm transfer cap: `getTransferLimit(MC) = 5000000000` (5,000 AXUSD)
- [ ] Confirm totalSupply: `totalSupply() = 0` (starting baseline)
- [ ] Confirm modules bound: `isModuleBound(CountryAllowModule) = true`
- [ ] Confirm modules bound: `isModuleBound(TransferLimitModule) = true`
- [ ] Confirm deployer roles: `isAgent(deployer) = true` (accepted-risk configuration)
- [ ] Confirm token wiring: `identityRegistry()` → correct address
- [ ] Confirm token wiring: `compliance()` → correct address

### 1C — Pilot Cap Verification

- [ ] Confirm total pilot TVL cap: 2,500 AXUSD (hard limit)
- [ ] Confirm single-wallet mint cap: 1,000 AXUSD per participant
- [ ] Record starting totalSupply in pilot ledger: __________ AXUSD
- [ ] Record starting block number in pilot ledger: __________

### 1D — Participant Wallet Verification

- [ ] First participant wallet address pre-approved: __________
- [ ] Jurisdiction confirmed as US: __________ (attestation method: __________)
- [ ] Wallet recorded in pilot ledger
- [ ] Mint amount for first mint: __________ AXUSD (must be ≤ 1,000 AXUSD)
- [ ] Cumulative after first mint: __________ AXUSD (must be ≤ 2,500 AXUSD)

### 1E — Reconciliation Baseline

- [ ] Run read-only reconciliation against mainnet
- [ ] Record reconciliation result: __________
- [ ] Confirm reconciliation exit code = 0 (or CRITICAL documented as expected baseline)
- [ ] Record Capinfra authorized supply: __________ AXUSD
- [ ] Record on-chain totalSupply: __________ AXUSD

**Operator initials:** __________ **Timestamp (UTC):** __________________

---

## SECTION 2 — After Each Pilot Mint

Complete immediately after each minting transaction.

### 2A — Transaction Confirmation

- [ ] Mint transaction hash: `0x__________`
- [ ] Transaction mined: confirmed at block __________
- [ ] Transaction status: 1 (success)

### 2B — Supply Delta Verification

- [ ] totalSupply before mint: __________ AXUSD
- [ ] Mint amount: __________ AXUSD
- [ ] Expected totalSupply after: __________ AXUSD
- [ ] Actual totalSupply after: __________ (read from chain: `totalSupply()`)
- [ ] Supply delta matches: __________ (YES / NO)
- [ ] If NO — halt and investigate immediately

### 2C — Recipient Verification

- [ ] Recipient wallet address: `0x__________`
- [ ] Wallet was pre-approved in pilot ledger: YES / NO
- [ ] Balance confirmed at recipient: __________ AXUSD

### 2D — Reconciliation

- [ ] Run reconciliation script after mint
- [ ] Capinfra authorized supply: __________ AXUSD
- [ ] On-chain totalSupply: __________ AXUSD
- [ ] Discrepancy: __________ AXUSD (must be ≤ 0.01 AXUSD, or reconciliation logged)
- [ ] Reconciliation result: CLEAN / DISCREPANCY (if discrepancy, document below)

Discrepancy notes (if any): _________________________________________________

### 2E — Pilot Ledger Update

- [ ] New row added to `AXIOM_AVALANCHE_LIMITED_PILOT_LEDGER.md`
- [ ] Cumulative pilot minted updated: __________ AXUSD
- [ ] Cumulative vs cap: __________ / 2,500 AXUSD
- [ ] Cap check: WITHIN CAP / APPROACHING CAP / CAP REACHED

If CAP REACHED — halt all minting. Begin pilot close procedure.

**Operator initials:** __________ **Timestamp (UTC):** __________________

---

## SECTION 3 — Daily During Pilot

Complete once per calendar day while pilot is active.

### 3A — Daily Reconciliation

- [ ] Run daily reconciliation: `AVALANCHE_MAINNET=true npx tsx scripts/reconcile-avalanche-reserve.ts`
- [ ] Reconciliation exit code: __________
- [ ] totalSupply on-chain: __________ AXUSD
- [ ] Capinfra authorized: __________ AXUSD
- [ ] Discrepancy: __________ AXUSD
- [ ] Result: CLEAN / WARNING / CRITICAL
- [ ] Report filed to `documents/operations/reconciliation-reports/YYYY-MM-DD-avalanche-pilot.json`

### 3B — Role-Risk Check

- [ ] `isAgent(0x8d7892CF226B43d48B6e3ce988A1274e6D114C96)` = true (expected — accepted-risk)
- [ ] No unexpected additional agents registered
- [ ] Deployer nonce matches expected count (no unexpected transactions)
- [ ] No unusual transactions from deployer EOA on Snowtrace

### 3C — Cap Check

- [ ] Cumulative pilot minted today: __________ AXUSD
- [ ] Remaining capacity: __________ AXUSD (cap 2,500 minus cumulative)
- [ ] Status: WITHIN CAP / AT 80% CAP / CAP REACHED

### 3D — Module Status Check

- [ ] `isModuleBound(CountryAllowModule)` = true
- [ ] `isModuleBound(TransferLimitModule)` = true
- [ ] `isCountryAllowed(MC, 840)` = true
- [ ] `getTransferLimit(MC)` = 5000000000

### 3E — Incident Log Review

- [ ] Reviewed `documents/operations/incident-log/` for any new entries
- [ ] No unresolved incidents active
- [ ] Any P1/P2 incidents: __________ (describe or N/A)

**Operator initials:** __________ **Timestamp (UTC):** __________________

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

**Operator initials:** __________ **Timestamp (UTC):** __________________

---

*Axiom Protocol Internal — Pilot Checklist v1.0.0 — 2026-05-14*
