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

## Current Status: Phase 5 — Design Only

| Gate | Description | Status |
|---|---|---|
| G01 | Distribution model decision | SATISFIED — Option B (Claim Contract) |
| G02 | @mysten/sui SDK review/install | REVIEW_COMPLETE / INSTALL_DEFERRED |
| G03 | Move language capability | EXTERNAL_REQUIRED |
| G04 | Testnet wallet provisioned | PENDING |
| G05 | Claim contract spec complete | SATISFIED |
| G06 | Testnet deployment authorization | NOT_STARTED |
| G07 | Testnet security review | NOT_STARTED |
| G08 | Post-testnet report | NOT_STARTED |

---

## Planned Package Structure (Phase 6+)

```
sui/
├── README.md                          ← This file
└── packages/
    └── axiom_claim_prototype/         ← Phase 6 — TESTNET ONLY
        ├── Move.toml
        └── sources/
            ├── axiom_test_claim.move  ← AXIOM_TEST_CLAIM coin definition
            ├── claim_campaign.move    ← Campaign object + claim logic
            └── merkle.move            ← Merkle proof helpers
```

All items below `packages/` are PENDING — no Move files exist yet.

---

## Key Documents

| Document | Location |
|---|---|
| Phase 5 Decision Record | documents/chains/AXIOM_SUI_PHASE5_DECISION_RECORD.md |
| Claim Contract Spec | documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md |
| SDK Review | documents/chains/AXIOM_SUI_SDK_REVIEW.md |
| Move Capability Plan | documents/chains/AXIOM_SUI_MOVE_CAPABILITY_PLAN.md |
| Testnet Wallet Plan | documents/chains/AXIOM_SUI_TESTNET_WALLET_PLAN.md |
| Gate Tracker | documents/chains/AXIOM_SUI_PHASE5_GATE_TRACKER.md |
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
