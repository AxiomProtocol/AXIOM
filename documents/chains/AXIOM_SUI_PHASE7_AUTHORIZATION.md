# AXIOM SUI — PHASE 7 AUTHORIZATION DOCUMENT
# Mainnet Design + Hardening + Authorization Package

Document type:  Authorization
Phase:          7 — Mainnet Design + Hardening + Authorization
Chain:          Sui (non-EVM, Move VM)
Date:           2026-05-15
Classification: INTERNAL — governance record
Predecessor:    documents/chains/AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md

---

## CRITICAL SCOPE STATEMENT

THIS DOCUMENT AUTHORIZES PHASE 7 DESIGN AND DOCUMENTATION WORK ONLY.

THE FOLLOWING ACTIONS ARE EXPLICITLY NOT AUTHORIZED BY THIS DOCUMENT:

  ✗  Deployment to Sui Mainnet
  ✗  Deployment to Sui Testnet of any new or modified package
  ✗  Issuance of AXUSD on Sui
  ✗  Issuance of AXAU on Sui
  ✗  Issuance of AXM on Sui
  ✗  Issuance of SEED on Sui
  ✗  Issuance of KAG on Sui
  ✗  Any reserve-backed token issuance on Sui
  ✗  Bridge code connecting Sui to Arbitrum, Avalanche, or Polygon
  ✗  Modification of existing Arbitrum One contracts or configuration
  ✗  Modification of existing Avalanche contracts or configuration
  ✗  Modification of existing Polygon contracts or configuration
  ✗  Modification of banking rails (Stripe, Coinbase Onramp, BitGo, Increase)
  ✗  Modification of capinfra runtime behavior
  ✗  Activation of CHAIN_SUI_ENABLED or any Sui environment flag
  ✗  Modification of shared/contracts.ts or any live chain contract registry

This authorization covers the following work only:

  ✓  Production hardening design (Move source — NOT compiled, NOT deployed)
  ✓  Mainnet architecture decision documentation
  ✓  Asset policy documentation
  ✓  Proof toolchain design
  ✓  Indexer and API design
  ✓  Risk register
  ✓  Read-only operator dashboard (additive, no write actions)
  ✓  This authorization document
  ✓  Phase 7 gate tracker
  ✓  Phase 7 completion report

---

## Section 1 — Phase 7 Scope Authorization

### 1.1 Engineering Authorization

I confirm that Phase 7 work as described in this document may proceed.

I confirm that:
- The Phase 7 scope is limited to design, documentation, and hardening
  of Move code that will NOT be compiled or deployed during Phase 7.
- No canonical Axiom assets will be issued or referenced on Sui.
- No bridge code will be written.
- No existing live chain configurations will be modified.
- All work is additive and isolated to:
    documents/chains/
    sui/
    lib/sui/
    pages/operator/chains/

Engineering Lead:      Clarence Fuqua
Organization:          Axiom Protocol — Founder / Operator
Date:                  2026-05-15
Signature:             Clarence Fuqua

---

### 1.2 Operations Authorization

I confirm that Phase 7 operational scope is acceptable and that the
production safety boundaries described in this document are understood.

I confirm that:
- No production deployments will result from Phase 7.
- No banking rails, payment processors, or treasury systems are affected.
- No environment variables will be activated during Phase 7.
- The Phase 7 gate tracker defines all deliverables and success criteria.

Operations Lead:       Clarence Fuqua
Organization:          Axiom Protocol — Founder / Operator
Date:                  2026-05-15
Signature:             Clarence Fuqua

---

### 1.3 Security Reviewer (Optional)

Security reviewer acknowledgment of Phase 7 scope:

Reviewer:              [PENDING — optional for Phase 7 design phase]
                       Required before Phase 8 (mainnet preparation) begins.
Date:                  —

---

## Section 2 — Phase 6 Prerequisite Confirmation

Phase 7 may only begin after Phase 6 is complete and all Phase 6 gates
are satisfied. Confirming Phase 6 status:

| Phase 6 Gate | Status | Date |
|---|---|---|
| G03  Move developer named | SATISFIED | 2026-05-15 |
| G03b Move reviewer named | SATISFIED | 2026-05-15 |
| G04  Testnet wallet provisioned | SATISFIED | 2026-05-15 |
| G04b Faucet funding confirmed | SATISFIED | 2026-05-15 |
| G06  Phase 6 authorization signed | SATISFIED | 2026-05-15 |
| G06b SDK install approved | SATISFIED | 2026-05-15 |
| G07  Testnet security review | SATISFIED | 2026-05-15 |
| G07b Security review approved | SATISFIED | 2026-05-15 |
| G08  Post-testnet report | SATISFIED | 2026-05-15 |

Sprint 2 smoke test: PASS — live claim TX BUA7aRwsddGQhVdtEDq4YhG7X32uFRj8ri3m19tzHAfc
Phase 6 recommendation: PROCEED TO PHASE 7 — confirmed.

---

## Section 3 — Carry-Forward Findings Accepted as Input

The following Phase 6 findings are accepted as Phase 7 design inputs.
They do NOT constitute blocking defects for Phase 7 — they are design
requirements for the hardened production contract.

| Finding | Description | Phase 7 Response |
|---|---|---|
| NOTE-1 | AdminCap has no destroy/burn function | Design destroy_admin_cap() and multisig model |
| NOTE-2 | TreasuryCap held in deployer wallet; no supply cap | Design GuardedTreasury controller; design supply cap |
| NOTE-3 | Campaign close technically reversible | Design is_closed: bool permanent flag |
| NOTE-5 | Merkle proof length not bounded | Design EProofTooLong with max depth 20 |

All four addressed in AXIOM_SUI_PHASE7_HARDENING_PLAN.md.

---

## Section 4 — Strategic Boundary Confirmation

Sui chain boundary as of Phase 7:

  Role:            Distribution / community layer
  Scope:           Non-financial claim artifacts only
  Canonical chain: Arbitrum One (unchanged)
  Permitted:       Test tokens; community reward artifacts; non-financial claims
  Forbidden:       AXUSD, AXAU, AXM, SEED, KAG, any reserve-backed or
                   yield-bearing asset, any bridge to canonical chains

This boundary is enforced by AXIOM_SUI_PHASE7_ASSET_POLICY.md.
Any deviation requires a separate written exception signed by both
Engineering Lead and Operations Lead.

---

## Section 5 — Phase 8 Gate

Phase 8 (Sui Mainnet Preparation) is not authorized by this document.

Phase 8 may only begin after:

1. Phase 7 authorization signed (this document — complete)
2. Phase 7 gate tracker fully satisfied (see AXIOM_SUI_PHASE7_GATE_TRACKER.md)
3. Mainnet architecture decision confirmed by Operations Lead
4. Hardened Move code compiled, tested, and independently reviewed
5. Phase 8 authorization document created with:
   - Separate Engineering Lead signature
   - Separate Operations Lead signature
   - Independent security reviewer signature
   - Explicit mainnet deployment plan with key management
   - Explicit rollback and incident response plan

Signing this Phase 7 authorization document does NOT authorize
Phase 8 or any mainnet work.

---

## Section 6 — Production Safety Attestation

By signing this document, all signatories confirm:

1. They have read the Phase 7 scope statement in Section 1.
2. They understand what is and is not authorized.
3. They will escalate immediately if any work outside the Phase 7 scope
   is requested or observed.
4. They understand that Arbitrum One is the canonical execution chain
   and this status is not changed by any Phase 7 deliverable.
5. They understand that no Sui mainnet address, private key, or wallet
   is required or should be created during Phase 7.

---

## Document Control

| Field | Value |
|---|---|
| Document ID | AXIOM-SUI-AUTH-P7-001 |
| Version | 1.0 |
| Created | 2026-05-15 |
| Effective date | 2026-05-15 |
| Expiry | Superseded by Phase 8 authorization or explicit revocation |
| Stored in | documents/chains/AXIOM_SUI_PHASE7_AUTHORIZATION.md |
| Related documents | AXIOM_SUI_PHASE7_GATE_TRACKER.md, AXIOM_SUI_PHASE7_HARDENING_PLAN.md |

---

*End of Phase 7 Authorization Document*
