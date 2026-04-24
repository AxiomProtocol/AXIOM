# Polygon — Compliance and Identity Architecture

---

## Identity Framework Options (Must Choose One)

### Option A: Polygon ID (iden3-based, ZK Proofs)

**Architecture:** Issuer → Holder → Verifier pattern using ZK proofs.

- Issuer: Axiom runs a Polygon ID Issuer Node. Issues verifiable credentials to participants.
- Holder: Participant holds credential in a Polygon ID compatible wallet (e.g., Polygon ID app).
- Verifier: Any Polygon-native platform can verify the credential via ZK proof without seeing underlying data.

**Privacy model:** ZK proofs reveal only what is needed (e.g., "accredited investor = true") without exposing personal data.

**Standards alignment:**
- W3C Verifiable Credentials (VC)
- DID (Decentralized Identifier) — `did:polygonid:` method
- Groth16 / Sparse MTP proof systems

**Axiom fit:**
- Strong privacy model aligns with institutional requirements
- Credential schema can mirror Axiom's existing ERC-3643 claim topics (KYC_VERIFIED, ACCREDITED_INVESTOR, SANCTIONS_CLEAR)
- Does not replace Arbitrum ERC-3643 — extends it to Polygon

**Gap:** Requires self-hosted Issuer Node (Docker deployment) or managed issuer service. Operational burden to assess.

---

### Option B: ONCHAINID on Polygon (Mirrored Credential Path)

**Architecture:** Deploy the same ERC-3643 `IdentityFactory` and `IdentityRegistry` contracts to Polygon. Mirror credential state from Arbitrum to Polygon via attestation or allowlist sync.

**Standards alignment:**
- ERC-3643 (T-REX)
- ONCHAINID spec
- Same claim topics as Arbitrum implementation

**Axiom fit:**
- Lower implementation delta — same code, same tooling
- Familiar contract architecture for Axiom team
- Less privacy-preserving than Polygon ID ZK proofs
- Requires cross-chain state sync mechanism (which is nontrivial)

**Gap:** Cross-chain state sync introduces reliability risk. If Arbitrum identity state changes (revocation), Polygon state must be updated too.

---

### Option C: Allowlist Sync (Simplest)

**Architecture:** Maintain an on-chain allowlist on Polygon that mirrors Arbitrum's verified wallet set. Operations team updates Polygon allowlist when Arbitrum credentials change.

**Axiom fit:**
- Lowest technical complexity
- Highest operational burden
- Does not scale well
- Appropriate only for early access / pilot phase

---

## Recommended Path

**Phase 1 (Pilot):** Option C — allowlist sync for initial Polygon partner access.  
**Phase 2 (Scale):** Option A — Polygon ID full integration for privacy-preserving institutional access.

---

## Existing Axiom Identity Infrastructure (Arbitrum)

| Contract | Address | Role |
|---------|---------|------|
| IDENTITY_REGISTRY | See `shared/contracts-3643.ts` | Primary identity registry |
| IDENTITY_FACTORY | See `shared/contracts-3643.ts` | Creates ONCHAINID contracts |
| CLAIM_ISSUER | See `shared/contracts-3643.ts` | Issues KYC/accreditation claims |

**Existing claim topics (from `shared/contracts-3643.ts` → `CLAIM_TOPICS`):**
- `KYC_VERIFIED`
- `SANCTIONS_CLEAR`
- `ACCREDITED_INVESTOR`

These same claim topics should be representable in any Polygon credential schema.

---

## Compliance Scope

Polygon identity bridge must enforce:
1. Participant must have valid Arbitrum ERC-3643 identity before Polygon credential is issued
2. Credential revocation on Arbitrum must propagate to Polygon within defined SLA
3. No Polygon credential issued to wallet without active Arbitrum KYC record
4. Bridge cannot be used to bypass Axiom's compliance gate

---

## KYC Flow Extension

Current flow (Arbitrum only):  
`User submits KYC → t3_kyc_submissions → ERC3643Service.registerIdentity() → claim issued on Arbitrum`

Extended flow (with Polygon bridge):  
`... → [after Arbitrum claim issued] → PolygonCredentialBridgeService.mirrorIdentity() → credential issued on Polygon`

This extension must be gated behind `ENABLE_POLYGON_IDENTITY_BRIDGE` feature flag.
