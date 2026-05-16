# Axiom Protocol — Sui Phase 8 Key Management

**Package:** `axiom`
**Date:** 2026-05-16
**Classification:** Internal Operations — Restricted Distribution

---

## Overview

This document covers key and capability management for the Axiom Protocol Sui Phase 8 deployment. The system uses two capability objects as the primary authorization mechanism: `AdminCap` (per-campaign, controls activation/funding/closure) and `TreasuryOperatorCap` (controls GuardedTreasury deposits and withdrawals).

---

## Capability Objects

### AdminCap

| Property | Value |
|---|---|
| Object type | `axiom::claim_campaign::AdminCap` |
| Abilities | `key, store` |
| Minted | Once, in `create_campaign_entry` |
| Bound to | Specific campaign (via `campaign_id: ID` field) |
| Authorization scope | activate, pause, close_campaign, fund_campaign, drain_pool |
| Cross-check | Every admin call asserts `cap.campaign_id == object::id(campaign)` |

**Security requirement:** AdminCap must be transferred to the protocol multisig within the same PTB as campaign creation. Never leave AdminCap on an EOA private key.

**Recovery:** AdminCap is a transferable object. If the holding address is compromised, the campaign cannot be deactivated without the cap. Always ensure at least 2-of-3 multisig control.

### TreasuryOperatorCap

| Property | Value |
|---|---|
| Object type | `axiom::guarded_treasury::TreasuryOperatorCap` |
| Abilities | `key, store` |
| Minted | Once, in `guarded_treasury::create<T>` |
| Bound to | Specific GuardedTreasury (via `treasury_id: ID` field) |
| Authorization scope | deposit, withdraw from GuardedTreasury |
| Cross-check | `assert!(cap.treasury_id == object::id(treasury))` |

---

## Multisig Requirements

### Recommended Configuration

| Role | Threshold | Signers |
|---|---|---|
| Campaign AdminCap | 2-of-3 | Protocol team members |
| TreasuryOperatorCap | 2-of-3 | Treasury committee members |
| Package upgrade authority | 3-of-5 | Engineering + security |

### Sui Multisig Setup

```bash
# Create 2-of-3 multisig on Sui
sui keytool multi-sig-address \
  --pks <pubkey1> <pubkey2> <pubkey3> \
  --weights 1 1 1 \
  --threshold 2
```

The output address is the multisig address. Transfer AdminCap and TreasuryOperatorCap to this address.

---

## Key Storage Standards

### Deployer Key

- The deployer private key (`DEPLOYER_PRIVATE_KEY`) initiates deployment and holds AdminCap immediately after creation.
- After campaign creation, AdminCap must be transferred out in the same transaction.
- The deployer key should be a cold key used only for deployment — not an operational key.
- Stored in: Replit Secrets (development), HSM / hardware wallet (production).

### Production Key Hierarchy

```
Level 0 — Root of Trust
  ├── HSM-backed key pair (Ledger or similar)
  └── Used only for package publish and multisig setup

Level 1 — Campaign AdminCap (multisig 2-of-3)
  ├── Signer A — Protocol Lead
  ├── Signer B — Engineering Lead
  └── Signer C — Security Officer

Level 2 — TreasuryOperatorCap (multisig 2-of-3)
  ├── Signer A — Treasury Manager
  ├── Signer B — CFO / Finance Lead
  └── Signer C — Protocol Lead
```

---

## Capability Transfer Runbook

### After create_campaign_entry

```bash
# Transfer AdminCap to multisig in same PTB (recommended)
sui client call \
  --package <AXIOM_PACKAGE_ID> \
  --module claim_campaign \
  --function create_campaign_entry \
  --args <LABEL_BYTES> <MERKLE_ROOT> <AMOUNT_PER_CLAIM> <EXPIRES_AT_EPOCH> \
  --gas-budget 10000000 --json

# Then immediately transfer the returned AdminCap to multisig
sui client transfer \
  --object-id <ADMIN_CAP_OBJECT_ID> \
  --to <MULTISIG_ADDRESS> \
  --gas-budget 5000000 --json
```

### After guarded_treasury::create

```bash
# Transfer TreasuryOperatorCap to treasury multisig
sui client transfer \
  --object-id <TREASURY_OPERATOR_CAP_ID> \
  --to <TREASURY_MULTISIG_ADDRESS> \
  --gas-budget 5000000 --json
```

---

## Environment Variables

| Variable | Purpose | Where Stored |
|---|---|---|
| `AXIOM_SUI_PACKAGE_ID` | Deployed package address | Replit Secrets |
| `AXIOM_SUI_CAMPAIGN_ID` | Active campaign object ID | Replit Secrets |
| `AXIOM_SUI_RPC_URL` | Sui RPC endpoint (optional) | Replit Secrets |
| `AXIOM_SUI_NETWORK` | `mainnet` / `testnet` / `devnet` | Replit Secrets |
| `NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID` | Client-visible package ID | Replit Secrets |
| `NEXT_PUBLIC_AXIOM_SUI_NETWORK` | Client-visible network | Replit Secrets |

**Never set in env:** private keys, mnemonic phrases, or raw capability object IDs (capability IDs are discoverable on-chain and not sensitive — private keys are sensitive).

---

## Key Rotation

### AdminCap Rotation

AdminCap cannot be rotated without closing the campaign and creating a new one. There is no `rotate_admin` function. This is intentional — it prevents unauthorized rotation attacks.

To rotate:
1. Close the old campaign with the existing AdminCap.
2. Drain remaining pool funds.
3. Create a new campaign with a new AdminCap held by the new multisig.

### Package Upgrade

The `axiom` package is published with an `UpgradeCap`. The UpgradeCap should be:
- Transferred to the 3-of-5 engineering multisig immediately after publish.
- Used only for security patches, never for breaking changes.
- Documented in the Axiom Protocol governance log before any upgrade.

---

## Incident Response

### Compromised AdminCap Holder

1. Campaign cannot be paused without AdminCap — assess risk of ongoing claims.
2. If Merkle root is correct and claims are legitimate, impact is limited to campaign duration.
3. Create a new campaign with a fresh AdminCap held by a new multisig.
4. Announce campaign migration; update `AXIOM_SUI_CAMPAIGN_ID`.

### Compromised TreasuryOperatorCap Holder

1. GuardedTreasury withdrawals require the cap — monitor for unauthorized drain transactions.
2. No on-chain pause mechanism for treasury — respond within the Sui epoch finality window (~2s).
3. Escalate to all multisig signers immediately.

---

## Audit Trail

All capability operations leave on-chain evidence:
- `CampaignCreated` event includes `admin_cap_id` — track on Suiscan.
- `TreasuryCreated` event includes `operator_cap_id` — track on Suiscan.
- `ClaimMade` events include claimant address and amount.
- `CampaignClosed` includes total_claims and total_paid.

Query events: `suix_queryEvents` with `MoveModule` filter on `axiom::claim_campaign`.
