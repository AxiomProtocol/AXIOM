# Axiom Protocol — Sui Phase 8 Security Review

**Classification:** Internal — Operator & Governance  
**Version:** 0.8.0  
**Date:** 2026-05-16  
**Modules in scope:** `merkle`, `claim_campaign`, `guarded_treasury`, `axiom_test_claim`

---

## 1. Executive Summary

This document records the security analysis performed on the Axiom Sui Phase 8 Move contract suite before any testnet or mainnet deployment.  The review covers the four source modules, their interactions, and the TypeScript off-chain claim toolchain.

Overall risk assessment: **MEDIUM** — no critical vulnerabilities found.  Four medium-severity findings (M1–M4) and three low-severity notes (L1–L3) are documented below with mitigations.

---

## 2. Scope

| Module | File | Version |
|---|---|---|
| merkle | `axiom_sui/sources/merkle.move` | 0.8.0 |
| claim_campaign | `axiom_sui/sources/claim_campaign.move` | 0.8.0 |
| guarded_treasury | `axiom_sui/sources/guarded_treasury.move` | 0.8.0 |
| axiom_test_claim | `axiom_sui/sources/axiom_test_claim.move` | 0.8.0 |
| Proof toolchain | `lib/sui/proofs/` | 0.8.0 |
| Claim API | `pages/api/sui/` | 0.8.0 |

---

## 3. Threat Model

### Trust boundaries

- **Protocol operator** — holds `AdminCap`; trusted for campaign lifecycle management.  Compromise of `AdminCap` allows arbitrary root updates, early campaign close, and fund sweeps.
- **Merkle root authority** — whoever signs the CSV and commits the root on-chain.  A malicious or negligent root author can include unauthorized addresses.
- **On-chain claim caller** — any Sui address; untrusted.  The Move contract enforces all validity checks.
- **Off-chain eligibility API** — read-only query service; does not sign transactions.

### Assets at risk

- Campaign pool balance (SUI in current deployment)
- AdminCap object (single-owner capability)
- Merkle root integrity

---

## 4. Hardening Applied (A1–A7)

| ID | Hardening | Location | Status |
|---|---|---|---|
| A1 | `MAX_PROOF_DEPTH = 20` enforced on-chain | `merkle.move`, `claim_campaign.move` | Applied |
| A2 | Per-address replay protection via `claimed: Table<address, bool>` | `claim_campaign.move` | Applied |
| A3 | `is_active` and `is_closed` guards on all claim and state-change paths | `claim_campaign.move` | Applied |
| A4 | `AdminCap` capability gates every admin entry function | `claim_campaign.move`, `guarded_treasury.move` | Applied |
| A5 | Pool sufficiency check before transfer; GuardedTreasury daily mint cap | `claim_campaign.move`, `guarded_treasury.move` | Applied |
| A6 | Epoch-based expiry checked before any claim is processed | `claim_campaign.move` | Applied |
| A7 | Events emitted on every state transition | `claim_campaign.move`, `guarded_treasury.move` | Applied |

---

## 5. Findings

### M1 — AdminCap is a single point of failure

**Severity:** Medium  
**Location:** `claim_campaign::init`  
**Description:** A single `AdminCap` is created at deploy time and transferred to the deployer.  Loss or theft of this key gives full admin control over all campaigns created under this package.  
**Mitigation (implemented):** `transfer_admin_cap` and `destroy_admin_cap` entry functions allow controlled rotation and renunciation.  
**Recommended:** Implement a multisig wrapper before mainnet (e.g., using Sui's native multisig or a separate on-chain governance contract).  Document key management ceremony in `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md`.

### M2 — Merkle root update clears no existing claims

**Severity:** Medium  
**Location:** `claim_campaign::update_merkle_root`  
**Description:** Updating the Merkle root does not clear the `claimed` table.  Users who claimed under the old root cannot re-claim under the new root, even if their allocation changed.  Users who had NOT yet claimed under the old root can now claim under the new root.  
**Mitigation (current):** Root updates require `AdminCap` and should only be used to correct errors before any claims are processed.  
**Recommended:** Prohibit root updates after any claims have been recorded; add an on-chain claim counter and abort if `claim_count > 0`.

### M3 — Epoch expiry is advisory on epoch boundaries

**Severity:** Medium  
**Location:** `claim_campaign::claim`  
**Description:** Sui epoch boundaries can take up to ~24 hours.  A claim submitted in the final slots of the expiry epoch will succeed even if the operator intended it to fail.  
**Mitigation:** Document this behaviour in operator runbook.  Do not rely on expiry for time-critical cutoffs; use `pause` instead.

### M4 — GuardedTreasury daily cap resets on any epoch change

**Severity:** Medium  
**Location:** `guarded_treasury::guarded_mint`  
**Description:** The daily mint cap resets when `current_epoch > last_epoch`.  An operator could spread mints across multiple calls in adjacent epochs to mint beyond the intended daily limit if the epoch counter advances faster than expected.  
**Mitigation:** Cap values should be set conservatively.  Monitor the `GuardedMint` event stream for anomalous patterns.

---

### L1 — No maximum proof element size validation

**Severity:** Low  
**Location:** `merkle::verify_proof`  
**Description:** Each sibling in the proof is checked to be exactly 32 bytes, but malformed inputs with incorrect element size will abort with `E_BAD_SIBLING_SIZE` rather than `E_INVALID_PROOF`.  This is correct but may confuse error-parsing clients.  
**Mitigation:** Documented.  TypeScript proof serializer (`serializeProof`) always produces 32-byte elements.

### L2 — BCS address encoding assumption

**Severity:** Low  
**Location:** `merkle::compute_leaf`  
**Description:** `std::bcs::to_bytes(&addr)` is used to serialize a 32-byte Sui address.  BCS encoding of an address type is specified as the raw 32 bytes; this assumption must be re-validated if the Sui framework changes BCS semantics.  
**Mitigation:** This matches TypeScript `hexToBytes(addrHex)` exactly.  Include a test vector cross-validation step in the deployment checklist.

### L3 — Closed campaign cannot be re-opened

**Severity:** Low / Design  
**Location:** `claim_campaign::close_campaign`  
**Description:** Closing is permanent.  If a campaign is closed by mistake, all remaining funds must be swept and a new campaign deployed.  
**Mitigation:** Documented as intended behaviour.  The `close_campaign` function is a high-risk operation requiring two-operator approval per the authorization policy.

---

## 6. Off-Chain API Security

| Control | Implementation | Status |
|---|---|---|
| Input validation on campaign ID | Regex `/^0x[0-9a-fA-F]{1,64}$/` in all API routes | Applied |
| Address normalization | `0x` + lowercase + 64-char pad | Applied |
| No private keys server-side | All signing in browser via wallet extension | Applied |
| Proof verification before returning to client | `verifyProofLocal()` called in `/api/sui/eligibility` POST | Applied |
| Rate limiting | Not implemented — recommended before mainnet | Pending |
| Authentication on operator dashboard | Not implemented — dashboard is publicly accessible | Pending |

---

## 7. Deployment Checklist

- [ ] Run `sui move test` on full test suite — target: all 30 tests pass
- [ ] Cross-validate TypeScript leaf hash vs. Move `compute_leaf` with at least 5 test vectors
- [ ] Deploy to testnet and run full claim flow with Sui Wallet browser extension
- [ ] Verify `CampaignCreated` event appears in Suiscan explorer
- [ ] Verify `TokenClaimed` event appears after successful browser claim
- [ ] Transfer AdminCap to hardware-wallet-backed multisig before mainnet
- [ ] Set appropriate `expires_at_epoch` on production campaigns
- [ ] Implement API rate limiting before public mainnet launch

---

## 8. Sign-Off

| Role | Sign-off | Date |
|---|---|---|
| Lead Engineer | Pending | — |
| Protocol Governance | Pending | — |
| External Auditor | Not yet engaged | — |
