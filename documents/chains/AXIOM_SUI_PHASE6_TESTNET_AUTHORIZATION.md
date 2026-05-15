# AXIOM SUI — Phase 6 Testnet Authorization
# Sui Testnet Claim Contract Prototype

Status:        PENDING SIGNATURE
Classification: INTERNAL — engineering authorization document
Created:       2026-05-15
Last updated:  2026-05-15

This document constitutes the authorization for Phase 6 testnet implementation
work on the Axiom Sui claim contract prototype. Phase 6 work may NOT begin
until all required signatures are recorded below.

---

## 1. Authorization Scope

This authorization covers exactly the following:

  Chain:          Sui Testnet (chain ID: not applicable — non-EVM)
  Package:        axiom_claim_prototype
  Placeholder asset: AXIOM_TEST_CLAIM (testnet only, no monetary value)
  Sprint 1:       Simple allowlist claim contract
  Sprint 2:       Merkle root claim contract
  SDK:            @mysten/sui (TypeScript — server-side only, no client bundle)

This authorization does NOT cover:

  - Any Sui Mainnet deployment
  - Any production asset issuance (AXUSD, AXAU, AXM, SEED, KAG)
  - Any bridge contract or cross-chain relay
  - Any contract involving real-value assets (USDC, PAXG, WBTC, cbETH, ETH)
  - Any governance, treasury, lending, or reserve contract on Sui
  - Any NFT or identity contract on Sui
  - Any change to Arbitrum One (canonical chain — UNCHANGED)
  - Any change to Avalanche C-Chain (Limited Pilot — UNCHANGED)
  - Any change to Polygon PoS (Phase 5 authorized — UNCHANGED)
  - Any change to banking rails (Stripe, Coinbase Onramp, BitGo, Increase)

A separate Phase 7 authorization is required before any mainnet deployment.

---

## 2. Approved Testnet-Only Package

Package name:   axiom_claim_prototype
Move.toml name: axiom_claim_prototype
Asset name:     AXIOM_TEST_CLAIM
Asset decimals: 6
Asset backing:  None — testnet placeholder with no monetary value
Asset supply:   Admin-minted per campaign; no circulating supply claim

This package is a prototype. It will not be promoted to mainnet without a
separate, independently signed Phase 7 authorization.

---

## 3. Authorized Deployer Address

Sui Testnet address: ________________________________
                     (to be recorded after G04 wallet provisioning)

Notes:
- Deployer address must be a Sui Testnet ed25519 wallet.
- The corresponding private key must be stored ONLY in Replit Secrets
  as SUI_TESTNET_ADMIN_PRIVATE_KEY.
- The private key must NEVER appear in any document, code file, log,
  commit message, or chat.

---

## 4. Move Developer

Named Move developer:      ________________________________
Organization / relation:   ________________________________
Acknowledged onboarding:   [ ] YES — signed/confirmed date: _____________
Acknowledged spec review:  [ ] YES — signed/confirmed date: _____________
Acknowledged scope bounds: [ ] YES — signed/confirmed date: _____________

---

## 5. Move Reviewer

Named Move reviewer:       ________________________________
Organization / relation:   ________________________________
Reviewer is independent of developer: [ ] YES    [ ] NO (explain):
                                       ________________________________

Acknowledged review checklist: [ ] YES — date: ______________________

---

## 6. Required Signatures

This authorization is not in effect until all three signatures below are recorded.

### 6.1 Engineering Lead Authorization

I authorize Phase 6 testnet implementation work to begin under the scope
defined in Section 1. I confirm the Move developer and reviewer named above
have acknowledged their responsibilities.

Name:      ________________________________
Role:      Engineering Lead
Date:      ________________________________
Signature: ________________________________

### 6.2 Operations Authorization

I confirm that no banking rail, production financial system, or canonical
Axiom asset is involved in Phase 6. Arbitrum, Avalanche, and Polygon
production status is unchanged.

Name:      ________________________________
Role:      Operations
Date:      ________________________________
Signature: ________________________________

### 6.3 SDK Install Approval

I specifically approve installation of @mysten/sui (server-side, no client
bundle) at the start of Phase 6 implementation. This install is authorized
only after the signatures in 6.1 and 6.2 are complete.

Name:      ________________________________
Role:      Engineering Lead or delegate
Date:      ________________________________
Signature: ________________________________

---

## 7. No-Mainnet Clause

No Move package developed under this authorization may be deployed to
Sui Mainnet. Mainnet deployment requires a separate Phase 7 authorization
document with independent engineering and legal review.

Violation of this clause is a security incident requiring immediate
escalation.

---

## 8. No-Bridge Clause

No code written under this authorization may implement, reference, or
interoperate with any cross-chain bridge, relayer, or message-passing
protocol. The prototype is a standalone Sui Testnet deployment with no
connection to any other chain.

---

## 9. No-Canonical-Asset Clause

No code written under this authorization may issue, reference, or interact
with AXUSD, AXAU, AXM, SEED, KAG, or any other named Axiom production asset.
AXIOM_TEST_CLAIM is the only coin type permitted, and it carries no monetary
value, no yield, and no redemption right.

---

## 10. Gate Dependencies

This document (when signed) satisfies Gate G06 in the Phase 6 gate tracker.

Gates that must be satisfied BEFORE this document can be signed:
  G03  Move developer named and acknowledged
  G03b Move reviewer named and acknowledged
  G04  Testnet wallet provisioned
  G04b Faucet funding confirmed

Gates satisfied WHEN this document is signed:
  G06  Testnet deployment authorization
  G06b SDK install approved (Section 6.3 signature)

---

*End of Phase 6 Testnet Authorization*
*Status: PENDING SIGNATURE — Phase 6 work may not begin until signed*
