# Note Participation Settlement 001

**Internal Name:** Note Participation Settlement 001 – Observation Window Pilot
**Version:** 1.0
**Date:** February 3, 2026
**Classification:** Internal/Execution
**Status:** Ready for Execution

---

## Executive Summary

This document specifies the exact first settlement AXIOM Protocol should execute. The design is intentionally:

- Low risk
- Low capital
- Boring
- Auditable
- Institutionally legible

**Purpose:** Break the zero-history barrier cleanly. This is not about profit.

---

## 1. Asset Type (Non-Negotiable)

### Required

**Performing residential mortgage note participation**

### Excluded

| Asset Type | Reason |
|------------|--------|
| REO | Operational complexity |
| Fix-and-flip | Speculative risk |
| Land | No cashflow |
| Construction | Execution risk |
| Non-performing debt | Recovery uncertainty |

### Rationale

- Cashflow exists
- Legal structure is established
- Underwriting is document-based, not speculative
- No operational headaches

**This keeps risk legal and analytical, not operational.**

---

## 2. Dollar Size (Critical)

### Target Size

**USD 250 – 500 participation**

Yes, that small — on purpose.

### Why This Size

Institutions care about:
- Process integrity
- Settlement correctness
- Audit trail

They do NOT care about yield at this stage.

### This Amount Is:

| Characteristic | Value |
|----------------|-------|
| Risk exposure | Trivial enough to lose without damage |
| Legal standing | Real enough to be legally binding |
| System proof | Perfect for proof-of-system |

---

## 3. Counterparty Profile

### Structure

**AXIOM does NOT originate the note.**

AXIOM participates in:
- A verified seller-financed note, OR
- An existing performing note from a licensed note holder or platform

### Key Requirement

Counterparty already has executed note history.

**AXIOM is the participant, not the issuer.**

---

## 4. Capital Path (Step-by-Step)

### Step 1: Capital In

| Field | Value |
|-------|-------|
| Source | Founder funds |
| Amount | USD 250–500 |
| Label | "Founder Settlement Capital – Pilot" |
| Token minting | NO – none yet |

**This avoids regulatory confusion.**

---

### Step 2: Note Intake via Portal

The Note Acquisition & Research Portal captures:

#### Mandatory Fields

| Field | Description |
|-------|-------------|
| Original note date | Date note was originated |
| UPB | Unpaid principal balance |
| Interest rate | Current rate |
| Payment history | 12+ months required |
| Borrower occupancy | Owner-occupied, investment, etc. |
| Servicer name | Current loan servicer |
| State | Property state |
| Lien position | 1st, 2nd, etc. |

**Node operators validate documentation only. No opinions. No hype.**

---

### Step 3: Node Verification Layer

#### Requirements

At least **3 independent node operators** must:

| Verification | Action |
|--------------|--------|
| Document consistency | Confirm all docs match |
| Payment history | Verify 12+ months payments |
| Lien position | Verify recorded lien |
| Servicing | Confirm servicer exists |

#### Deliverable

Each node operator signs:
- Cryptographic verification receipt
- Timestamped attestation

**This is the proof-of-diligence artifact.**

---

### Step 4: Participation Agreement Execution

AXIOM executes a **note participation agreement** with explicit language:

| Term | Value |
|------|-------|
| Servicing authority | NO |
| Foreclosure rights | NO |
| Structure | Cashflow participation ONLY |

**This avoids licensing exposure.**

---

### Step 5: Settlement Execution

#### Actions

1. Funds transferred to counterparty
2. Documentation stored in:
   - DeNet
   - IPFS
   - Internal registry hash

#### Result

The system now has:
- A real settlement
- A real asset
- A real counterparty

---

### Step 6: Cashflow Event

#### Milestone

When the first borrower payment clears:
- Even if it's $10
- Even if it's delayed

**That single payment is the milestone.**

#### Why This Matters

| Proof | Description |
|-------|-------------|
| End-to-end loop | Complete capital cycle proven |
| Reality touch | System connects to real-world cashflow |
| Reconciliation | Ledger accurately reflects state |

---

## 5. Outputs From Settlement 001

After Settlement 001, AXIOM will have:

### 1. Closed Transaction Record

- Capital in
- Capital deployed
- Asset identified
- Counterparty verified

### 2. Diligence Audit Trail

- Node reviews
- Document hashes
- Timestamps

### 3. Cashflow Proof

- First payment receipt
- Reconciliation record
- Ledger entry

### 4. Replicable SOP

This becomes:
- The template for every future settlement
- The foundation for scale

---

## 6. Prohibited Actions

**You do NOT:**

| Action | Status |
|--------|--------|
| Tokenize the note | PROHIBITED |
| Market the yield | PROHIBITED |
| Promise returns | PROHIBITED |
| Open participation to public | PROHIBITED |
| Mint AXUSD | PROHIBITED |

**This is internal proof, not fundraising.**

---

## 7. Institutional Value

From an institutional standpoint, this accomplishes four critical things:

| Value | Description |
|-------|-------------|
| 1. Removes execution doubt | Proves system can settle |
| 2. Demonstrates discipline | Shows conservative approach |
| 3. Shows regulatory respect | No premature tokenization |
| 4. Proves reality connection | Real cashflows, not simulations |

**Most protocols never do this step properly. AXIOM will.**

---

## 8. Post-Settlement 001 Sequence

Only AFTER Settlement 001 clears do you:

| Order | Action |
|-------|--------|
| 1 | Run Settlement 002 (same structure) |
| 2 | Formalize node compensation logic |
| 3 | Introduce AXIOM token staking rights |
| 4 | Prepare AXUSD minting rules |

**Settlement first. Instruments later.**

---

## 9. Success Criteria

Settlement 001 is complete when:

| Criterion | Status |
|-----------|--------|
| USD 250-500 deployed | ☐ |
| 3+ node verifications signed | ☐ |
| Participation agreement executed | ☐ |
| Funds transferred | ☐ |
| Documents stored (DeNet/IPFS) | ☐ |
| First cashflow received | ☐ |
| Ledger reconciled | ☐ |

---

## 10. Strategic Principle

> "A verifiable, boring, real financial transaction inside a new system."

This unlocks:
- Credibility
- Partners
- Capital
- Patience from serious people

---

## Appendix A: Required Documents

| Document | Required |
|----------|----------|
| Original promissory note | YES |
| Deed of trust / mortgage | YES |
| Payment history (12+ mo) | YES |
| Current property valuation | YES |
| Servicer confirmation | YES |
| Title report | RECOMMENDED |

---

## Appendix B: Node Operator Verification Template

```
NODE VERIFICATION RECEIPT
=========================
Settlement ID: NPS-001
Operator Wallet: 0x...
Verification Date: YYYY-MM-DD HH:MM:SS UTC

VERIFIED ITEMS:
☐ Document consistency confirmed
☐ Payment history verified (12+ months)
☐ Lien position verified
☐ Servicer existence confirmed

NOTES:
[Any observations]

SIGNATURE:
[Cryptographic signature]
[Timestamp hash]
```

---

## Appendix C: Participation Agreement Key Terms

| Term | Specification |
|------|---------------|
| Participation percentage | X% of cashflows |
| Payment frequency | Monthly |
| Servicing rights | NONE – retained by seller |
| Foreclosure rights | NONE – retained by seller |
| Term | Until note payoff or sale |
| Early exit | Per agreement terms |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | AXIOM Team | Initial specification |

---

*This document represents the execution specification for Settlement 001. Deviations require documented approval.*
