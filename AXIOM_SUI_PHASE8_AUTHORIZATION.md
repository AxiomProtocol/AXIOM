# AXIOM SUI PHASE 8 — AUTHORIZATION PACKAGE

**Phase:** 8 — Hardened Staging  
**Date:** 2026-05-16  
**Status:** INTERNAL AUTHORIZATION — engineering delivery only

---

> **COMMUNITY DISTRIBUTION ONLY.** This authorization covers the ATC community
> token system only. No canonical Axiom assets (AXUSD, AXAU, AXM, SEED, KAG)
> are in scope. Nothing here constitutes financial activity.

---

## 1. Purpose

This document records the internal engineering authorization for Phase 8 deliverables, the Phase 9 promotion gate, and the conditions under which any future package deployment or privileged key operation may be performed.

---

## 2. Phase 8 Deliverable Authorization

The following Phase 8 deliverables are authorized for staging:

### 2.1 Move Contract Package (Testnet — Read/Test Only)

| Item | Detail |
|------|--------|
| Package | `claim_campaign` |
| Network | Sui Testnet |
| Package ID | `0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602` |
| Status | Deployed — frozen — testnet only |
| Authorization scope | Testing and CI validation only; no public promotion |

### 2.2 Move Contract Package (Mainnet Candidate)

| Item | Detail |
|------|--------|
| Package | `claim_campaign` |
| Network | Sui Mainnet |
| Package ID | `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487` |
| Campaign Object | `0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982` |
| Status | Deployed — frozen — Phase 9 mainnet candidate |
| Authorization scope | Community distribution only; not a financial product |

### 2.3 TypeScript Proof Toolchain

| Module | File | Status |
|--------|------|--------|
| Sui client | `lib/sui/client.ts` | Authorized |
| Merkle tree builder | `lib/sui/proofs/buildMerkleTree.ts` | Authorized |
| Proof generator | `lib/sui/proofs/generateProof.ts` | Authorized |
| Local proof verifier | `lib/sui/proofs/verifyProofLocal.ts` | Authorized |
| CSV validator | `lib/sui/proofs/validateEligibilityCsv.ts` | Authorized |
| Proof serializer | `lib/sui/proofs/serializeProof.ts` | Authorized |

### 2.4 REST API Backend

| Route | File | Status |
|-------|------|--------|
| `GET /api/sui/campaigns` | `pages/api/sui/campaigns.ts` | Authorized |
| `GET /api/sui/campaign/[id]` | `pages/api/sui/campaign/[id].ts` | Authorized |
| `POST /api/sui/eligibility` | `pages/api/sui/eligibility.ts` | Authorized |
| `GET /api/sui/claim-status` | `pages/api/sui/claim-status.ts` | Authorized |
| `POST /api/sui/claim-submit` | `pages/api/sui/claim-submit.ts` | Authorized |

### 2.5 Frontend Pages

| Page | File | Status |
|------|------|--------|
| Community claim | `pages/sui/claim.tsx` | Authorized — non-financial disclaimer visible |
| Phase 8 operator dashboard | `pages/operator/chains/sui-phase8.tsx` | Authorized — read-only |
| Phase 9 operator dashboard | `pages/operator/chains/sui-phase9.tsx` | Authorized — read-only |

---

## 3. Authorization Signature Block — Phase 8 Delivery

```
PHASE 8 ENGINEERING DELIVERY

Scope:      claim_campaign package — hardened staging
Delivered:  2026-05-16
Network:    Sui Testnet (archive) + Sui Mainnet (candidate)
Token:      ATC (AXIOM TEST CLAIM) — testnet/community only
            NOT AXUSD / NOT AXAU / NOT AXM / NOT SEED / NOT KAG

Hardenings: A1–A7 (MAX_PROOF_DEPTH, is_closed, AdminCap lifecycle,
            GuardedTreasury, MAX_SUPPLY, frozen package, events)

Test suite: 28 tests — 20 claim_campaign + 8 merkle
            sui move test: PASS (28/0/0)

TSC build:  0 errors

Authorized by: Engineering Lead, Axiom Protocol
Date:          2026-05-16

Note: This authorization covers Phase 8 staging only. Promotion to a
production financial instrument requires a separate Phase 9+ authorization
with external Move security audit and multisig custody transfer.
```

---

## 4. Phase 9 Promotion Gate

The following conditions must ALL be satisfied before Phase 9 promotion:

| Gate | Status | Owner |
|------|--------|-------|
| External Move security audit completed | PENDING | Engineering |
| All audit findings remediated or accepted | PENDING | Engineering |
| 2-of-3 multisig custody ceremony completed | PENDING | Engineering + Ops |
| AdminCap transferred to multisig | PENDING | Deployer |
| GuardedTreasury transferred to multisig | PENDING | Deployer |
| Deployer private key retired | PENDING | Engineering |
| Phase 9 eligibility list reviewed and approved | PENDING | Protocol team |
| Community communications reviewed by legal | PENDING | Legal |
| Phase 9 authorization signed (separate doc) | PENDING | Engineering + Protocol |

**Current gate status: 0 of 9 satisfied — Phase 9 promotion NOT authorized.**

---

## 5. Perpetual Restrictions

The following restrictions apply indefinitely regardless of phase:

1. **No financial claims.** ATC tokens must never be represented as having monetary value, being redeemable, or constituting a security interest.

2. **No canonical asset linkage.** ATC must never be described as AXUSD, AXAU, AXM, SEED, KAG, or any Axiom Protocol reserve asset.

3. **Frozen package.** The deployed package must not be upgraded without a new Phase 9+ authorization and a fresh multisig-approved publish transaction.

4. **Disclosure.** All user-facing pages must display the community distribution disclaimer.

5. **No ACH/wire/fiat entry.** No fiat on-ramp exists or is authorized for ATC acquisition.

---

## 6. Incident Response Authorization

In the event of a suspected compromise:

| Severity | Response | Authorized By |
|----------|----------|---------------|
| Low (probe/scan) | Monitor; no action | Ops on-call |
| Medium (unauthorized read of admin key material) | Rotate signer key; notify quorum | Engineering Lead |
| High (unauthorized AdminCap transaction) | Emergency `destroy_admin_cap()`; notify protocol team | Engineering Lead + 1 signer |
| Critical (loss of quorum) | Declare campaign inoperable; public disclosure | Protocol Lead |

---

*This document is an internal engineering control record. It does not constitute legal advice, regulatory approval, or a representation to any investor or token holder.*
