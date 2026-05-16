# Axiom Protocol — Sui Phase 8 Key Management Policy

**Classification:** Internal — Restricted  
**Version:** 0.8.0  
**Date:** 2026-05-16  
**Applies to:** Sui `AdminCap`, Sui deployer key, campaign operator keys

---

## 1. Purpose

This document defines the key management policy for all cryptographic material used in the Axiom Sui Phase 8 claim campaign system.  It covers key generation, storage, rotation, and destruction procedures.

---

## 2. Key Inventory

| Key / Capability | Type | Custody | Risk Level |
|---|---|---|---|
| Sui deployer key | Ed25519 private key | Operator workstation (air-gapped) | Critical |
| `AdminCap` object | Sui owned object | Derived from deployer key address | Critical |
| Campaign operator key | Ed25519 private key | Hardware security module (HSM) | High |
| Eligibility CSV signing key | PGP / Ed25519 | Offline key ceremony | High |
| API server key (none) | N/A — read-only | N/A | Low |

---

## 3. AdminCap Management

### 3.1 Creation

The `AdminCap` is minted once during module initialization (`init(ctx)`).  It is transferred to the Sui address of the deployer at publish time.

**Procedure:**

1. Generate a fresh Ed25519 key pair on an air-gapped workstation using `sui keytool generate ed25519`.
2. Record the public address in the deployment log.
3. Fund the address with enough SUI for gas.
4. Publish the package from the air-gapped machine: `sui client publish --gas-budget 200000000`.
5. Confirm `AdminCap` object ID in the transaction output and record it in the deployment log.

### 3.2 Storage

- The private key for the AdminCap holder address must be stored on a hardware wallet (Ledger Nano X or equivalent) or an HSM.
- No plaintext private key material may reside on internet-connected machines.
- A backup of the encrypted key material must be stored in two geographically separate secure locations.

### 3.3 Transfer / Rotation

To rotate the AdminCap to a new operator address:

1. Prepare the new operator address on a hardware wallet.
2. Execute `claim_campaign::transfer_admin_cap(cap, new_operator_address)` from the current AdminCap holder.
3. Record the new holder address in the deployment log with a timestamp and reason.
4. Destroy the old operator's key material following the destruction procedure (Section 3.4).

Rotation requires approval from two authorized personnel (lead engineer + protocol governance).

### 3.4 Destruction

To permanently renounce admin rights:

1. Obtain approval from the Axiom governance council.
2. Call `claim_campaign::destroy_admin_cap(cap)` from the current AdminCap holder.
3. Record the destruction transaction digest and epoch in the immutable governance log.
4. This action is irreversible.  No future campaigns can be created, paused, or closed under this package.

---

## 4. Deployer Key

- Used once for package publication.
- After publication, the deployer key has no further on-chain authority unless it holds the `AdminCap`.
- If the `AdminCap` was transferred to a hardware wallet at deploy time, the deployer key may be decommissioned.
- Decommission procedure: overwrite with cryptographically random data; record decommission in log.

---

## 5. Eligibility CSV Signing

The eligibility CSV defines which addresses can claim tokens and their amounts.  It must be treated as sensitive operator data.

- Every CSV must be signed with an offline Ed25519 or PGP key before the Merkle root is committed on-chain.
- The CSV and its signature must be stored in a tamper-evident audit log.
- Root updates on active campaigns require two-of-two operator approval and a signed audit trail.
- CSV must not include personally identifiable information beyond Sui wallet addresses.

---

## 6. GuardedTreasury Key

The `TreasuryAdminCap` (produced by `guarded_treasury::create_from_cap`) gates mint operations on the test/staging AMC token.

- Store on the same hardware wallet as the campaign `AdminCap` in staging.
- For mainnet, use a separate HSM-backed key.
- Daily mint cap (`1_000_000_000_000` base units = 1,000,000 AMC) is enforced on-chain as a second line of defence against key compromise.

---

## 7. Incident Response

| Scenario | Immediate action | Recovery |
|---|---|---|
| AdminCap key compromised | Pause all campaigns immediately using backup operator key | Rotate AdminCap; audit all campaigns for unauthorized changes |
| Deployer key compromised (post-transfer) | No immediate on-chain impact | Decommission deployer key; audit deployment artifacts |
| TreasuryAdminCap compromised | Observe GuardedMint events for unauthorized mints; freeze treasury | Call `freeze_treasury`; redeploy with new cap |
| CSV/Merkle root integrity breach | Pause affected campaign immediately | Audit claimed table; issue corrected root after governance approval |

---

## 8. Audit Requirements

- All AdminCap operations must be recorded in the off-chain governance audit log within 24 hours.
- The on-chain event stream (`CampaignCreated`, `CampaignActivated`, `CampaignClosed`, `MerkleRootUpdated`, `TokenClaimed`) must be indexed and monitored continuously.
- Quarterly key rotation review by lead engineer and protocol governance.
