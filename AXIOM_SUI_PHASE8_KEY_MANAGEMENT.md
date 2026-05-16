# AXIOM SUI PHASE 8 — KEY MANAGEMENT

**Package:** `axiom_claim_mainnet_candidate`
**Date:** 2026-05-16
**Classification:** Internal Operations — Restricted Distribution

---

## 1. Key Objects in Scope

| Object | Type | Who Controls | Risk if Compromised |
|---|---|---|---|
| AdminCap | `axiom_claim_mainnet_candidate::claim_campaign::AdminCap` | Campaign operator | Can pause/unpause/close campaign, update merkle root, fund campaign |
| GuardedTreasury | `axiom_claim_mainnet_candidate::guarded_treasury::GuardedTreasury<AXIOM_MAINNET_CLAIM>` | Designated minter | Can mint up to MAX_SUPPLY tokens |
| Publisher wallet | Sui EOA | Protocol admin | Controls initial deployment and AdminCap receipt |

**UpgradeCap:** Intentionally destroyed at publish time. No entity holds upgrade authority.

---

## 2. Key Ceremony — Deployment

### Step 1: Pre-Deployment Key Generation
- Generate a new dedicated Sui keypair for campaign operations (do not reuse protocol treasury keys)
- Store private key in hardware security module (HSM) or offline cold storage
- Recommended: Ledger Nano hardware wallet with Sui app, or AWS CloudHSM for automated flows
- Record public address: `CAMPAIGN_OPERATOR_ADDRESS`

### Step 2: Package Publish
```bash
sui client publish --gas-budget 100000000 \
  sui/packages/axiom_claim_mainnet_candidate \
  --skip-dependency-verification
```
- Publisher receives: `AdminCap`, `GuardedTreasury<AXIOM_MAINNET_CLAIM>`
- Record published package ID: `PACKAGE_ID`
- Record AdminCap object ID: `ADMIN_CAP_ID`
- Record GuardedTreasury object ID: `GUARDED_TREASURY_ID`

### Step 3: AdminCap Transfer (Optional Multi-Party Setup)
If using a multi-party authorization scheme:
```bash
sui client call \
  --package $PACKAGE_ID \
  --module claim_campaign \
  --function transfer_admin_cap \
  --args $ADMIN_CAP_ID $MULTISIG_ADDRESS \
  --gas-budget 10000000
```
Transfer AdminCap to a multi-sig address before activating any campaign.

### Step 4: Campaign Operator Key Registration
Register `CAMPAIGN_OPERATOR_ADDRESS` in Axiom internal key registry.
Document: key type, creation date, custodian, rotation schedule.

---

## 3. Key Custody Tiers

### Tier 1 — Hot (Automated Claims Processing)
- **Purpose:** Off-chain eligibility API signing, proof generation
- **Storage:** Environment secret (e.g., `AXIOM_SUI_OPERATOR_PRIVKEY`) in Replit Secrets
- **Rotation:** Every 90 days or upon suspected compromise
- **Scope:** Read-only chain queries + eligibility proof signing (no AdminCap)

### Tier 2 — Warm (Campaign Administration)
- **Purpose:** Fund campaign, activate/pause, update merkle root
- **Storage:** Hardware wallet (Ledger) or offline encrypted keystore
- **Rotation:** Per campaign or every 180 days
- **Scope:** AdminCap operations only

### Tier 3 — Cold (GuardedTreasury Minting)
- **Purpose:** Mint new community reward tokens
- **Storage:** Air-gapped machine; multi-sig required (2-of-3)
- **Rotation:** Per minting event; key ceremony required
- **Scope:** `guarded_mint` calls only; amount bounded by MAX_SUPPLY

---

## 4. AdminCap Operational Procedures

### 4.1 Campaign Lifecycle

| Operation | Required Key | Recommended Approval |
|---|---|---|
| create_campaign_entry | Publisher wallet | 1-of-1 (deployment) |
| fund_campaign | AdminCap (Tier 2) | 1 operator |
| activate | AdminCap (Tier 2) | 1 operator |
| pause | AdminCap (Tier 2) | 1 operator |
| unpause | AdminCap (Tier 2) | 2 operators |
| update_merkle_root | AdminCap (Tier 2) | 2 operators + root hash audit |
| close_campaign | AdminCap (Tier 2) | 2 operators + finance sign-off |
| destroy_admin_cap | AdminCap (Tier 2) | Multi-party ceremony |
| transfer_admin_cap | AdminCap (Tier 2) | Multi-party ceremony |

### 4.2 Merkle Root Update Procedure
Root updates are high-risk operations (wrong root blocks all claims or opens unauthorized ones):
1. Pause campaign via `pause()`
2. Generate new eligibility CSV via `validateEligibilityCsv`
3. Build new Merkle tree via `buildMerkleTree`
4. Have second operator independently verify root hash against CSV
5. Call `update_merkle_root` with new root
6. Resume campaign via `unpause()` only after verification

### 4.3 Campaign Close Procedure
Close is permanent and irrecoverable:
1. Pause campaign
2. Confirm all eligible claimants have been notified
3. Record snapshot of `pool_value` and `claimed` count off-chain
4. Call `close_campaign` — remaining pool returned to operator
5. Store returned coins in protocol treasury

---

## 5. Incident Response

| Scenario | Immediate Action | Recovery |
|---|---|---|
| AdminCap key suspected compromise | Pause campaign immediately | Transfer AdminCap to new address if key still accessible; otherwise campaign remains paused until close |
| AdminCap key lost | Campaign cannot be paused or closed | Tokens remain in pool indefinitely; deploy new campaign |
| GuardedTreasury key lost | No new minting possible | Remaining supply accessible; deploy new GuardedTreasury in Phase 10 |
| Wrong Merkle root uploaded | Pause campaign immediately | Update root after dual verification |
| Funds sent to campaign from wrong source | Pause campaign | Close campaign to retrieve funds |

---

## 6. Key Rotation Schedule

| Key | Rotation Trigger | Rotation Method |
|---|---|---|
| Operator Sui keypair (Tier 1) | 90 days or compromise | Generate new keypair; update env secret |
| AdminCap wallet (Tier 2) | Per campaign or 180 days | transfer_admin_cap to new wallet |
| GuardedTreasury wallet (Tier 3) | Per minting event | transfer GuardedTreasury object |

---

## 7. Environment Variables

The following secrets must be configured before operating the claim system:

| Secret | Purpose | Required For |
|---|---|---|
| `AXIOM_SUI_RPC_URL` | Sui fullnode RPC endpoint | All API routes |
| `AXIOM_SUI_PACKAGE_ID` | Published package object ID | Campaign queries |
| `AXIOM_SUI_NETWORK` | `mainnet` / `testnet` / `devnet` | Client init |
| `AXIOM_SUI_ADMIN_CAP_ID` | AdminCap object ID | Operator dashboard |
| `AXIOM_SUI_GUARDED_TREASURY_ID` | GuardedTreasury object ID | Minting operations |

No private keys are stored in environment variables. All signing is done in air-gapped or HSM environments.
