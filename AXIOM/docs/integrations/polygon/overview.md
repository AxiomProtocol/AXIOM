# Polygon — Integration Overview

**Axiom Role:** Identity Bridge + Institutional Credential Expansion  
**Chain ID:** 137 (Polygon Mainnet)  
**Status:** Researching  
**Feature Flag:** `ENABLE_POLYGON_IDENTITY_BRIDGE`  
**EVM Compatible:** Yes  
**RPC Provider:** Alchemy (`polygon-mainnet` network slug)

---

## What Polygon Does in the Axiom Architecture

Polygon is the planned **identity bridge and credential expansion layer** for Axiom Protocol. It does NOT replace Arbitrum as the core execution environment, and it does NOT replace AXUSD as the internal settlement layer.

Its single role is: **mirror or attest ERC-3643 ONCHAINID credentials issued on Arbitrum to Polygon identity infrastructure**, enabling Axiom participants to access institutional products and networks that require Polygon-native identity verification.

### Why This Matters

Axiom's ERC-3643 implementation is live on Arbitrum One. The `IdentityRegistry`, `IdentityFactory`, and `ClaimIssuer` contracts gate all AXUSD and AXAU operations. However, some institutional access networks, institutional DeFi protocols, and partner on-ramp flows operate on Polygon. Without a credential bridge, Axiom participants must go through separate KYC flows for each network.

The Polygon identity bridge solves this: one KYC → credentials valid on Arbitrum → mirrored/attested to Polygon via Polygon ID or ONCHAINID → participant can access Polygon-native institutional products with the same verified identity.

---

## Integration Surface Summary

| Surface | Status | Notes |
|--------|--------|-------|
| Polygon ID (iden3) | Not reviewed | Primary candidate for ZK credential bridge |
| ONCHAINID on Polygon | Not reviewed | Could deploy same ERC-3643 IdentityFactory to Polygon |
| Polygon PoS RPC | Available | Alchemy supports `polygon-mainnet` |
| BitGo Polygon Support | Verify | Check if BitGo CaaS supports MATIC wallets |
| Circle Compliance on Polygon | Partial | Circle screens addresses across chains |
| Hardhat Polygon deployment | Available | Standard Hardhat with polygon-mainnet config |

---

## Role Boundaries (Must Not Be Crossed)

| Polygon IS | Polygon IS NOT |
|-----------|---------------|
| Identity bridge / credential expansion | Core execution layer |
| Institutional access extension | Settlement layer |
| zkProof-based verification surface | Reserve layer |
| Additive rail | Replacement for Arbitrum |

---

## Implementation Prerequisites

1. Decide on bridge design: `attestation_model` vs `mirrored_credential` (deploy same IdentityFactory) vs `allowlist_sync`
2. Gather Polygon ID SDK documentation
3. Gather ONCHAINID deployment guide for Polygon
4. Determine gas funding strategy (MATIC required for gas)
5. Enable `ENABLE_POLYGON_IDENTITY_BRIDGE` feature flag only after SDK reviewed and bridge design confirmed
