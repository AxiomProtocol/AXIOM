# ERC-3643 Claim Topic Registry — Axiom Protocol

**Version:** 1.0  
**Effective Date:** 2026-03-30  
**Classification:** Institutional Disclosure — Not Investment Advice

---

## 1. Purpose

This document is the canonical registry of all ERC-3643 claim topics used in the Axiom Protocol identity system. It defines each topic's numeric ID, semantic meaning, validity period, off-chain process, revocation mechanics, and relationship to transfer compliance enforcement.

---

## 2. On-Chain Infrastructure

| Component | Address | Role |
|---|---|---|
| Claim Topics Registry | `0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18` | Authoritative list of recognized claim topic IDs |
| Trusted Issuers Registry | `0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1` | Whitelists claim issuers per topic |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Signs and revokes claims on behalf of Axiom Protocol |
| Identity Registry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Maps wallets to ONCHAINID contracts; enforces `isVerified()` |
| Identity Registry Storage | `0x5A906507f886db1f41b12c75324C96dE27aB2E81` | Persistent storage contract for identity mappings |
| Identity Factory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` | Deploys EIP-1167 minimal proxy ONCHAINID contracts per investor |

---

## 3. Claim Topic Definitions

### Topic 1 — KYC_VERIFIED

| Field | Value |
|---|---|
| Topic ID | `1` |
| Canonical Name | `KYC_VERIFIED` |
| Validity Period | 365 days from issuance |
| Refresh Warning | 30 days before expiry |
| Required For | All AXUSD transfers; PSM mint/redeem |
| Off-Chain Process | Investor submits full name, date of birth, country, document type via KYC form. Protocol operator reviews in compliance queue. On approval: `registerIdentity()` + `issueClaim(topic=1)` called atomically via `ERC3643Service.atomicKycApproval()`. |
| On-Chain Effect | Sets `isVerified(wallet) = true` if Topic 1 + Topic 3 are both valid and unrevoked |
| Database Table | `t3_kyc_submissions` (submission) → `t3_identities` + `t3_claims` (post-approval) |

**Claim Data Encoding:**
```
claimData = keccak256(abi.encode(wallet, topic, "KYC_VERIFIED"))
signature  = ECDSA sign(claimDataHash) by Claim Issuer key
```

**Expiry Behavior:**
- The ONCHAINID contract stores `validTo` timestamp in the claim struct
- `isClaimValid()` on the Claim Issuer returns `false` once `block.timestamp > validTo`
- An expired claim causes `identityRegistry.isVerified()` to return `false`
- All transfers and PSM operations involving the wallet are blocked until the claim is renewed

---

### Topic 2 — ACCREDITED_INVESTOR

| Field | Value |
|---|---|
| Topic ID | `2` |
| Canonical Name | `ACCREDITED_INVESTOR` |
| Validity Period | 365 days from issuance |
| Refresh Warning | 30 days before expiry |
| Required For | Lending Fund participation; future gated products |
| Off-Chain Process | Investor completes self-certification form with accreditation basis (net worth, income, professional certification). Protocol compliance team reviews submitted documentation. On approval: `ERC3643Service.approveAccreditation()` calls `issueClaim(topic=2)`. |
| On-Chain Effect | Recorded on ONCHAINID; does not by itself satisfy `isVerified()` (Topic 1 + Topic 3 required for that) |
| Database Table | `t3_accreditation_submissions` (submission) → `t3_claims` (post-approval) |

**Accreditation Bases:**
- Net worth ≥ $1,000,000 (excluding primary residence)
- Individual income ≥ $200,000 for 2 prior years (or joint ≥ $300,000)
- Series 7, 65, or 82 license holder
- Knowledgeable employee of a qualified purchaser fund
- Registered investment adviser

Note: Self-certification is accepted at submission. The protocol does not independently verify financial figures but retains submission records for regulatory review.

---

### Topic 3 — SANCTIONS_CLEAR

| Field | Value |
|---|---|
| Topic ID | `3` |
| Canonical Name | `SANCTIONS_CLEAR` |
| Validity Period | 180 days from issuance |
| Refresh Warning | 30 days before expiry |
| Required For | All AXUSD transfers (alongside Topic 1) |
| Off-Chain Process | Performed concurrently with KYC review. Protocol operator verifies name and country against OFAC SDN list and applicable government sanctions lists. If clear, Topic 3 is issued as part of the atomic KYC approval flow. If flagged, the submission is rejected and no identity is registered. |
| On-Chain Effect | Co-required with Topic 1 for `isVerified() = true` |
| Database Table | `t3_claims` (linked to identity via `identityId`) |

**Shorter Validity Rationale:** SANCTIONS_CLEAR has a shorter 180-day validity because sanctions list membership can change more rapidly than KYC status. The shorter window ensures the protocol re-screens participants for sanctions exposure more frequently.

---

## 4. Claim Validity Check Logic

The ERC-3643 compliance flow checks claim validity at the point of each transfer:

```
isVerified(wallet):
  identity = identityRegistry.identity(wallet)  // ONCHAINID address
  for each required topic:
    claims = identity.getClaimsByTopic(topic)
    for each claim:
      if claimIssuer.isClaimValid(identity, topic, claim.data, claim.signature):
        return true  // at least one valid claim for this topic
    return false  // no valid claim found for topic
  return true     // all required topics have at least one valid claim
```

A transfer between wallets `from` → `to` is allowed only if `isVerified(from) AND isVerified(to)` is true and all compliance modules (`canTransfer()`) return true.

---

## 5. Claim Expiry Monitoring

The system monitors claim expiry via `/api/erc3643/identity/expiry-check`:

1. All active claims are scanned against `expires_at` and `refresh_required_by` timestamps
2. Claims within `CLAIM_REFRESH_WARNING_DAYS` (30) of expiry are flagged
3. Flagged wallets receive email notification via Resend integration
4. Compliance operators see expired/expiring claims in the Founder Ops compliance tab

**Expiry Schedule Example (KYC_VERIFIED, 365-day):**
- Day 0: Claim issued
- Day 335: `refresh_required_by` — warning email sent; operator alerted
- Day 365: Claim expires — `isVerified()` returns false; transfers blocked

---

## 6. Claim Revocation

Claims can be revoked via two mechanisms:

### 6.1 Admin Revocation (Off-Chain Initiated)
- Endpoint: `POST /api/erc3643/identity/revoke`
- Auth: `x-admin-key` header
- Action: Calls `ERC3643Service.revokeClaim(claimId, adminWallet)`
  1. Marks claim `revoked = true` in `t3_claims` database table
  2. Calls `ClaimIssuer.revokeClaim(bytes32 claimId, address identity)` on-chain
  3. Logs action to `t3_compliance_ops_log`
- Effect: `isClaimRevoked()` returns true immediately; transfers involving the wallet are blocked at next compliance check

### 6.2 On-Chain Direct Revocation
- Function: `ClaimIssuer.revokeClaimBySignature(bytes originalSignature)`
- Caller: Deployer EOA (claim issuer key)
- Use case: Emergency revocation without off-chain database coordination

---

## 7. Database Schema Summary

| Table | Purpose |
|---|---|
| `t3_identities` | One row per registered wallet — maps to `onchain_id_address`, country, verification level |
| `t3_claims` | One row per issued claim — links `identity_id`, topic, issuer, validity window, revocation status |
| `t3_kyc_submissions` | Pre-approval KYC intake queue — status: submitted → approved/rejected |
| `t3_accreditation_submissions` | Pre-approval accreditation intake queue |
| `t3_compliance_ops_log` | Immutable audit log of all claim lifecycle events (issue, revoke, expiry) |
| `t3_compliance_events` | Transfer-level compliance check log (from, to, amount, module checked, result) |

---

## 8. Country Allowlist

The Country Allow Module (`0xfa3404d1...`) restricts AXUSD transfers to whitelisted country codes. Current allowlist:

| Country | ISO 3166-1 Numeric Code |
|---|---|
| United States | 840 |

Additional countries are added via `CountryAllowModule.addAllowedCountry(token, countryCode)` called by the token owner (currently Deployer EOA, migrating to Governance Safe).

---

## 9. Limitations

- Claim issuance is manual (operator-reviewed). There is no automated ID verification provider integration in the current architecture.
- Sanctions screening is manual. No real-time watchlist API is currently integrated.
- Claim signatures are generated by the Deployer EOA key. Key compromise would allow fraudulent claim issuance. Migration to a dedicated claim issuer controlled by the Governance Safe is a planned hardening step.
- This registry reflects the deployed state as of 2026-03-30.

---

## 10. Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-03-30 | Initial document. ERC-3643 Unified AXUSD live. Topics 1, 2, 3 defined. |

---

*Document produced by Axiom Protocol. Last updated: 2026-03-30.*
