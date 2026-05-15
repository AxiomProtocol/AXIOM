# AXIOM SUI PHASE 4 — DISTRIBUTION LAYER BLUEPRINT

**Document type:** Integration Blueprint  
**Phase:** Phase 4 — Foundation & Distribution-Layer Architecture  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Status:** BLUEPRINT — implementation not yet started  
**Classification:** Internal — architecture record  

---

## 1. Purpose

This blueprint defines the Axiom Sui distribution layer architecture for future
implementation phases. It establishes:

- The strategic scope of Sui in the Axiom protocol
- The technical architecture for community token distribution on Sui
- The phase gate structure for progressing from Phase 4 (foundation) to live operations
- The SDK and Move package requirements

This is a planning document. Nothing described here is live.

---

## 2. Strategic Scope

Sui's role in Axiom is strictly the **distribution layer**:

- Wallet-facing token distribution to community members and diaspora wallets
- Community participation instrument (AXM distribution mirror, not issuance)
- Future: community NFT / badge delivery on Sui
- Future: Sui-native wallet user onboarding flow

Sui is explicitly NOT:
- A settlement layer (Arbitrum / Polygon)
- A reserve layer (Arbitrum / Ethereum)
- An issuance layer (Arbitrum canonical)
- A policy/compliance layer (Arbitrum / Avalanche)
- A governance layer (Arbitrum)

---

## 3. Sui Architecture Overview

### 3.1 Move VM vs EVM

Sui runs the Move Virtual Machine, not the EVM. This has significant implications:

**Contracts → Move Packages**
Axiom cannot reuse any existing Solidity contracts on Sui. All Sui-side logic must be
written in Move and compiled using the Sui Move toolchain.

**Addresses → Object IDs**
Sui does not use 20-byte Ethereum addresses. All contracts (packages), tokens (Coins),
and treasury accounts are identified by 32-byte object IDs.

**Tokens → Coin<T>**
Sui tokens follow the `Coin<T>` standard from the Move standard library. A Sui token
is identified by a type tag of the form `<packageId>::<module>::<TypeName>`.

**Wallets → ed25519 / secp256k1**
Sui supports both ed25519 and secp256k1 key pairs, but the wallet format is
incompatible with Ethereum wallets. Sui wallets cannot be directly used with
MetaMask or WalletConnect.

### 3.2 SDK Requirements

| Component | Package | Status |
|---|---|---|
| TypeScript/Node SDK | `@mysten/sui` | NOT INSTALLED |
| Move compiler | `sui` CLI (Rust-based) | NOT INSTALLED |
| Move test framework | Built into `sui` CLI | NOT INSTALLED |

The `@mysten/sui` package (npm) is the current canonical SDK, superseding the older
`@mysten/sui.js` package.

### 3.3 RPC Endpoint

Sui uses its own JSON-RPC format, incompatible with EVM JSON-RPC.
- Do NOT pass Sui RPC URLs to `ethers.JsonRpcProvider`
- Do NOT use `viem` for Sui
- The `getSuiRpcUrl()` helper in `lib/chains/providers.ts` returns the correct URL
  but the caller is responsible for using it with the `@mysten/sui` SDK only

Public mainnet RPC: `https://fullnode.mainnet.sui.io`

---

## 4. Distribution Architecture Options

Three distribution models are under consideration. A decision is required before
Phase 5 implementation begins. See `AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md`.

### Option A: Direct Airdrop (Native Sui)
Deploy a Sui Move package that holds a pre-funded AXM coin pool.
Axiom backend calls the package to distribute coins to registered Sui wallet addresses.
No bridge required. Requires separate AXM supply on Sui (not bridged from Arbitrum).

### Option B: Claim Contract (Native Sui)
Deploy a Sui Move package with a merkle-root-based claim mechanism.
Community members with eligible Sui wallets submit claim transactions.
No bridge required. Same AXM supply consideration as Option A.

### Option C: Bridge from Arbitrum (Cross-Chain)
Deploy a Wormhole or LayerZero bridge adapter.
AXM tokens locked on Arbitrum are mirrored as a wrapped token on Sui.
Requires bridge partner selection and integration.
Preserves Arbitrum-canonical supply.

---

## 5. Phase Gate Structure

### Phase 4 (Current) — Foundation
- [x] lib/chains/ scaffold complete
- [x] shared/contracts-sui.ts created (all null)
- [x] chainRegistry.ts entry added
- [x] IntegrationReadinessModel.ts artifacts added
- [x] featureFlags.ts SUI_DISTRIBUTION_LAYER added
- [x] Explorer URL corrected (suiscan.xyz)
- [ ] SDK not installed
- [ ] No Move packages
- [ ] No frontend changes
- CHAIN_SUI_ENABLED: false

### Phase 5 — Architecture Decision + SDK Review
- [ ] Distribution architecture decision made (Options A/B/C)
- [ ] @mysten/sui SDK reviewed and installed
- [ ] Sui Move developer capability established
- [ ] Testnet wallet provisioned
- [ ] CHAIN_SUI_ENABLED: false (still disabled)

### Phase 6 — Testnet Build
- [ ] Move package written and tested on Sui Testnet/Devnet
- [ ] TypeScript integration layer built
- [ ] Admin control plane (server-side only)
- [ ] CHAIN_SUI_ENABLED: false (still disabled)

### Phase 7 — Mainnet Deployment
- [ ] Move package deployed to Sui Mainnet
- [ ] Object IDs populated in shared/contracts-sui.ts
- [ ] Ops review and accepted-risk record
- [ ] CHAIN_SUI_ENABLED: true (ops approval required)

---

## 6. Sui Mainnet Network Details

| Property | Value |
|---|---|
| Network | Sui Mainnet |
| RPC (public) | https://fullnode.mainnet.sui.io |
| Explorer | https://suiscan.xyz |
| Alternative explorer | https://suivision.xyz |
| Native token | SUI (9 decimals) |
| Consensus | Mysticeti (DAG-based) |
| Finality | ~0.5 seconds (optimistic) |
| Alchemy support | None — use direct RPC |

---

## 7. Interaction with Existing Systems

### Arbitrum (canonical)
Sui does not touch Arbitrum contracts. Any distribution of AXM on Sui is a
separate instrument from the Arbitrum-canonical AXM governance token, unless
a bridge model is chosen (Option C).

### Identity (ERC-3643 on Arbitrum)
Sui wallets cannot directly interact with ERC-3643 identity contracts.
If identity-gated distribution is required, off-chain attestation (Axiom backend
verifies Arbitrum identity, then authorizes Sui wallet address) is the correct pattern.

### BitGo CaaS
BitGo does not support Sui custody. Any Sui-side treasury objects must use
a Sui-native multi-signature or admin-controlled shared object pattern.

### Polygon (payments)
Sui and Polygon are independent layers. No interaction required between them.

---

## 8. Risk Notes

| Risk | Severity | Mitigation |
|---|---|---|
| Move language unfamiliarity | High | Contracted Move developer or audit required |
| No BitGo Sui custody | Medium | Sui-native multi-sig pattern in Move package |
| Bridge counterparty risk (Option C) | Medium | Prefer native Sui if feasible |
| Sui wallet UX mismatch | Low | Separate Sui onboarding flow from EVM onboarding |
| Regulatory ambiguity of distribution | Medium | Legal review before Phase 7 mainnet |
