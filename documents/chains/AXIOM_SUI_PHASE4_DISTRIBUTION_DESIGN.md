# AXIOM SUI PHASE 4 — DISTRIBUTION LAYER DESIGN

**Document type:** Architecture Design — Open for Decision  
**Phase:** Phase 4 — Foundation & Distribution-Layer Architecture  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Status:** OPEN — distribution model decision required before Phase 5 begins  
**Classification:** Internal — architecture record  

---

## 1. Purpose

This document defines the three candidate distribution models for the Axiom Sui
distribution layer and frames the decision that must be made before Phase 5
implementation begins.

The distribution layer is Sui's entire strategic purpose in the Axiom protocol.
This decision drives every subsequent technical choice (SDK usage, Move package
architecture, bridge integration, token supply model).

---

## 2. Distribution Scope

Axiom's Sui distribution layer will serve the following functions:

- **Community AXM distribution** — delivering AXM tokens to community members and
  diaspora participants who hold Sui wallets
- **Community badge / NFT delivery** — issuing participation badges or NFT equivalents
  using Sui's native object model
- **Future: Sui wallet onboarding** — enabling community members to participate
  via Sui-native wallets without requiring EVM wallet setup

Distribution targets are community members, not institutional or treasury recipients.
Institutional settlement remains on Polygon. Reserve operations remain on Arbitrum.

---

## 3. Option A — Direct Airdrop (Native Sui, No Bridge)

### Overview
Deploy a Sui Move package containing an AXM-equivalent `Coin<T>` type.
A pre-funded supply is held in a shared treasury object on Sui.
Axiom's backend (server-side only) calls the package to distribute coins
to registered Sui wallet addresses based on an off-chain eligibility list.

### Architecture
```
Axiom Backend (Node.js)
  └─ @mysten/sui SDK
       └─ Calls distribution Move package
            └─ Distributes Coin<AXM_SUI> to wallet addresses
```

### Key properties
- No bridge required
- Sui AXM supply is independent of Arbitrum AXM supply
- Sui AXM is a community distribution instrument, NOT the governance token
- Total Sui AXM supply must be a separate governance decision
- Simple architecture — no cross-chain dependencies

### Requirements
- Move package: `axiom_distribution::axm_coin` module
- Shared object: `CommunityTreasury` with admin cap
- Admin capability: held by Axiom-controlled Sui keypair (not BitGo)
- @mysten/sui SDK (npm)
- Move CLI for package development

### Pros
- Simplest architecture
- No bridge counterparty risk
- Fast distribution (sub-second Sui finality)

### Cons
- AXM supply on Sui is separate from Arbitrum canonical supply
- Requires separate token economics decision
- No direct link to Arbitrum governance

---

## 4. Option B — Claim Contract (Native Sui, No Bridge)

### Overview
Deploy a Sui Move package with a merkle-root-based claim mechanism.
Axiom publishes a merkle root of eligible (Sui wallet address, amount) pairs.
Community members submit claim transactions on-chain; the contract verifies
the merkle proof and releases the claimed amount.

### Architecture
```
Axiom Backend (Node.js)
  └─ Builds merkle tree of (address, amount) pairs
  └─ Publishes root to ClaimRegistry shared object

Community member
  └─ Submits claim tx with merkle proof
       └─ Contract verifies proof, releases Coin<AXM_SUI>
```

### Key properties
- Community-driven: members claim their own allocation
- Merkle tree built off-chain by Axiom backend
- Same token economics question as Option A
- More complex Move package than Option A

### Requirements
- Move package: `axiom_distribution::claim_registry` module with merkle verification
- Shared object: `ClaimRegistry` with merkle root + claim tracking
- Axiom backend: merkle tree builder using @mysten/sui + a merkle library
- @mysten/sui SDK (npm)

### Pros
- Community agency — members initiate their own claim
- Transparent on-chain claim tracking
- Proven pattern (widely used in token distribution)

### Cons
- Higher gas burden on community members (claim tx requires SUI for gas)
- More complex Move implementation
- Same AXM supply independence issue as Option A

---

## 5. Option C — Bridge from Arbitrum (Cross-Chain)

### Overview
AXM tokens on Arbitrum are locked in a bridge escrow contract.
An equivalent wrapped AXM (`wAXM`) is minted on Sui via a bridge adapter.
Community members receive `wAXM` on Sui, which represents a claim on
Arbitrum-canonical AXM via the bridge.

### Architecture
```
Arbitrum One (canonical)
  └─ AXM Token (ERC-20)
  └─ Bridge Escrow Contract (locks AXM)

Bridge (Wormhole / LayerZero / Sui Native Bridge)
  └─ Cross-chain message relay

Sui Mainnet
  └─ wAXM Coin<T> (minted by bridge adapter)
  └─ Community wallets receive wAXM
```

### Bridge candidates
- **Wormhole** — established cross-chain messaging, Sui support confirmed
- **LayerZero** — OFT standard, broad chain support, Sui available
- **Sui Native Bridge** — official Mysten Labs bridge (ETH ↔ Sui, limited assets)

### Key properties
- Preserves Arbitrum-canonical AXM supply
- Requires bridge partner selection and integration
- Cross-chain dependency introduces latency and counterparty risk
- Most architecturally complex option

### Requirements
- Bridge partner agreement (Wormhole or LayerZero)
- Arbitrum-side bridge escrow contract
- Sui-side bridge adapter Move package
- Both @mysten/sui SDK and EVM tooling
- Bridge-specific SDK (Wormhole SDK or LayerZero SDK)

### Pros
- AXM supply remains Arbitrum-canonical
- wAXM is directly backed by real AXM locked on Arbitrum
- Most aligned with Axiom's "Arbitrum canonical" principle

### Cons
- Highest complexity and counterparty risk
- Bridge partner relationship required
- Cross-chain latency (~minutes for finality with attestations)
- Bridge contract audit required

---

## 6. Decision Matrix

| Criterion | Option A (Direct) | Option B (Claim) | Option C (Bridge) |
|---|---|---|---|
| Arbitrum supply preserved | No | No | Yes |
| Bridge counterparty risk | None | None | High |
| Move complexity | Low | Medium | High |
| Community agency | None (push) | High (pull) | Depends on model |
| Speed of distribution | Instant | Member-initiated | ~minutes |
| Infrastructure dependency | None | None | Bridge partner |
| Token economics clarity | Separate supply needed | Separate supply needed | Unified supply |
| Time to implement | Shortest | Medium | Longest |

---

## 7. Open Questions

These questions must be answered before the distribution model decision:

1. **Supply question:** Should Sui AXM be a separate community instrument
   (Options A/B) or a wrapped representation of canonical AXM (Option C)?

2. **Governance question:** Should Sui AXM holders have any governance rights
   on Arbitrum? (If yes, Option C is significantly preferred.)

3. **Gas question:** Is Axiom willing to pay gas for community members (push model,
   Option A) or should members pay their own gas (pull model, Option B)?

4. **Bridge question:** If Option C, which bridge partner? (Requires legal/partner
   due diligence — Wormhole and LayerZero both have audit histories to review.)

5. **Timing question:** When is the first Sui distribution event planned?
   This constrains which phases can be compressed.

---

## 8. Decision Record

**Decision:** [PENDING — to be completed before Phase 5 begins]

When made, record:
- Selected option: A / B / C
- Rationale:
- Supply model decision (separate vs bridged):
- Bridge partner (if Option C):
- Target Phase 5 start date:
- Decision authorized by:
- Date:

---

## 9. Impact on Phase 5 Scope

The distribution model decision directly determines Phase 5 work:

| If Option A chosen | Install @mysten/sui, design treasury Move package |
| If Option B chosen | Install @mysten/sui, design merkle claim Move package |
| If Option C chosen | Select bridge partner, install @mysten/sui + bridge SDK, design bridge contracts |

**No Phase 5 implementation work should begin until this document's Decision Record
section is completed.**
