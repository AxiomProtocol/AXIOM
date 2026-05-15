# AXIOM SUI — PHASE 7 INDEXER AND API DESIGN
# On-Chain Support Stack for Community Claim Campaigns

Document type:  Design Specification
Phase:          7 — Mainnet Design + Hardening + Authorization
Date:           2026-05-15
Classification: INTERNAL — engineering design
Status:         DESIGN COMPLETE — no implementation yet

---

## Purpose

This document specifies the design of the optional on-chain support
stack for Sui community claim campaigns. This stack indexes on-chain
campaign state and surfaces it via read-only API endpoints for use by:

- The claimant UI (claim page)
- The operator dashboard
- Off-chain monitoring and alerting

This is a design document. No backend code is deployed as part of Phase 7.
Implementation is deferred to Phase 8.

---

## Section 1 — Design Principles

1. Read-only: The indexer stack only reads from Sui — it never signs
   or submits transactions. All write actions remain in the operator toolchain.

2. Stateless where possible: Prefer polling Sui RPC at request time
   rather than maintaining a persistent indexed database. For Phase 8,
   the campaign count will be small (1–5 campaigns). A full indexer is
   not warranted.

3. Sui RPC-first: The Sui full node provides rich object query APIs.
   Campaign state (is_active, is_closed, pool balance, claimed count)
   can be read directly from the ClaimCampaign shared object without
   a custom indexer.

4. Proof data is off-chain: Proof arrays are served from the proof
   toolchain (IPFS or internal store), not from on-chain state.

5. Incrementally adoptable: Phase 8 can launch with polling-only
   (no indexer database). A proper indexed database is optional and
   can be added in Phase 9+ if claim volume warrants it.

---

## Section 2 — Campaign State Data Model

The following fields are readable directly from the ClaimCampaign shared
object via `sui_getObject`:

```typescript
interface CampaignState {
  // Object metadata
  campaign_id:      string;   // Sui object ID (0x...)
  package_id:       string;   // package that created the object
  
  // Campaign parameters (set at creation, immutable)
  label:            string;   // human-readable campaign name
  coin_type:        string;   // full coin type path
  amount_per_claim: bigint;   // base units per claim
  expires_at_epoch: bigint;   // 0 = no expiry
  merkle_root:      string;   // current root (hex)
  
  // Campaign lifecycle state (mutable)
  is_active:        boolean;  // can claimants submit?
  is_closed:        boolean;  // permanently closed? (hardened design A2)
  pool_balance:     bigint;   // remaining tokens in pool (base units)
  
  // Claim history (approximated)
  // claimed table size is not directly readable as u64 via RPC
  // Use event query as proxy for claim count
  claim_count_approx: number; // from Claimed event count
}
```

### Reading pool_balance

The `pool` field is a `Balance<T>` — a private field. In Sui, Balance
fields are not directly exposed via `sui_getObject`. Options:

Option A: Add a public test accessor `pool_value()` (already exists in
Sprint 2). In production, add a public (not test_only) view function:
```move
public fun pool_balance<T>(campaign: &ClaimCampaign<T>): u64 {
    balance::value(&campaign.pool)
}
```
This allows any caller to read pool balance without a transaction.

Option B: Track pool via events. CampaignFunded includes added_amount
and pool_total. Claimed includes amount. Track net via event stream.

Recommendation: Option A — add public view functions to the hardened contract.

---

## Section 3 — API Endpoint Design

All endpoints are Next.js API routes under `pages/api/sui/`:

---

### 3.1 GET /api/sui/campaigns

Returns metadata for all known campaigns.

**Implementation:**
Read from a static campaign registry file (`lib/sui/campaignRegistry.ts`)
that the operator updates when launching a new campaign. This avoids
needing to discover campaigns on-chain.

```typescript
// lib/sui/campaignRegistry.ts
export const CAMPAIGN_REGISTRY: CampaignRecord[] = [
  {
    campaign_id:      '0x113560d51eb885f71f5771be74cb0fa7c5215ecb92d88c081b92c9706da1e38d',
    package_id:       '0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602',
    label:            'axiom-sprint2-smoke',
    network:          'testnet',
    launched_at:      '2026-05-15',
    eligibility_url:  'ipfs://...',
  },
];
```

**Response:**
```json
{
  "campaigns": [
    {
      "campaign_id": "0x113560...",
      "label": "axiom-community-q1-2027",
      "network": "mainnet",
      "is_active": true,
      "is_closed": false,
      "amount_per_claim": "1000000",
      "expires_at_epoch": "500",
      "pool_balance": "499000000",
      "claim_count_approx": 1,
      "eligibility_url": "ipfs://..."
    }
  ]
}
```

**Error handling:**
- RPC timeout: return cached last-known state with `stale: true` flag
- Campaign not found: 404

---

### 3.2 GET /api/sui/campaigns/[id]

Returns full state for a single campaign.

**Implementation:**
Call `sui_getObject` for the campaign ID. Parse object fields.
Query Claimed events for claim count. Return combined state.

**Request:** campaign_id as path parameter

**Response:**
```json
{
  "campaign_id": "0x113560...",
  "label": "axiom-community-q1-2027",
  "coin_type": "0x4c3b15...::axiom_claim::AXIOM_CLAIM",
  "amount_per_claim": "1000000",
  "expires_at_epoch": "500",
  "merkle_root": "0x34629e...",
  "is_active": true,
  "is_closed": false,
  "pool_balance": "499000000",
  "claim_count_approx": 1,
  "eligibility_url": "ipfs://...",
  "explorer_url": "https://suiscan.xyz/mainnet/object/0x113560..."
}
```

---

### 3.3 GET /api/sui/eligibility

Returns eligibility status and proof for a given address and campaign.

**Implementation:**
1. Load proof artifact from IPFS or internal store
2. Look up address in the proofs object
3. Query `claimed` table state: `sui_getObject` on the campaign and check
   if address appears in the claimed table (via dynamic field query)

**Request parameters:** `address`, `campaign_id`

**Response (eligible, not yet claimed):**
```json
{
  "address": "0x4917...",
  "campaign_id": "0x113560...",
  "eligible": true,
  "already_claimed": false,
  "amount": "1000000",
  "proof": ["0xabc123...", "0xdef456..."],
  "merkle_root": "0x34629e..."
}
```

**Response (not eligible):**
```json
{
  "address": "0x9999...",
  "campaign_id": "0x113560...",
  "eligible": false,
  "already_claimed": false,
  "amount": "0",
  "proof": null
}
```

**Response (already claimed):**
```json
{
  "address": "0x4917...",
  "campaign_id": "0x113560...",
  "eligible": true,
  "already_claimed": true,
  "amount": "1000000",
  "proof": null,
  "claimed_tx": "BUA7aRwsddGQhVdtEDq4YhG7X32uFRj8ri3m19tzHAfc"
}
```

**Checking claimed status:**
The `claimed` table in ClaimCampaign is a child object. To check if an
address has claimed, query:
```
sui_getDynamicFieldObject(campaign_id, { type: "address", value: "0x..." })
```
If found, the address has claimed.

---

### 3.4 GET /api/sui/claim-status

Returns claim history for a given address across all campaigns.

**Implementation:**
Query `Claimed` events filtered by `claimer` address across all known campaigns.

**Request parameters:** `address`

**Response:**
```json
{
  "address": "0x4917...",
  "claims": [
    {
      "campaign_id": "0x113560...",
      "campaign_label": "axiom-community-q1-2027",
      "amount": "1000000",
      "tx_digest": "BUA7aRwsddGQhVdtEDq4YhG7X32uFRj8ri3m19tzHAfc",
      "claimed_at_epoch": 123,
      "explorer_url": "https://suiscan.xyz/mainnet/tx/BUA7..."
    }
  ]
}
```

**Implementation note:**
Event queries on Sui use `suix_queryEvents` with a `MoveEventModule` filter.
Results are paginated. For Phase 8 with small campaign counts, this is
sufficient without a persistent database.

---

## Section 4 — Claimed Status Lookup: Dynamic Field Pattern

The Sui SDK pattern for checking claimed status using the dynamic child
object model:

```typescript
import { SuiClient } from '@mysten/sui/client';

async function hasAddressClaimed(
  client: SuiClient,
  campaignId: string,
  address: string,
): Promise<boolean> {
  try {
    const result = await client.getDynamicFieldObject({
      parentId: campaignId,
      name: {
        type: 'address',
        value: address,
      },
    });
    return result.data !== null && result.data !== undefined;
  } catch {
    return false;
  }
}
```

Note: This works for Sui Table<address, bool> fields which store entries
as dynamic child objects. The parent is the ClaimCampaign object; the
child key is the claimant address.

---

## Section 5 — Operator Monitoring Design

### 5.1 Campaign health metrics

The following metrics must be monitored during an active campaign window:

| Metric | Source | Alert threshold |
|---|---|---|
| is_active | sui_getObject | Alert if false (unexpected pause) |
| pool_balance | view function / events | Alert if < 10% of initial pool |
| claim_count | Claimed event count | Log daily; alert on sudden spike |
| gas balance (AdminCap wallet) | sui_getBalance | Alert if < 0.5 SUI |
| CampaignPaused events | suix_queryEvents | Alert immediately |

### 5.2 Monitoring implementation

Monitoring can be implemented as a Next.js API route that is polled
by the operator dashboard:

```
GET /api/sui/monitor/campaigns
```

Returns health status for all active campaigns. The operator dashboard
(pages/operator/chains/sui-phase7.tsx) displays this data.

### 5.3 Alerting

Phase 8 should integrate campaign monitoring with the existing
capinfra notification system (`capNotifications` table) or a dedicated
Sui alert channel in the Axiom Discord bot.

---

## Section 6 — Caching Strategy

For Phase 8 launch (small scale):

| Endpoint | Caching | TTL |
|---|---|---|
| /api/sui/campaigns | In-memory | 30 seconds |
| /api/sui/campaigns/[id] | In-memory | 15 seconds |
| /api/sui/eligibility | Proof: long (static); claimed: 10s | Mixed |
| /api/sui/claim-status | 30 seconds | 30 seconds |

Cache keys include campaign_id to prevent cross-campaign collisions.

For Phase 9+ (higher scale), migrate to Redis or Upstash for shared
cache across Next.js instances.

---

## Section 7 — Implementation Checklist (Phase 8)

Before the first mainnet campaign launches, the following must be implemented:

```
Infrastructure
  [ ] lib/sui/campaignRegistry.ts — static campaign registry
  [ ] lib/sui/suiClient.ts — server-side SuiClient instance (import 'server-only')
  [ ] lib/sui/claimStatus.ts — hasAddressClaimed(), getClaimedEvents()
  [ ] lib/sui/campaignState.ts — getCampaignState(), getCampaignPool()

API routes
  [ ] pages/api/sui/campaigns/index.ts — list all campaigns
  [ ] pages/api/sui/campaigns/[id].ts — single campaign detail
  [ ] pages/api/sui/eligibility.ts — eligibility + proof lookup
  [ ] pages/api/sui/claim-status.ts — claim history by address

Proof data
  [ ] Proof artifact stored on IPFS via Pinata
  [ ] Proof fetch from IPFS CID (or internal URL as fallback)

Testing
  [ ] Unit tests for hasAddressClaimed()
  [ ] Unit tests for getCampaignState()
  [ ] Integration test against Sui testnet campaign
  [ ] End-to-end test: eligibility API returns valid proof for known address
```

---

## Section 8 — Technology Constraints

All server-side Sui code must follow the existing `lib/sui/` convention:
- Import `'server-only'` at the top of every module that touches Sui RPC
- Never expose SUI_DEPLOYER_KEY or AdminCap keys to client bundles
- No Sui wallet connection from server-side code
- All client-side wallet interaction via the Sui wallet adapter

Relevant env vars (to be added in Phase 8, not Phase 7):
```
SUI_MAINNET_RPC_URL=https://fullnode.mainnet.sui.io
SUI_TESTNET_RPC_URL=https://fullnode.testnet.sui.io
CHAIN_SUI_ENABLED=false  # keep false until Phase 8 activation gate
```

---

*End of Phase 7 Indexer and API Design*
