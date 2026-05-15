# AXIOM SUI — PHASE 7 MAINNET ARCHITECTURE DECISION MEMO

Document type:  Decision Record
Phase:          7 — Mainnet Design + Hardening + Authorization
Date:           2026-05-15
Classification: INTERNAL — architecture record
Status:         DECISION MADE — Option B selected — 2026-05-15

---

## Purpose

This document evaluates four strategic options for Sui's long-term role
within the Axiom Protocol multichain architecture and records the
decision made for Phase 8 planning purposes.

No deployment results from this decision. The decision defines the
target architecture that Phase 8 will prepare for, subject to Phase 8
authorization.

---

## Input Context

Arbitrum One:    Canonical execution / issuance / reserve chain
Avalanche:       Limited pilot issuance layer (AXUSD limited pilot)
Polygon:         Payments / treasury routing layer
Sui:             Currently — testnet distribution / community layer only

Phase 6 proof of concept validated:
- Sui Move claim mechanics work on testnet
- Merkle proof verification functions correctly
- 17/17 unit tests pass
- Live testnet claim successful
- No canonical assets involved

---

## Options Evaluated

---

### Option A — Sui Remains Testnet-Only Experimental Layer

**Description:**
Sui is retained as a testnet-only research environment. No mainnet
deployment is ever pursued. The Phase 6 testnet prototype is the
terminal artifact.

**Use case:**
- Engineering competency development
- Move language expertise building
- No production community programs on Sui

**Risk profile:**

| Dimension | Assessment |
|---|---|
| Technical risk | LOW — no production exposure |
| Operational risk | LOW — no live systems |
| Custody risk | NONE — no mainnet assets |
| Governance risk | LOW — no token distribution |
| User UX | N/A — no user-facing product |
| Legal exposure | VERY LOW — testnet has no regulatory significance |
| Operational load | VERY LOW — maintenance only |

**Pros:**
- Zero production risk
- Full focus on Arbitrum/Avalanche/Polygon canonical infrastructure
- No additional custody requirements

**Cons:**
- No community value from Sui investment
- Engineering effort (Phase 6) has no production ROI
- Misses Sui's genuine strengths for community distribution
- Competitive disadvantage if peers launch Sui community programs

**Verdict:** REJECTED
Rationale: The Phase 6 investment demonstrated real capability. Retaining
Sui as testnet-only wastes that capability and creates no community value.

---

### Option B — Sui Mainnet Community Rewards Distribution Layer

**Description:**
Sui mainnet is used to run non-financial community reward and
distribution campaigns. Community members claim AXIOM_COMMUNITY tokens
(a non-financial artifact) via Merkle proof claims. No canonical asset
is issued. No bridge is required. Arbitrum remains canonical.

**Use cases:**
- Community participation rewards
- Governance participation receipts
- Early supporter recognition programs
- Protocol milestone celebration distributions
- NFT badges for community contributors

**Risk profile:**

| Dimension | Assessment |
|---|---|
| Technical risk | MEDIUM — Move contract in production, gas, shared objects |
| Operational risk | MEDIUM — key management, campaign ops, pause/close procedures |
| Custody risk | LOW — non-financial tokens; no reserve backing |
| Governance risk | LOW — non-financial tokens carry no governance rights |
| User UX | GOOD — Sui wallet UX is strong; claim flow is simple |
| Legal exposure | LOW — non-financial claim artifacts; no monetary value stated |
| Operational load | MEDIUM — campaigns require toolchain, proofs, monitoring |

**Pros:**
- Creates genuine community value on Sui's growing ecosystem
- Leverages Phase 6 investment directly
- Non-financial scope keeps legal exposure minimal
- Clear separation from canonical Arbitrum assets
- Sui's object model is ideal for individual claim receipts
- Sui's gas costs are low (< 0.05 SUI per claim lifecycle)
- No bridge required — clean architecture

**Cons:**
- Requires production key management (AdminCap multisig)
- Requires operator toolchain (Merkle tree builder, proof API)
- Requires monitoring (campaign state, pool balance)
- Requires user-facing UI (claim page)
- Gas cost for users (small but non-zero SUI balance required)

**Verdict:** SELECTED — RECOMMENDED
See Section "Decision" below.

---

### Option C — Sui Community Utility Layer

**Description:**
Sui mainnet is used for both community rewards AND protocol utility
functions such as lightweight on-chain identity, attestation records,
or participation credentials. Canonical financial operations remain
on Arbitrum.

**Risk profile:**

| Dimension | Assessment |
|---|---|
| Technical risk | HIGH — multiple contract types, more complex interactions |
| Operational risk | HIGH — broader scope, more failure modes |
| Custody risk | LOW-MEDIUM — depends on utility type |
| Governance risk | MEDIUM — on-chain credentials could interact with governance |
| User UX | COMPLEX — multiple interaction types |
| Legal exposure | MEDIUM — attestation records may have regulatory implications |
| Operational load | HIGH — broad scope |

**Verdict:** DEFERRED
Rationale: Option C is a superset of Option B. The correct path is to
prove Option B works reliably in production before expanding scope to
Option C. Option C may be appropriate in Phase 10+.

---

### Option D — Future Canonical Bridged Distribution Layer

**Description:**
Sui mainnet becomes a full distribution layer for canonical Axiom assets
(AXUSD, AXAU) via a cross-chain bridge. Community members can hold and
use canonical Axiom assets on Sui.

**Risk profile:**

| Dimension | Assessment |
|---|---|
| Technical risk | VERY HIGH — bridge code is the highest-risk surface in DeFi |
| Operational risk | VERY HIGH — bridge key management, oracle feeds, liveness |
| Custody risk | HIGH — bridge custody of canonical assets |
| Governance risk | HIGH — dual-chain canonical asset creates governance complexity |
| User UX | COMPLEX — bridge UX is consistently poor across the industry |
| Legal exposure | HIGH — bridged canonical assets have regulatory ambiguity |
| Operational load | VERY HIGH — 24/7 bridge monitoring, incident response |

**Pros:**
- Maximum Sui integration depth
- Enables DeFi use cases on Sui with Axiom assets

**Cons:**
- Bridge exploits represent the majority of major DeFi losses
- Multi-chain canonical asset issuance creates reserve confusion
- BitGo CaaS does not support Sui custody for canonical assets
- Legal/regulatory treatment of bridged AXUSD is undefined
- Requires independent bridge security audit (6–12 month process)

**Verdict:** REJECTED for current planning horizon
Rationale: The risk/reward ratio is unfavorable given the current scale
of Axiom's Sui community operations. Option D may be reconsidered in
Phase 12+ after Option B is mature and an independent bridge audit has
been funded and completed.

---

## Decision

**Selected option: Option B — Sui Mainnet Community Rewards Distribution Layer**

**Conditional recommendation: PROCEED to Phase 8 (Sui Mainnet Preparation)**

**Conditions that must be satisfied before Phase 8 begins:**

1. Phase 7 authorization signed (complete — see AXIOM_SUI_PHASE7_AUTHORIZATION.md)
2. Phase 7 gate tracker fully satisfied (complete)
3. Hardened Move code compiled, tested (>= 28 tests), and independently reviewed
4. Production key management plan complete (AdminCap 2-of-3 multisig)
5. Proof toolchain MVP implemented and tested offline
6. Phase 8 authorization document signed by Engineering Lead + Operations Lead
7. Asset policy ratified (complete — AXIOM_SUI_PHASE7_ASSET_POLICY.md)
8. Risk register reviewed and mitigations accepted (complete)

**What Option B means in practice:**

- Sui mainnet holds only non-financial community artifacts
- Canonical Axiom assets (AXUSD, AXAU, AXM, SEED, KAG) stay on Arbitrum
- Campaigns are pre-approved by Operations Lead before launch
- Each campaign has a defined end date and is closed after completion
- AdminCap is held in 2-of-3 multisig
- All campaigns are publicly visible and auditable on-chain
- The claim asset carries no monetary value, no redemption rights,
  no yield, and no governance rights over Arbitrum systems

---

## Chain Architecture Post-Decision

```
Arbitrum One      ─── Canonical layer (AXUSD / AXAU / AXM)
                      Settlement, reserve, governance, payments
                      UNCHANGED by this decision

Avalanche C-Chain ─── Limited pilot issuance (AXUSD limited pilot)
                      UNCHANGED by this decision

Polygon PoS       ─── Payments / treasury routing
                      UNCHANGED by this decision

Sui Mainnet       ─── Community distribution layer (Phase 8 target)
                      Non-financial claim artifacts only
                      No bridge. No canonical assets.
                      Separate key management from other chains.
```

No bridge connects Sui to any other chain in this architecture.
Each chain's assets are native to that chain only.

---

## Decision Authority

Decision maker:    Clarence Fuqua (Axiom Protocol — Founder / Operator)
Date:              2026-05-15
Review required:   Operations Lead confirmation before Phase 8 begins

---

*End of Mainnet Architecture Decision Memo*
