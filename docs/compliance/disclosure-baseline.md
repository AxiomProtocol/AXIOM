# Disclosure Page — Canonical Baseline & Regression Guard

**Established:** 2026-03-26  
**Baseline checkpoint:** `051c4e5ef6f726ceff18ceca23be3f648b8bd484`  
**Status:** LOCKED — edits require deliberate review against this document  
**Automated check:** `npm run check:disclosure`

---

## 1. Purpose

`pages/disclosure.tsx` is the canonical institutional disclosure document for Axiom Protocol. It is an **operational infrastructure disclosure and status report only** — not investment advice, legal advice, tax advice, a guarantee of performance, or a solicitation.

The page is driven by a single reconciliation snapshot fetched from `/api/solvency/latest`. Every headline number (treasury, liabilities, coverage ratio, policy mode) must be derived from that snapshot. No hardcoded financial figures.

---

## 2. Canonical Source Files

| File | Role |
|---|---|
| `pages/disclosure.tsx` | Primary page — all data objects and rendering |
| `lib/glossary.ts` | Canonical term definitions, forbidden phrases, safe replacements |
| `pages/api/solvency/latest.ts` | Snapshot API — single source of all headline metrics |
| `components/design-law/` | Layout, styling, nav — no financial logic |

Do **not** hardcode financial data in `disclosure.tsx`. All figures come from the snapshot payload.

---

## 3. Approved Section Order

The following is the canonical section sequence. Do not reorder, remove, or merge sections without deliberate review.

```
1.  Page header / document classification banner / snapshot ID + timestamp
2.  Operational Disclosure Notice (AlertCircle banner)
3.  Current Protocol Limitations (seven-point AlertTriangle list)
4.  Executive Summary
    ├─ Treasury Capital (snapshot)
    ├─ AXUSD Outstanding (Protocol Liabilities)
    └─ Coverage Ratio (Snapshot Basis)
5.  Metric Interpretation Guidance
6.  Protocol Limitations note (bootstrap-phase context)
7.  Definitions and Measurement Basis (CR, RR, LBR, LD formulas)
8.  Protocol Architecture (Layer 1–9)
9.  Operational Status
    ├─ Live items
    ├─ Configured-Inactive items
    └─ Planned items
10. AXM Governance Token
11. AXUSD Stablecoin System
    ├─ Canonical notice (Unified AXUSD ERC-3643)
    ├─ PRIMARY AXUSD (Deprecated)
    └─ EULER AXUSD (Deprecated)
12. Euler Lending Markets (eAXUSD-6 / eAXUSD-4 vaults)
13. Euler Earn Vault (earnAXUSD)
14. EulerSwap AXUSD Liquidity Layer
15. Revenue Distribution Engine
16. Lending Fund (SEC Reg D 506(c))
17. Sentinel — Capital Decision Layer
18. MIRDT Capital Intelligence Terminal
19. Signal Validation History
20. MIRDT Guard Rails
21. 52-Week Operational Playbook
22. Adaptive Metrics Engine (AME)
23. Solvency Console
24. The Wealth Practice
25. Capital Deployment Guard Rails
26. Risk Factors
27. Core Contract Registry
28. Appendix: Contract History
29. Institutional Glossary
30. Footer disclaimer
```

---

## 4. Key Legal / Operational Framing Principles

These principles govern ALL public-facing copy on the disclosure page. Any edit that weakens these principles requires explicit review.

### 4.1 Advisory-Only Architecture
- Sentinel is **advisory-only**. No execution authority is active or automated.
- Execution authority requires an explicit community governance vote — this has not yet occurred.
- MIRDT outputs are advisory intelligence only. They are not execution directives, trading signals, or capital deployment orders.
- The Protocol Readiness Score (PRS, 0–10) is informational only.

### 4.2 Deployed ≠ Legally Offered
- A contract's on-chain deployment status does **not** imply:
  - the associated product is legally offered or available for public participation
  - the product is actively accepting capital
  - any offering has been made
- "Live" status in the contract registry means: deployed and source-verified. Nothing more.

### 4.3 Snapshot ≠ Real-Time Attestation
- All headline figures are point-in-time reconciliation snapshots.
- Snapshots are not real-time attestations.
- Snapshots are not equivalent to independent audit findings.
- PSM redemption figures do not represent instant public redemption capacity.

### 4.4 No Offering Through This Disclosure
- This disclosure is not a securities offering.
- The only product with any offering context is the Lending Fund (SEC Reg D 506(c)), and even that context requires: "No offering is made through this disclosure."
- Any future participation requires definitive legal offering documents and accredited investor verification.

### 4.5 Proof of Execution ≠ Financial Proof
- "Proof of Execution Framework" is renamed to **"Auditable Capital Deployment Record"** as the primary label.
- It means: a timestamped, multi-layer operations log — not performance proof, trading proof, yield evidence, or a return guarantee.
- The parenthetical "(Proof of Execution Framework)" is retained for historical continuity only.

### 4.6 GENIUS Act Framing
- AXUSD is "structured with reference to the GENIUS Act (Public Law 119-27)."
- This reference is **not a compliance conclusion**.
- No external legal or regulatory body has confirmed compliance.
- Compliance posture is under continuous legal and operational evaluation.
- External attestation has not been completed and is pending.

### 4.7 Bootstrap Phase Context
- All metrics should be contextualized as bootstrap-phase figures.
- Bootstrap figures are expected to appear constrained.
- They should not be extrapolated as indicative of intended operating scale or future performance.

### 4.8 Unified AXUSD Is Canonical
- The canonical stablecoin is **Unified AXUSD (ERC-3643, T-REX)** at `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`.
- Legacy Primary AXUSD (`0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C`) is deprecated.
- Legacy Euler AXUSD (`0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c`) is deprecated.
- Both legacy contracts must carry "Deprecated" status pills and "Contract (Legacy)" labels wherever referenced.

---

## 5. Forbidden Phrases — Must Not Return

The following phrases are banned from all public-facing disclosure copy. Their reappearance is a regression. The automated check (`npm run check:disclosure`) will flag these.

| Forbidden phrase | Why banned |
|---|---|
| `designed to align with` | Previously used with GENIUS Act; implies self-assessed compliance posture. Replaced by "structured with reference to." |
| `self-assessed` | Implies unilateral compliance judgment with no external verification. |
| `paper trading` | Implies simulation; the system is a capital intelligence advisory engine, not a simulation. |
| `automated trading` | Implies execution authority that does not exist. |
| `trading signal pipeline` | Misrepresents MIRDT as a trading system. |
| `GENIUS Act compliant` | No external body has confirmed compliance; this is a legal conclusion we cannot make. |
| `fully compliant` | Same reason. No external attestation exists. |
| `alignment with GENIUS Act requirements is self-assessed` | Previously used; self-assessed compliance framing is banned. |
| `only platform` / `sole platform` | Absolutist market positioning not supported by evidence. |
| `guaranteed returns` | Prohibited financial claim. |
| `APY` as a guaranteed figure | Must always appear as "Variable" or with explicit qualifier. |

### Additional contextual regressions to watch (cannot be fully automated):
- Any phrasing implying Sentinel has execution authority when it does not.
- Any phrasing implying a contract being "Live" means its product is publicly available.
- Any phrasing implying "Proof of Execution" relates to returns, yield, trading performance, or investment outcomes.
- Any phrasing treating MIRDT output as a capital directive rather than advisory intelligence.
- Any phrasing treating the PSM redemption figure as instant public redemption capacity.
- Any phrasing implying a future roadmap phase is a binding commitment.
- Any phrasing presenting inactive or planned modules as currently operational.

---

## 6. Approved Replacement Concepts (Canonical Framing)

| Concept | Canonical wording |
|---|---|
| Page classification | "Operational infrastructure disclosure and status report" |
| Advisory system posture | "Advisory only — no execution authority" |
| Capital decision framing | "Governance-gated capital recommendation layer" |
| Snapshot values | "Reconciliation snapshot — not real-time attestation" |
| Contract Live status | "Deployed and source-verified on-chain. Does not imply legal offering availability or public participation." |
| No offering statement | "No offering is made through this disclosure." |
| Legal readiness gate | "Product activation subject to legal readiness review, not only infrastructure readiness." |
| PoE primary label | "Auditable Capital Deployment Record" |
| PoE parenthetical | "(Proof of Execution Framework)" — retained for historical continuity |
| Signal audit log | "Signal Validation History (SHA-256 audit chain)" |
| Intelligence terminal | "MIRDT Capital Intelligence Terminal (nine-dimension advisory signal engine)" |
| Readiness score | "Protocol Readiness Score (PRS) — informational only, not an execution directive" |
| Stablecoin system | "Unified AXUSD (ERC-3643, T-REX) — canonical; legacy contracts deprecated" |
| Execution authority | "No execution authority is currently active or automated. Pending explicit community governance vote." |
| GENIUS Act | "Structured with reference to the GENIUS Act (Public Law 119-27); compliance posture under ongoing legal evaluation; external attestation pending." |
| Bootstrap metrics | "Expected to appear constrained; should not be extrapolated as indicative of intended operating scale or future performance." |

---

## 7. Editor Notes — Decision Rules for Future Edits

When editing `pages/disclosure.tsx`, apply these decision rules before saving:

**Rule 1 — Deployed ≠ Offered**  
If you add or update a contract's status to "Live," you must also ensure either (a) the section's text explicitly states deployment ≠ legal offering availability, or (b) the contract's row in the registry table has appropriate status ("Live" means on-chain only, never public availability).

**Rule 2 — Advisory ≠ Execution**  
If you mention Sentinel, MIRDT, PRS, or any signal output, you must include "advisory only" or "informational only" in the same sentence or immediately adjacent sentence. No advisory output may appear without a disclaimer.

**Rule 3 — Snapshot ≠ Attestation**  
Any metric derived from the snapshot must carry a "(Snapshot)" or "(Snapshot Basis)" label, or the section must include the Metric Interpretation Guidance block that explains snapshot accounting.

**Rule 4 — No Binding Commitments**  
Roadmap items, phase timelines, activation estimates, and launch targets must always be accompanied by "operational estimate only" or "does not constitute a binding commitment." The 52-Week Playbook footer achieves this; do not remove it.

**Rule 5 — GENIUS Act Framing**  
Never strengthen the GENIUS Act reference beyond "structured with reference to." Any wording that implies confirmed compliance, alignment, or self-assessed conformance is a regression.

**Rule 6 — Legacy Contract Treatment**  
Legacy Primary AXUSD and Euler AXUSD contracts must always appear with (a) "Deprecated" status pill, (b) reduced opacity, (c) "Contract (Legacy)" label, and (d) migration notice pointing to Unified AXUSD. Do not restore them to active status.

**Rule 7 — PoE Label Hierarchy**  
The primary label is "Auditable Capital Deployment Record." "Proof of Execution Framework" is only used in parentheses or as the `institutional` key in the glossary. It must never appear in primary copy without the not-performance-proof disclaimer.

---

## 8. Automated Regression Check

Run: `npm run check:disclosure`

Script location: `scripts/check-disclosure-regression.js`

This script scans the following source files for forbidden phrases:
- `pages/disclosure.tsx`
- `lib/glossary.ts`
- `pages/api/solvency/latest.ts`

It exits with code 1 (CI-fail-safe) if any forbidden phrase is detected, and exits with code 0 if the baseline is clean.

---

## 9. Manual Review Risks (Cannot Be Automated)

The following risks require human review and cannot be caught by string matching:

| Risk | What to look for |
|---|---|
| Contextual advisory drift | New Sentinel/MIRDT copy that omits "advisory only" without using the exact forbidden phrase |
| Soft offering language | Phrasing like "participate now" or "join the program" in a Live module context without an offer disclaimer |
| Bootstrap qualifier removal | Removing the Metric Interpretation Guidance block or bootstrap context paragraph |
| Implied binding commitments | Adding timeline language without a "does not constitute a binding commitment" qualifier |
| Roadmap framing as fact | Referring to planned phases as confirmed without the estimate qualifier |
| GENIUS Act strengthening | Replacing "structured with reference to" with any stronger alignment language that stops short of the exact forbidden phrases |
| Legacy contract promotion | Changing deprecated contracts back to active status or removing the opacity/deprecated styling |
| Snapshot label removal | Removing "(Snapshot)" or "(Snapshot Basis)" from metric labels without adding equivalent context |

---

*This file is an internal governance reference document. It does not constitute legal advice, regulatory guidance, or a representation of the protocol's legal status. Maintain this document alongside any substantive edits to `pages/disclosure.tsx`.*
