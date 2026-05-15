# Axiom Protocol — Sui Emergency Operations Runbook
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Scope:** AMC community distribution only.

Prerequisites: Sui CLI installed, `SUI_DEPLOYER_KEY` accessible, active address `0x4917ffea...`

---

## Environment Setup

```bash
export PATH="$HOME/.local/bin:$PATH"
export PACKAGE="0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487"
export CAMPAIGN="0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982"
export ADMIN_CAP="0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a"
export TREASURY="0x6576a7e8fab5bebbadef57336af3863ab58c15b0e653701dedd5bd47a8618ea7"

# Verify active address and network
sui client active-address
sui client active-env
# Expected: address = 0x4917ffea..., env = mainnet
```

---

## Emergency Control 1 — Pause Campaign

Use when: suspected abuse, RPC instability, security investigation, planned maintenance.

```bash
sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function pause \
  --args "$CAMPAIGN" "$ADMIN_CAP" \
  --gas-budget 10000000
```

**Verify:** Check `is_active` on suiscan.xyz — should be `false`.
**Effect:** No new claims accepted. Existing eligible claimants can claim once unpaused.
**Reversible:** Yes — see Unpause below.

---

## Emergency Control 2 — Unpause Campaign

Use when: resuming after pause, investigation complete, maintenance done.

```bash
sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function unpause \
  --args "$CAMPAIGN" "$ADMIN_CAP" \
  --gas-budget 10000000
```

**Verify:** Check `is_active` on suiscan.xyz — should be `true`.
**Precondition:** Campaign must not be closed (`is_closed = false`).

---

## Emergency Control 3 — Close Campaign (Permanent)

Use when: campaign is complete, security incident requires permanent shutdown, pool is depleted.

**WARNING: This action is IRREVERSIBLE. `is_closed` cannot be set back to false.**

```bash
sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function close_campaign \
  --args "$CAMPAIGN" "$ADMIN_CAP" \
  --gas-budget 10000000
```

**Effect:** Campaign permanently closed. Remaining pool balance returned to operator wallet.
**Verify:** Check `is_closed = true` on suiscan.xyz.

---

## Emergency Control 4 — Update Merkle Root

Use when: eligibility list correction required (campaign must be paused first).

**Precondition:** Pause campaign first.

```bash
# Step 1: Pause
sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function pause \
  --args "$CAMPAIGN" "$ADMIN_CAP" \
  --gas-budget 10000000

# Step 2: Update root (replace ROOT_BYTES with new 32-byte JSON array)
sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function update_merkle_root \
  --args "$CAMPAIGN" "[BYTE,BYTE,...32 bytes]" "$ADMIN_CAP" \
  --gas-budget 10000000

# Step 3: Unpause when ready
sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function unpause \
  --args "$CAMPAIGN" "$ADMIN_CAP" \
  --gas-budget 10000000
```

**Important:** Update `lib/sui/campaignRegistry.ts` and `lib/sui/proofs/phase9-mainnet-eligibility.json` to match new root.

---

## Emergency Control 5 — Mint Additional AMC and Fund Pool

Use when: pool is depleted but campaign should continue.

```bash
# Mint N base units and fund in one PTB
export COIN_TYPE="${PACKAGE}::axiom_mainnet_claim::AXIOM_MAINNET_CLAIM"
export AMOUNT=4000000  # 4 AMC example

sui client ptb \
  --move-call "${PACKAGE}::guarded_treasury::guarded_mint<${COIN_TYPE}>" \
    @"$TREASURY" $AMOUNT \
  --assign minted \
  --move-call "${PACKAGE}::claim_campaign::fund_campaign" \
    @"$CAMPAIGN" minted @"$ADMIN_CAP" \
  --gas-budget 50000000
```

**Supply cap:** 1,000,000,000,000,000 base units total. Check `total_minted` on GuardedTreasury object before minting.

---

## Emergency Control 6 — Switch RPC Provider

Use when: primary Sui RPC is down or degraded.

**File:** `lib/sui/client.ts` — `getSuiNetworkUrl()`

```typescript
// Current (Sui Foundation):
'https://fullnode.mainnet.sui.io:443'

// Alchemy alternative (requires ALCHEMY_API_KEY):
`https://sui-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

// Blockeden alternative:
'https://api.blockeden.xyz/sui/mainnet/your-key'
```

After updating, restart the dev server or redeploy.

---

## Emergency Control 7 — Transfer AdminCap to New Wallet

Use when: wallet migration or compromise response.

```bash
export NEW_WALLET="0xNEW_WALLET_ADDRESS"

sui client call \
  --package "$PACKAGE" \
  --module claim_campaign \
  --function transfer_admin_cap \
  --args "$ADMIN_CAP" "$NEW_WALLET" \
  --gas-budget 10000000
```

**WARNING:** AdminCap will be transferred to `NEW_WALLET`. Ensure `NEW_WALLET` is accessible before executing.
**Verify:** Check AdminCap ownership on suiscan.xyz after transfer.

---

## Verify Campaign State

```bash
# Check campaign object state
sui client object "$CAMPAIGN" --json
# Key fields: is_active, is_closed, merkle_root, pool (balance)

# Check AdminCap ownership
sui client object "$ADMIN_CAP" --json
# Key field: owner (should be operator wallet)

# Check GuardedTreasury total_minted
sui client object "$TREASURY" --json
# Key field: total_minted

# Check operator wallet objects
sui client objects 0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad
```

---

## Manual Communications Protocol

For P0/P1 incidents requiring user communication:

1. Draft message with factual information only.
2. Do not speculate on cause or timeline.
3. Get L4 approval before publishing.
4. Publish simultaneously to all active community channels.
5. Update every 30 minutes until resolved.

**Template:**
```
[Axiom Protocol — Sui AMC Status Update]
Time: [ISO timestamp]
Issue: [1 sentence description]
Status: [Investigating / Mitigating / Resolved]
Impact: [Who is affected and how]
Next update: [time]
```

---

*Runbook version 1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
