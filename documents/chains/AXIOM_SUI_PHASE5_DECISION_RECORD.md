# AXIOM SUI PHASE 5 — DECISION RECORD

**Document type:** Architecture Decision Record  
**Phase:** Phase 5 — Testnet Claim Contract Prototype Design  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Status:** PHASE 5 DESIGN COMPLETE — no testnet deployment yet  
**Classification:** Internal — architecture record  

---

## 1. Decision

**Phase 5 of the Axiom Sui integration begins.**

Selected distribution model: **Option B — Claim Contract (Native Sui, pull model).**

Phase 5 scope is design-only:
- Documents created
- Claim contract prototype specified
- Gate tracker established
- No SDK installed
- No Move packages written
- No testnet deployment
- No mainnet activity

---

## 2. Selected Model: Option B — Claim Contract

### Why Option B

A merkle-root-based pull claim contract (community members submit their own
claim transaction) is the correct model for Axiom's distribution use case because:

**Community agency:** Members initiate their own claim. This is philosophically
consistent with Axiom's self-custody ethos — the community pulls their allocation,
not Axiom pushing it.

**On-chain transparency:** Claim records are fully visible on-chain.
Each claim event is emitted and queryable. The full eligibility set is committed
in the merkle root, auditable by anyone.

**Scalable eligibility:** A merkle root allows an arbitrarily large eligibility
list to be committed in a single on-chain object. Adding thousands of eligible
addresses requires only one root update, not thousands of transactions.

**Gas model:** Claimants pay their own gas (SUI). This is standard for claim
contracts and avoids Axiom needing to fund thousands of gas transactions.

**Proven pattern:** Merkle claim contracts are a well-established, audited pattern
in the broader blockchain ecosystem, with extensive reference implementations.

### Why Option A (Direct Airdrop) is Deferred

Direct airdrop requires Axiom to initiate and pay gas for every distribution
transaction. At scale, this becomes operationally complex and expensive.
It also removes community agency. Option A may be used for small test campaigns
on testnet but is not the canonical model.

### Why Option C (Bridge) is Rejected for Phase 5

Option C introduces cross-chain bridge counterparty risk and requires a bridge
partner agreement and additional smart contract surface area (Arbitrum-side escrow
plus Sui-side bridge adapter). This complexity is not appropriate for Phase 5
prototype work. Option C may be revisited if canonical AXM supply unification
becomes a governance-approved requirement. As of Phase 5, canonical assets remain
on Arbitrum and are not bridged to Sui.

---

## 3. Scope — What Phase 5 Includes

- Distribution model decision recorded (this document + updated Phase 4 design doc)
- SDK review document (`AXIOM_SUI_SDK_REVIEW.md`)
- Move capability plan (`AXIOM_SUI_MOVE_CAPABILITY_PLAN.md`)
- Testnet wallet plan (`AXIOM_SUI_TESTNET_WALLET_PLAN.md`)
- Claim contract prototype specification (`AXIOM_SUI_CLAIM_CONTRACT_SPEC.md`)
- Sui placeholder scaffold (`sui/README.md`)
- Operator status page (`/operator/chains/sui` — read-only, key-gated)
- Phase 5 gate tracker (`AXIOM_SUI_PHASE5_GATE_TRACKER.md`)

---

## 4. Excluded Items — Explicit Rejections

The following are explicitly out of scope for Phase 5 and all testnet work:

| Item | Status |
|---|---|
| AXUSD on Sui | REJECTED — AXUSD issuance is Arbitrum-canonical (ERC-3643) |
| AXAU on Sui | REJECTED — AXAU reserve is Arbitrum-canonical (PAXG-backed) |
| AXM on Sui | REJECTED — AXM issuance is Arbitrum-canonical (ERC-20) |
| SEED on Sui | REJECTED |
| KAG on Sui | REJECTED |
| Any reserve-backed asset on Sui | REJECTED |
| Any yield-bearing asset on Sui | REJECTED |
| Bridge from Arbitrum | REJECTED for Phase 5 (deferred) |
| Mainnet deployment | REJECTED — testnet design only |
| Governance authority on Sui | REJECTED |
| Payment/banking rail on Sui | REJECTED |
| Canonical identity on Sui | REJECTED — ERC-3643 identity is Arbitrum-canonical |

The testnet claim asset uses the placeholder name **AXIOM_TEST_CLAIM**.
It has no monetary value, no backing, no redemption right, and no relationship
to any canonical Axiom asset.

---

## 5. Risk Assumptions

| Risk | Mitigation |
|---|---|
| Move language unfamiliarity | G03 gate: external Move reviewer required before any code is written |
| No BitGo custody for Sui | Admin capability held by Sui-native keypair in testnet; mainnet custody design deferred |
| Testnet asset confusion | Explicit AXIOM_TEST_CLAIM name, no production branding on testnet |
| Merkle tree implementation risk | Use reference-audited merkle libraries; external review at G07 |
| Private key exposure | No private keys in documents or source code; env var pattern only |
| Regulatory exposure | AXIOM_TEST_CLAIM is explicitly testnet-only with no monetary value; no public-facing UI until legal review |

---

## 6. Required Gates Before Implementation (Phase 6)

The following gates must be satisfied before any Phase 6 testnet implementation begins:

| Gate | Description | Status |
|---|---|---|
| G01 | Distribution model decision | SATISFIED |
| G02 | @mysten/sui SDK review and install | REVIEW_COMPLETE / INSTALL_DEFERRED |
| G03 | Move language capability confirmed | EXTERNAL_REQUIRED |
| G04 | Testnet wallet provisioned | PENDING |
| G05 | Claim contract spec complete | SATISFIED |
| G06 | Testnet deployment authorization | NOT_STARTED |
| G07 | Testnet security review | NOT_STARTED |
| G08 | Post-testnet report | NOT_STARTED |

---

## 7. Chain Boundary Confirmation

- Arbitrum One: canonical for identity, reserve, issuance, policy, governance, solvency — **UNCHANGED**
- Avalanche C-Chain: Limited Pilot Mode Active — **UNCHANGED**
- Polygon PoS: Phase 5 production-authorized, first transfer pending USDC funding — **UNCHANGED**
- Sui: Phase 5 design-only, DISABLED in all environments — **CORRECT**

No mainnet transactions. No testnet transactions. No token issuance. No bridge code.
No Arbitrum, Avalanche, or Polygon systems modified.
