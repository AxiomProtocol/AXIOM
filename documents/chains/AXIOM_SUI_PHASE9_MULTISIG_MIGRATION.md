# AXIOM SUI PHASE 9 — MULTISIG MIGRATION PLAN

**Date:** 2026-05-15
**Status:** PENDING — 30-day execution window from mainnet publish
**Owner:** Engineering Lead

---

## Objective

Migrate AdminCap custody from the current single deployer wallet to a 2-of-3 Sui multisig configuration as soon as the three key holders are available for the key ceremony.

---

## Target Custody Architecture

| Role | Responsibility | Key Type |
|---|---|---|
| Engineering Lead | Day-to-day operations, pause/unpause | Sui Ed25519 |
| Operations Lead | Co-authorization for root updates and custody transfers | Sui Ed25519 |
| Emergency Recovery | Offline break-glass, available only for compromise response | Sui Ed25519 (offline/hardware) |

**Required signers:** 2 of 3 for all AdminCap operations.

---

## Sui Multisig Mechanics

Sui native multisig uses `SuiMultiSig` — a threshold address constructed from multiple public keys.

```bash
# Construct the 2-of-3 multisig address
sui keytool multi-sig-address \
  --pks <ENG_PUBKEY> <OPS_PUBKEY> <RECOVERY_PUBKEY> \
  --weights 1 1 1 \
  --threshold 2

# Output: multisig address (0x...)
```

The resulting multisig address is a standard Sui address. Objects transferred to it can only be used with 2-of-3 signatures.

---

## Migration Steps

### Step 1 — Key Generation (each holder independently)

Each holder generates a new Sui key (or supplies existing hardware wallet public key):

```bash
# Generate new key
sui keytool generate ed25519

# Get public key
sui keytool list
```

Each holder must:
- Store the private key securely (hardware wallet or encrypted key management)
- Share ONLY the public key with the Engineering Lead for multisig construction
- Never share the private key

### Step 2 — Multisig Address Construction

Engineering Lead constructs the multisig address from the three public keys:

```bash
sui keytool multi-sig-address \
  --pks <ENG_ED25519_PUBKEY> <OPS_ED25519_PUBKEY> <RECOVERY_ED25519_PUBKEY> \
  --weights 1 1 1 \
  --threshold 2
```

Record the output address as `MULTISIG_ADDRESS`.

### Step 3 — Fund the Multisig Address

The multisig address needs SUI for gas to receive the AdminCap transfer:

```bash
# Transfer a small SUI amount for future gas
sui client transfer-sui \
  --to <MULTISIG_ADDRESS> \
  --amount 100000000 \
  --gas-budget 5000000
```

### Step 4 — Transfer AdminCap to Multisig

**CRITICAL: This is a one-way operation. The deployer wallet loses admin control.**
**Both Engineering Lead and Operations Lead must be present and ready to use the multisig before executing this step.**

Verify multisig is operational first (Step 5 dry-run).

```bash
# Get the AdminCap object ID from the mainnet package
sui client objects --address <DEPLOYER_ADDRESS> | grep AdminCap

# Transfer AdminCap to the multisig address
# This calls transfer_admin_cap() on the package
sui client ptb \
  --move-call <PACKAGE_ID>::claim_campaign::transfer_admin_cap \
  --args <ADMIN_CAP_OBJECT_ID> <MULTISIG_ADDRESS> \
  --gas-budget 50000000
```

### Step 5 — Verify Multisig Control

After transfer, verify that the multisig address owns the AdminCap:

```bash
sui client objects --address <MULTISIG_ADDRESS>
```

Test a non-destructive operation (e.g., pause + unpause) using 2-of-3 multisig workflow:

```bash
# Holder 1 signs
sui client ptb \
  --move-call <PACKAGE_ID>::claim_campaign::pause \
  --args <CAMPAIGN_OBJECT_ID> <ADMIN_CAP_OBJECT_ID> \
  --serialize-unsigned-transaction

# Holder 2 co-signs
# Combine signatures and submit
sui keytool multi-sig-combine-partial-sig \
  --pks ... --weights ... --threshold 2 \
  --sigs <SIG_1> <SIG_2>
```

### Step 6 — Retire Deployer Wallet Admin Access

After multisig control is verified:
- Rotate the deployer wallet secret in environment secret management (it no longer needs AdminCap privileges)
- Document the new custody state in the operator console

---

## Compromise Response

If the deployer wallet is compromised BEFORE multisig migration:

1. Immediately call `close_campaign()` using any remaining deployer wallet access
2. If deployer wallet is inaccessible, the campaign will continue operating — attacker can only pause/close/rotate root (no user fund risk)
3. Engage emergency key rotation process
4. Deploy new audited package under new deployer wallet + complete multisig ceremony before relaunch

If the multisig is compromised post-migration (1 of 3 keys lost or stolen):

1. The threshold prevents a single-key attacker from operating the AdminCap
2. Remaining 2 holders: immediately call `transfer_admin_cap()` to a new emergency address using 2-of-3 signatures
3. Rotate the compromised key out of the multisig by constructing a new multisig address and transferring again
4. Document the incident

---

## Migration Checklist

- [ ] Engineering Lead key generated or confirmed
- [ ] Operations Lead key generated or confirmed
- [ ] Emergency Recovery key generated (offline/hardware)
- [ ] All three public keys collected
- [ ] Multisig address constructed and recorded
- [ ] Multisig address funded with SUI for gas
- [ ] Dry-run test operation confirmed
- [ ] AdminCap transferred to multisig address
- [ ] AdminCap ownership verified on-chain
- [ ] Deployer wallet rotated out of admin role
- [ ] Operator console updated with new custody state
- [ ] AXIOM_SUI_PHASE9_CUSTODY_EXCEPTION.md marked RESOLVED

---

*Axiom Protocol — Sui Phase 9 Multisig Migration Plan*
*Execute within 30 days of mainnet publish.*
