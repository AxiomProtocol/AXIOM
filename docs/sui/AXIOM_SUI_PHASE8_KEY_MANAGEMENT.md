## AXIOM PROTOCOL — SUI PHASE 8 KEY MANAGEMENT

Date: 2026-05-17
Scope: Private key and capability management for the SUI claim campaign system.

---

### OVERVIEW

The SUI claim campaign system uses two types of on-chain capabilities instead of traditional private-key access control:

1. **AdminCap** (`axiom::claim_campaign::AdminCap`) — controls campaign lifecycle (fund, activate, pause, close, drain)
2. **TreasuryOperatorCap** (`axiom::guarded_treasury::TreasuryOperatorCap`) — controls treasury pool deposits and withdrawals

Both are Sui owned objects with `key+store` ability. They are non-fungible, non-duplicatable, and bound to a specific campaign or treasury ID at creation.

---

### DEPLOYER KEY

**What it is**: The Sui keypair used to sign the `publish` transaction that deploys the `axiom` package.

**What it can do after deployment**: The deployer address automatically receives the AdminCap from `create_campaign_entry()` and the TreasuryOperatorCap from `guarded_treasury::create()`.

**Risk**: If the deployer key is compromised before caps are transferred to a multisig, an attacker gains full campaign admin access.

**Mitigation**:
- Use a dedicated deployment keypair, not a personal wallet
- Immediately after deployment, execute `sui client transfer` to move both caps to the protocol multisig
- Rotate the deployment key after initial setup is complete

**Where stored**: `DEPLOYER_PRIVATE_KEY` Replit secret (server-side only, never exposed to client).

---

### ADMIN CAP — CUSTODY REQUIREMENTS

After deployment, AdminCap should be held by a multisig with at least M-of-N signers where N ≥ 3, M ≥ 2.

**Recommended setup**:
- 3-of-5 Sui Safe (when Sui Safe supports the package)
- Until Sui Safe support is confirmed: use a 2-of-3 hardware wallet quorum via Ledger + Sui CLI

**Operations requiring AdminCap**:
- `fund_campaign` — deposit AMC tokens into the pool
- `activate` — open the campaign for claims
- `pause` — temporarily halt claims
- `close_campaign` — permanently close (irreversible)
- `drain_pool` — recover remaining AMC after closure

**Frequency**: Infrequent (once per campaign lifecycle phase). Recommend scheduling operations in advance to allow multisig co-signers to be available.

---

### TREASURY OPERATOR CAP — CUSTODY REQUIREMENTS

TreasuryOperatorCap should be held by the same multisig as AdminCap, or by a separate operations key if the protocol separates treasury and campaign management roles.

**Operations requiring TreasuryOperatorCap**:
- `deposit` — add AMC to the GuardedTreasury pool
- `withdraw` — move AMC out of the treasury to a recipient

**Note**: `take_balance()` is `public(package)` — only callable from within the `axiom` package itself, not from external callers. This limits exposure even if the treasury object ID is known.

---

### PACKAGE ID AND OBJECT IDS — ENVIRONMENT VARIABLES

The following IDs are not secrets but must be accurately configured for the system to function. Misconfiguration causes silent API failures, not security breaches.

| Variable | Description |
|---|---|
| `AXIOM_SUI_PACKAGE_ID` | Deployed package ID (after publish) |
| `NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID` | Same, exposed to browser for PTB construction |
| `AXIOM_SUI_ADMIN_CAP_ID` | AdminCap object ID held by protocol |
| `AXIOM_SUI_GUARDED_TREASURY_ID` | GuardedTreasury shared object ID |
| `AXIOM_SUI_CAMPAIGN_ID` | Active campaign object ID |
| `AXIOM_SUI_NETWORK` | mainnet, testnet, devnet, or localnet |
| `AXIOM_SUI_RPC_URL` | Optional custom RPC override |
| `AXIOM_SUI_DEPLOYER_ADDRESS` | Deployer wallet address (for event indexing only) |

None of these variables contain private keys. They are safe to log for debugging purposes but should not be publicly displayed in the claim UI.

---

### RPC PROVIDER KEY MANAGEMENT

The system uses public Sui fullnode RPC endpoints by default. If a dedicated RPC provider (e.g., Triton One, Shinami, BlockEden) is used:

- Store the API key in `AXIOM_SUI_RPC_URL` as a full URL with embedded key: `https://api.example.com/v1/<KEY>/rpc`
- This URL is server-side only and must not be exposed to NEXT_PUBLIC_ variables
- Rotate RPC keys on a quarterly basis or immediately if exposed

---

### MERKLE ROOT INTEGRITY

The Merkle root stored in `ClaimCampaign.merkle_root` is set at creation time and is immutable. If an incorrect root is deployed:

1. Close the campaign (requires AdminCap)
2. Drain the pool back to the multisig wallet
3. Create a new campaign with the correct root

There is no upgrade path. Verify the root locally using `buildMerkleTree(entries).root` before creating a campaign on-chain.

---

### INCIDENT RESPONSE

If AdminCap is compromised:
1. The campaign pool is at risk. The attacker can close the campaign and drain funds to any address.
2. There is no on-chain freeze mechanism — Move object ownership is final.
3. Immediately alert all protocol multisig co-signers.
4. If possible, race to close the campaign from a co-signer before the attacker acts.
5. Conduct a post-mortem and replace all campaign infrastructure with fresh deployments.

If deployment key is compromised before cap transfer:
1. All caps minted to that deployer address are at risk.
2. Race to transfer caps from the deployment key to the multisig.
3. If caps are stolen, treat as above (compromised AdminCap incident).

---

### AUDIT LOG

All on-chain capability uses are auditable via Sui event indexing. Query `CampaignFunded`, `CampaignActivated`, `CampaignPaused`, `CampaignClosed`, and `ClaimMade` events for the relevant package ID and campaign ID. The API endpoint `GET /api/sui/campaigns/[id]` provides current campaign state for operator monitoring.

---

CLASSIFICATION: INTERNAL OPERATOR DOCUMENT — RESTRICTED
