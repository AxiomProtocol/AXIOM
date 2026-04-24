# Polygon — Official Domains and Documentation Sources

**Status:** Docs not yet attached — this file defines the collection checklist.

---

## Primary Documentation Surfaces to Collect

### 1. Core Polygon Documentation
- **Domain:** https://docs.polygon.technology/
- **Priority:** HIGH
- **Sections needed:**
  - Polygon PoS architecture
  - Contract deployment guides
  - Gas and fee model
  - Validator and network structure
  - Bridge contracts (PoS bridge)

### 2. Polygon ID (Identity Framework)
- **Domain:** https://docs.id.polygon.technology/
- **Priority:** CRITICAL — this is the primary identity surface
- **Sections needed:**
  - Issuer node architecture
  - Holder wallet model
  - Verifier circuit design
  - ZK proof types (Sig-based vs MTP-based)
  - W3C Verifiable Credentials spec alignment
  - DID:polygonid method specification
  - Credential state contracts

### 3. iden3 Protocol
- **Domain:** https://docs.iden3.io/
- **Priority:** HIGH — underlying protocol for Polygon ID
- **Sections needed:**
  - Identity state tree
  - Claim schema standards
  - Merkle tree proof generation
  - Global identity state contract (ISC)

### 4. ONCHAINID on Polygon (alternative path)
- **Domain:** https://docs.onchainid.com/
- **Priority:** MEDIUM — alternative to Polygon ID bridge
- **Sections needed:**
  - Deploying IdentityFactory on Polygon
  - Cross-chain identity verification
  - Claim issuer configuration

### 5. Polygon Bridge Documentation
- **Domain:** https://docs.polygon.technology/pos/how-to/bridging/
- **Priority:** MEDIUM (for asset movement if needed)
- **Key bridge contracts:** FxPortal, PoS RootChainManager

### 6. Alchemy Polygon Support
- **Domain:** https://docs.alchemy.com/reference/polygon-api-quickstart
- **Priority:** LOW — Axiom already uses Alchemy for Arbitrum; Polygon support is additive
- **Action:** Verify `polygon-mainnet` is in Axiom's Alchemy app configuration

---

## GitHub Repositories to Clone / Review

| Repository | URL | Priority |
|-----------|-----|---------|
| Polygon ID JS SDK | https://github.com/0xPolygonID/js-sdk | CRITICAL |
| Polygon ID Issuer Node | https://github.com/0xPolygonID/issuer-node | HIGH |
| iden3 circuits | https://github.com/iden3/circuits | HIGH |
| Polygon PoS contracts | https://github.com/maticnetwork/pos-portal | LOW |
| ONCHAINID (T-REX) | https://github.com/onchain-id/solidity | MEDIUM |

---

## Docs Attachment Status

| Source | Attached | Notes |
|--------|----------|-------|
| Polygon PoS docs | No | Collect from docs.polygon.technology |
| Polygon ID docs | No | CRITICAL — collect first |
| iden3 protocol docs | No | Needed for ZK proof design |
| ONCHAINID Polygon deploy guide | No | If using mirrored credential path |
| Alchemy Polygon API reference | No | Low effort — already using Alchemy |
