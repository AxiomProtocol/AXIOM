# Axiom Protocol — Sui Distribution Layer

> **TESTNET-ONLY DESIGN SPACE**
>
> This directory contains no production Move code.
> No packages are deployed. No canonical Axiom assets are issued here.
> All work in this directory is testnet prototype design only.
> See `documents/chains/AXIOM_SUI_PHASE5_DECISION_RECORD.md` for scope.

---

## Purpose

This directory is the designated home for the Axiom Sui distribution layer
Move packages. Sui is the distribution / community / diaspora layer in the
Axiom multi-chain strategic model.

Sui's role is strictly:
- Community token distribution (non-canonical claim instruments)
- Community badge / participation NFT delivery
- Diaspora wallet-facing distribution flows

Sui is NOT:
- A settlement layer (Arbitrum / Polygon)
- A reserve layer (Arbitrum / Ethereum)
- An issuance layer (Arbitrum canonical)
- A governance layer (Arbitrum)
- A payment rail (Polygon / Stellar)

---

## Current Status: Phase 6 Preparation — Awaiting Authorization

### Phase 5 Gates (complete)

| Gate | Description | Status |
|---|---|---|
| G01 | Distribution model decision | SATISFIED — Option B (Claim Contract) |
| G02 | @mysten/sui SDK review/install | REVIEW_COMPLETE / INSTALL_DEFERRED |
| G05 | Claim contract spec complete | SATISFIED |

### Phase 6 Gates (pending start)

| Gate | Description | Status |
|---|---|---|
| G03  | Move developer named | PENDING |
| G03b | Move reviewer named | PENDING |
| G04  | Testnet wallet provisioned | PENDING |
| G04b | Faucet funding confirmed | PENDING |
| G06  | Phase 6 authorization signed | PENDING |
| G06b | SDK install approved | PENDING |
| G07  | Testnet security review | NOT_STARTED |
| G07b | Security review approved | NOT_STARTED |
| G08  | Post-testnet report | NOT_STARTED |

**Phase 6 may not begin until G03, G03b, G04, G04b, G06, and G06b are all satisfied.**

---

## Planned Package Structure (Phase 6+)

The planned structure below is finalized and authoritative for Sprint 1 and 2.
No Move files exist yet. All items below `packages/` are PENDING.

```
sui/
├── README.md                                 ← This file
└── packages/
    └── axiom_claim_prototype/                ← Phase 6 — TESTNET ONLY
        ├── Move.toml                         ← Package manifest
        └── sources/
        │   ├── axiom_test_claim.move         ← AXIOM_TEST_CLAIM one-time witness + TreasuryCap
        │   ├── claim_campaign.move           ← ClaimCampaign shared object + entry functions
        │   └── merkle.move                   ← keccak256 merkle proof verification (Sprint 2)
        └── tests/
            ├── claim_campaign_tests.move     ← Sprint 1 tests (allowlist) + Sprint 2 (merkle)
            └── merkle_tests.move             ← Standalone merkle verification tests (Sprint 2)
```

### Move.toml fields (planned)

```toml
[package]
name = "axiom_claim_prototype"
version = "0.1.0"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }

[addresses]
axiom_claim_prototype = "0x0"   # replaced by published package ID after deployment
```

### Sprint scope

Sprint 1 — Simple allowlist:
  axiom_test_claim.move + claim_campaign.move (allowlist) + tests
  Proves end-to-end claim mechanic before adding merkle complexity.

Sprint 2 — Merkle root:
  merkle.move + updated claim_campaign.move (merkle) + all 10 tests
  Production-pattern claim verification. Required before security review.

---

## Key Documents

| Document | Location |
|---|---|
| Phase 6 Gate Tracker | documents/chains/AXIOM_SUI_PHASE6_GATE_TRACKER.md |
| Phase 6 Authorization | documents/chains/AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md |
| Move Developer Onboarding | documents/chains/AXIOM_SUI_MOVE_DEVELOPER_ONBOARDING_PACKET.md |
| Move Reviewer Checklist | documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md |
| Claim Contract Spec | documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md |
| SDK Review | documents/chains/AXIOM_SUI_SDK_REVIEW.md |
| Testnet Wallet Plan | documents/chains/AXIOM_SUI_TESTNET_WALLET_PLAN.md |
| Phase 5 Gate Tracker | documents/chains/AXIOM_SUI_PHASE5_GATE_TRACKER.md |
| Phase 5 Decision Record | documents/chains/AXIOM_SUI_PHASE5_DECISION_RECORD.md |
| Move Capability Plan | documents/chains/AXIOM_SUI_MOVE_CAPABILITY_PLAN.md |
| Phase 4 Discovery | documents/chains/AXIOM_SUI_PHASE4_DISCOVERY.md |
| Distribution Design | documents/chains/AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md |

---

## Claim Asset — AXIOM_TEST_CLAIM

The testnet prototype uses `AXIOM_TEST_CLAIM` as the placeholder coin type.

- Has no monetary value
- Is not AXUSD, AXAU, AXM, SEED, KAG, or any canonical Axiom asset
- Is not backed by any reserve
- Cannot be redeemed for any canonical asset
- Testnet only — will never be deployed to Sui Mainnet

---

## Development Rules

1. No Move code in this directory until G03 (Move capability) is CONFIRMED
2. No testnet deployment until G06 (testnet deployment authorization) is signed
3. No mainnet deployment without a separate Phase 7 authorization
4. No canonical Axiom assets (AXUSD, AXAU, AXM, SEED, KAG) may be defined here
5. All private keys must be stored in environment secrets — never in this directory
6. The @mysten/sui SDK must not be installed until G02 INSTALL phase is approved

---

## Network References

| Property | Testnet | Mainnet |
|---|---|---|
| RPC | https://fullnode.testnet.sui.io | https://fullnode.mainnet.sui.io |
| Explorer | https://testnet.suiscan.xyz | https://suiscan.xyz |
| Faucet | https://faucet.testnet.sui.io | N/A |
| Chain env var | SUI_RPC_URL (testnet value) | SUI_RPC_URL (mainnet, Phase 7+) |
