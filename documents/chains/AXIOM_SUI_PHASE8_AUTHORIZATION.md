# AXIOM SUI PHASE 8 — AUTHORIZATION PACKAGE

**STATUS: UNSIGNED**

This document constitutes the Phase 8 authorization package for the Axiom Protocol Sui distribution layer. It must be signed by all required parties before Phase 9 promotion. It is NOT signed and NOT effective as of the date of this draft.

---

## Authorization Scope

This authorization covers Phase 8 activities ONLY:

1. **Move contract hardening** — Apply Phase 7 design items A1–A7 to testnet package
2. **Test suite expansion** — Expand to ≥ 28 tests against hardened contracts
3. **Proof toolchain MVP** — TypeScript implementation of buildMerkleTree, generateProof, verifyProofLocal, validateEligibilityCsv, serializeProof
4. **Sui API backend** — Staging API routes (server-side, no wallet keys)
5. **Claim UI staging** — Testnet-only claim interface with prominent disclaimers
6. **Multisig design** — 2-of-3 custody architecture documented (NOT implemented)
7. **Operator dashboard** — Read-only Phase 8 status dashboard
8. **Security review package** — Internal audit checklist (NOT an external audit)

---

## Explicit Exclusions from this Authorization

This authorization DOES NOT cover and DOES NOT permit:

- Deployment to Sui Mainnet
- Issuance of AXUSD, AXAU, AXM, SEED, KAG, or any canonical Axiom asset on Sui
- Bridging of any canonical asset to or from Sui
- Creation of any reserve-backed product on Sui
- Creation of any yield-bearing product on Sui
- Activation of `CHAIN_SUI_ENABLED` in any production environment
- Activation of `MULTICHAIN_ENABLED` in any production environment
- Connection of the Sui distribution layer to any Axiom banking rail
- Connection to Increase, Unit, Stellar, or any ACH/wire infrastructure
- Any financial product offered to end users on Sui in this phase
- Claiming any regulatory compliance status based on testnet operations

The AXIOM_TEST_CLAIM (ATC) token:
- Has no monetary value
- Is not backed by any reserve
- Cannot be redeemed for any canonical Axiom asset
- Cannot be redeemed for USD or any fiat currency
- Will not be deployed to Sui Mainnet under this authorization

---

## Deployed Package (Testnet)

**Package ID:** `0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602`
**Network:** Sui Testnet
**Deployer:** `0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad`
**Phase 6 Smoke TX:** `BUA7aRwsddGQhVdtEDq4YhG7X32uFRj8ri3m19tzHAfc`
**Phase 8 Redeployment Required:** Yes — hardened contract requires new publish for A1–A7 changes

---

## Phase 8 Deliverables Summary

| Deliverable | Status | Evidence |
|---|---|---|
| guarded_treasury.move | COMPLETE | sui/packages/axiom_claim_prototype/sources/guarded_treasury.move |
| claim_campaign.move (hardened) | COMPLETE | A1-A7 applied; is_closed, destroy/transfer AdminCap, ECampaignAlreadyClosed |
| merkle.move (hardened) | COMPLETE | MAX_PROOF_DEPTH=20, EProofTooLong=7 |
| axiom_test_claim.move (updated) | COMPLETE | init() wraps TreasuryCap in GuardedTreasury |
| claim_campaign_tests.move | COMPLETE | 20 tests (11 original + 9 Phase 8) |
| merkle_tests.move | COMPLETE | 8 tests (6 original + 2 Phase 8) |
| sui move test execution | BLOCKED | Sui CLI not installed in environment |
| lib/sui/client.ts | COMPLETE | Testnet-only SuiClient |
| lib/sui/proofs/ (5 files) | COMPLETE | buildMerkleTree, generateProof, verifyProofLocal, validateEligibilityCsv, serializeProof |
| pages/api/sui/ (4 routes) | COMPLETE | campaigns, campaign/[id], eligibility, claim-status |
| pages/sui/claim.tsx | COMPLETE | Testnet staging UI with full disclaimers |
| pages/operator/chains/sui-phase8.tsx | COMPLETE | Read-only operator dashboard |
| AXIOM_SUI_PHASE8_SECURITY_REVIEW.md | COMPLETE | Internal audit checklist; external audit required |
| AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md | COMPLETE | 2-of-3 custody design; key ceremony not conducted |
| AXIOM_SUI_PHASE8_AUTHORIZATION.md | THIS DOCUMENT | UNSIGNED |

---

## Phase 9 Promotion Conditions

Phase 9 activities (mainnet preparation, wallet integration, on-chain proof manifest) are authorized ONLY when ALL of the following conditions are met:

1. `sui move test` passes with ≥ 28 tests and 0 failures (requires Sui CLI installation)
2. Independent third-party Move security audit completed with no critical/high findings unresolved
3. `npx tsc --noEmit` passes with 0 errors on the full codebase
4. 2-of-3 multisig key ceremony completed with all 3 key holders
5. AdminCap transferred to 2-of-3 multisig address on testnet (verified)
6. Phase 9 Authorization Package signed by Engineering Lead, Operations Lead, and Legal/Compliance
7. Legal/Compliance review of claim UI copy and disclaimers
8. Proof toolchain integration test: CSV → Merkle root → proof → on-chain claim (testnet)

---

## Open Blockers as of Phase 8

1. **Sui CLI not installed** — `sui move test` cannot be run in current environment. Must be installed externally to generate test execution evidence.
2. **External Move security audit** — Required before mainnet. No audit conducted in Phase 8.
3. **Key ceremony not conducted** — 2-of-3 multisig addresses not yet generated.
4. **Authorization unsigned** — Requires 3 signatures below.

---

## Required Signatories

This authorization package requires signatures from:

| Role | Name | Signature | Date |
|---|---|---|---|
| Engineering Lead | [NAME] | **UNSIGNED** | — |
| Operations Lead | [NAME] | **UNSIGNED** | — |
| Legal / Compliance | [NAME] | **UNSIGNED** | — |

**This document has no legal effect until all three parties have signed.**

Signatures may be provided as:
- GPG signatures over the SHA-256 hash of this document
- DocuSign / equivalent e-signature platform (legal copies)
- Hardware wallet signatures (Sui Ed25519 signing of document hash)

---

## Attestations Required at Signing

By signing, each party attests:

**Engineering Lead:** "I have reviewed the Phase 8 hardened Move contracts. The A1–A7 hardening items have been correctly implemented. The proof toolchain correctly mirrors the Move verification logic. No canonical Axiom assets are involved. This authorization covers testnet staging only."

**Operations Lead:** "I have reviewed the Phase 8 deliverables. The operator dashboard, API backend, and claim UI correctly display testnet-only disclaimers. The system does not connect to any production financial rail. I authorize Phase 8 staging to proceed."

**Legal / Compliance:** "I have reviewed the claim UI copy, testnet disclaimers, and the scope limitations of this authorization. The AXIOM_TEST_CLAIM token has no monetary value and is clearly disclosed as such. The system is designed to align with applicable regulatory frameworks for testnet operations. I authorize Phase 8 staging to proceed subject to the conditions in this document."

---

*Draft prepared by Axiom Protocol engineering — Phase 8 — Testnet Staging*
*Not signed. Not effective. Not a mainnet deployment authorization.*
