# Alchemy API Integration Plan — Axiom Protocol
**Version:** 2.0 — April 26, 2026  
**Status:** Active Planning  
**Scope:** All 5 Alchemy product families mapped to Axiom feature surface

---

## Already Live (Do Not Rebuild)

| Endpoint | File | Purpose |
|---|---|---|
| `alchemy_getTokenBalances` | `pages/api/alchemy/wallet-portfolio.ts` | Wallet holdings: AXAU, AXUSD, AXM, PAXG, USDC, WETH |
| `alchemy_getAssetTransfers` | `pages/api/axau/holders.ts` | AXAU holder list via transfer history |
| Alchemy RPC as provider | `pages/api/axau/paxg-quote.ts`, `lib/services/*` | Ethers.js JsonRpcProvider for all contract calls |

---

## PRODUCT FAMILY 1 — Node API (JSON-RPC)

### WS-01 · Event Log Streaming (`eth_getLogs`)
**Priority: Tier 1**

**Problem:** AXUSD mint/redeem events, AXAU Transfer events, and PSM swap events are never captured off-chain for the solvency dashboard or treasury audit. Every report re-derives state from current balances rather than event history.

**Endpoints:**
- `eth_getLogs` — filter by contract address + topic (Transfer, Mint, Swap)

**Axiom Use:**
1. `pages/api/alchemy/events.ts` — accepts `{ contract, topic, fromBlock, toBlock }`, returns decoded logs with timestamps
2. Solvency page gains "Event History" section: every AXUSD mint, redeem, and PSM swap since contract deployment
3. AXAU buy page shows the last 10 mints from the AXAU contract as social proof ("Recently minted")
4. Founder Ops dashboard populates "Proof of Execution" from real on-chain events, not hardcoded entries

**Files:** `pages/api/alchemy/events.ts` (new), `pages/solvency.tsx`, `pages/axau-buy.tsx`, `pages/founder-ops/index.tsx`

---

### WS-02 · Debug & Trace API (Sentinel Transaction Forensics)
**Priority: Tier 2**

**Problem:** When the Axiom Sentinel or integrity console flags an anomalous transaction, operators have no way to drill into what actually happened inside the EVM — which contract was called, which subcalls were made, where funds moved. Currently they see the transaction hash and surface-level data only.

**Endpoints:**
| Method | Use |
|---|---|
| `debug_traceTransaction` | Full opcode/call trace of any mined tx |
| `debug_traceCall` | Simulate a call with full EVM trace (without submitting) |
| `trace_transaction` | Parity-style human-readable call tree |
| `trace_filter` | Filter traces across a block range by from/to address |
| `trace_call` | Simulate a call in Parity format |
| `trace_callMany` | Simulate a sequence of calls (e.g. approve → mint) |
| `trace_replayTransaction` | Replay a tx with stateDiff + vmTrace |

**Axiom Use:**
1. `pages/api/alchemy/trace.ts` — accepts `{ txHash, traceType: 'call'|'state'|'vm' }`, returns formatted call tree
2. Operator Integrity Console (`/operator/integrity`) gains "Trace" button on each alert row → opens a modal with the full call tree for that transaction
3. Sentinel's `alchemy_simulateExecution` + `debug_traceCall` pair: before flagging a rule violation, Sentinel simulates the triggering transaction to get full context
4. `trace_filter` powers a new "Treasury Trace" view: all calls to/from the treasury wallet in a time range, with value flows

**Files:** `pages/api/alchemy/trace.ts` (new), `pages/operator/integrity.tsx`, `server/services/observer/ObserverService.ts`

---

## PRODUCT FAMILY 2 — Data API

### WS-03 · Prices API (Portfolio USD Values + Peg Monitor)
**Priority: Tier 1**

**Problem:** The portfolio section shows token quantities but zero USD values. There is no AXM market price displayed anywhere. The solvency console has no aggregate treasury USD figure. The AXUSD peg stability page has no price chart. CoinGecko is rate-limited and unreliable on free tiers; Chainlink covers gold/ETH but has no feed for AXM.

**Endpoints:**
| Endpoint | Base URL |
|---|---|
| `GET /tokens/by-address` | `https://api.g.alchemy.com/prices/v1/{key}/tokens/by-address` |
| `GET /tokens/by-symbol` | `https://api.g.alchemy.com/prices/v1/{key}/tokens/by-symbol` |
| `GET /tokens/historical` | `https://api.g.alchemy.com/prices/v1/{key}/tokens/historical` |

**Axiom Use:**
1. `pages/api/alchemy/prices.ts` — batch price lookup; accepts contract addresses or symbols; returns USD prices with timestamp, source label, and 24h change %. Falls back to Chainlink for PAXG.
2. Wallet portfolio widget on `/axau` gains USD value per token and total portfolio USD value
3. AXM governance page gains a live market price chip (price, 24h %, market cap estimate)
4. Solvency console gains a total treasury USD aggregate: sum of USDC + PAXG + AXUSD holdings × live prices
5. `/axusd-3643` peg stability section gains a 7-day AXUSD price chart using the historical endpoint — shows peg maintenance record
6. AXAU NAV display uses Alchemy price as a secondary sanity check vs. the on-chain Chainlink oracle

**Files:** `pages/api/alchemy/prices.ts` (new), `pages/axau.tsx`, `pages/governance.tsx`, `pages/solvency.tsx`, `pages/axusd-3643.tsx`

---

### WS-04 · Token Metadata Registry (`alchemy_getTokenMetadata`)
**Priority: Tier 2**

**Problem:** The DEX and Exchange pages hardcode token names, symbols, and decimals. Pasting an arbitrary ERC-20 address into the swap interface shows a blank slot. MIRDT's monitored asset list uses hardcoded names. There is no logo resolution for non-Axiom tokens.

**Endpoints:**
- `alchemy_getTokenMetadata` — returns name, symbol, decimals, logo URL for any ERC-20

**Axiom Use:**
1. `pages/api/alchemy/token-metadata.ts` — accepts a contract address or list; calls `alchemy_getTokenMetadata`; caches results for 1 hour server-side
2. DEX swap interface resolves token info dynamically from a pasted address — no hardcoded token list required
3. Exchange page token selector seeded from this endpoint with logo display
4. MIRDT terminal shows token logo + full name for every monitored asset
5. Disclosure page token registry section uses live metadata instead of a hardcoded table

**Files:** `pages/api/alchemy/token-metadata.ts` (new), `pages/dex.tsx`, `pages/exchange.tsx`, `pages/mirdt.tsx`

---

### WS-05 · Token Allowance Intelligence (`alchemy_getTokenAllowance`)
**Priority: Tier 2**

**Problem:** The AXAU mint flow requires a PAXG approval before minting. The UI asks for approval with no information about whether an approval already exists. Users with existing sufficient allowances still see the "Approve PAXG" step and sometimes re-approve unnecessarily, paying gas twice.

**Endpoints:**
- `alchemy_getTokenAllowance` — returns current allowance between an owner and spender for a specific ERC-20

**Axiom Use:**
1. `pages/api/alchemy/allowances.ts` — accepts `{ owner, spender, contractAddress }`; returns formatted allowance and whether it covers a given amount
2. DirectMintTab on `/axau-buy`: on wallet connect, instantly checks PAXG allowance for the mint contract. If sufficient → green checkmark "PAXG approved ✓" and skip the approval step. If insufficient → show the exact shortfall and an "Approve [X] PAXG" button.
3. AssistedMintTab: same for AXUSD allowance
4. PSM page: shows current USDC/AXUSD allowances before swap confirmation

**Files:** `pages/api/alchemy/allowances.ts` (new), `pages/axau-buy.tsx`

---

### WS-06 · Extended Transfer History (`alchemy_getAssetTransfers`)
**Priority: Tier 2**

**Problem:** The Investor Portal has no on-chain LP transaction history. The Treasury audit shows current balances but no inflow/outflow history. The Founder Ops dashboard lists actions manually. The AXUSD peg page shows current supply but no mint/redeem flow over time.

**Endpoints:**
- `alchemy_getAssetTransfers` — already used for AXAU holders; extend to all tokens and directional queries

**Axiom Use:**
1. `pages/api/alchemy/transfers.ts` — generic paginated endpoint; `{ wallet, contractAddresses, direction, fromBlock, pageKey }`. Returns transfers enriched with USD values from WS-03.
2. Investor Portal (`/syndication/portal`) → LP transaction history panel: all deposits, withdrawals, and distributions
3. Solvency page → "Recent Treasury Movements" table: last 20 PAXG/USDC/AXUSD inflows and outflows to/from the treasury wallet
4. Founder Ops → "On-Chain Proof of Capital": recent AXAU mints, PAXG deposits, AXUSD settlements
5. AXUSD page → mint/redeem flow chart: sum of AXUSD Transfer events from zero address (mints) and to zero address (redeems) over time
6. Banking page → Increase/on-chain reconciliation: compare Increase ACH inflows vs. on-chain USDC arrivals

**Files:** `pages/api/alchemy/transfers.ts` (new), `pages/syndication/portal.tsx`, `pages/solvency.tsx`, `pages/founder-ops/index.tsx`, `pages/axusd-3643.tsx`

---

### WS-07 · Transaction Receipts Batch (`alchemy_getTransactionReceipts`)
**Priority: Tier 3**

**Problem:** The capital accounting dashboard needs to audit every transaction in a block for treasury-relevant events. Currently it fetches receipts one by one — extremely slow for blocks with many transactions.

**Endpoints:**
- `alchemy_getTransactionReceipts` — returns all receipts for an entire block in one call

**Axiom Use:**
1. `pages/api/alchemy/block-receipts.ts` — accepts `{ blockNumber }`; returns all receipts for the block, filtered to those involving Axiom contract addresses
2. Capital Accounting dashboard: "Block Audit" view that fetches all Axiom-related events in a given block — useful for post-settlement reconciliation
3. Solvency auto-ingest: when a new block is mined, use this to check if any treasury-relevant transaction occurred (replaces the current approach of checking individual tx hashes)

**Files:** `pages/api/alchemy/block-receipts.ts` (new), `pages/capital-accounting.tsx`, `pages/api/solvency/auto-ingest.ts`

---

### WS-08 · NFT API (Governance Badges + Access Pass Gating)
**Priority: Tier 2**

**Problem:** The GEF tier system stores tier levels in the database — but there is no on-chain credential or badge that an external party can verify. If Axiom issues governance NFTs (for Operator-tier and above), the platform has no mechanism to verify or display them. The Wealth Practice graduation could issue a commemorative NFT; currently there is no display surface.

**Endpoints:**
| Endpoint | Use |
|---|---|
| `getNFTsForOwner` | Get all NFTs held by a wallet |
| `isHolderOfCollection` | Gate-check: does wallet hold an NFT from a specific collection? |
| `verifyNFTOwnership` | Confirm ownership of a specific token ID |
| `getContractMetadata` | Collection name, symbol, total supply |
| `getOwnersForContract` | Count all holders of an NFT collection |
| `getNFTMetadata` | Individual NFT metadata + image |
| `getFloorPrice` | Collection floor price (OpenSea, LooksRare) |
| `getNFTSales` | Historical sales for a token |
| `computeRarity` | Rarity score for NFT traits |
| `refreshNFTMetadata` | Force-refresh NFT metadata |
| `isSpamContract` | Verify a contract is not spam before displaying |

**Axiom Use:**
1. `pages/api/alchemy/nfts.ts` — holder check, collection metadata, and single-NFT metadata endpoints
2. Governance portal: if Axiom issues AXM governance NFTs, the portal shows which NFT IDs a connected wallet holds and the collection floor price
3. GEF tier display: if Operator+ tiers get an on-chain badge NFT, `isHolderOfCollection` gates the Operator Console access with chain-verified proof
4. Wealth Practice graduation: when a member completes their circle, the platform checks (and displays) their graduation NFT
5. Investor Portal: show LP badge NFTs earned for milestones (first $1k deployed, first deal closed, etc.)

**Files:** `pages/api/alchemy/nfts.ts` (new), `pages/governance.tsx`, `pages/wealth-practice.tsx`, `pages/syndication/portal.tsx`

---

### WS-09 · Simulation API (AXAU Mint Pre-Flight)
**Priority: Tier 1**

**Problem:** Users sign AXAU mints without seeing the exact output first. Some revert because the oracle moved, coverage ratio dropped, or allowance is insufficient — all costing gas with zero user feedback before signing.

**Endpoints:**
| Method | Use |
|---|---|
| `alchemy_simulateAssetChanges` | Preview exact PAXG in / AXAU out for a transaction |
| `alchemy_simulateExecution` | Full EVM simulation including events and return data |
| `alchemy_simulateAssetChangesBundle` | Simulate approve → mint as a sequential bundle |

**Axiom Use:**
1. `pages/api/alchemy/simulate-mint.ts` — accepts `{ from, paxgAmount }`, encodes mint calldata, runs `alchemy_simulateAssetChanges`, returns: PAXG deducted, AXAU received, gas estimate in ETH + USD
2. `pages/api/alchemy/simulate-bundle.ts` — accepts `{ from, paxgAmount, needsApproval }`, simulates approve → mint as a bundle using `alchemy_simulateAssetChangesBundle`
3. `/axau-buy` DirectMintTab: "Preview" button after amount entry → shows a confirmation panel with exact output before any signing. Only enables Confirm after simulation success.
4. If simulation returns an error (coverage ratio too low, mint paused, zero allowance), the exact revert reason is shown inline — no gas wasted.
5. Sentinel/Operator Integrity Console: use `alchemy_simulateExecution` to pre-flight suspicious transactions flagged by integrity alerts before an operator takes action

**Files:** `pages/api/alchemy/simulate-mint.ts` (new), `pages/api/alchemy/simulate-bundle.ts` (new), `pages/axau-buy.tsx`, `pages/operator/integrity.tsx`

---

## PRODUCT FAMILY 3 — Smart Wallets (ERC-4337 Account Abstraction)

### WS-10 · Gas Manager — Gasless Identity Registration
**Priority: Tier 3 — Strategic**

**Problem:** The biggest drop-off in the AXAU founding cohort funnel is ERC-3643 on-chain identity registration. Approved applicants must pay ETH gas to register their credential. Many participants have AXUSD from the card onramp but zero ETH. The gas requirement eliminates them.

**Endpoints:**
| Endpoint | Use |
|---|---|
| Gas Manager policy REST API | Create a policy: sponsor gas for approved founding cohort wallets |
| `alchemy_requestGasAndPaymasterAndData` | Get gas + paymaster data to sponsor the identity tx |
| `alchemy_requestPaymasterAndData` | Get paymaster signature for the UserOperation |
| `eth_sendUserOperation` | Submit the sponsored UserOperation to the Bundler |
| `eth_estimateUserOperationGas` | Show gas cost estimate before sponsorship |
| `eth_getUserOperationByHash` | Track UserOp status after submission |
| `eth_getUserOperationReceipt` | Confirm UserOp success + get tx hash |
| `eth_supportedEntryPoints` | Verify EntryPoint address compatibility |

**Axiom Use:**
1. `pages/api/alchemy/gas-policy.ts` — admin endpoint to create/update the Gas Manager policy: sponsor `registerIdentity` calls to the ERC-3643 IdentityRegistry, from wallets with `status = 'approved'` in `t3KycSubmissions`, up to $2 ETH per wallet per day
2. `pages/api/alchemy/sponsor-identity-tx.ts` — takes `{ wallet, encodedCalldata }`, wraps in a UserOperation, gets paymaster data, submits via Bundler, returns UserOp hash
3. `/axau-early-access` — approved wallet state shows: "Your application is approved. Your identity credential is being registered on-chain — gas is covered by Axiom." One click. No ETH required.
4. `gasSponsored: boolean` + `gasCostUsd: number` logged to `t3KycSubmissions` for treasury cost tracking

**Files:** `pages/api/alchemy/gas-policy.ts` (new), `pages/api/alchemy/sponsor-identity-tx.ts` (new), `pages/axau-early-access.tsx`, `shared/erc3643Schema.ts`

---

## PRODUCT FAMILY 4 — Webhooks / Notify

### WS-11 · Address Activity + Token Activity Webhooks
**Priority: Tier 1**

**Problem:** Treasury monitoring is entirely polling-based. There is no real-time notification when PAXG arrives, when AXUSD is minted, or when the treasury wallet moves funds. Founding cohort activation is manual — operators check the DB and flip status by hand.

**Webhook Types:**
| Type | What it fires on |
|---|---|
| `ADDRESS_ACTIVITY` | Any ETH/ERC-20/NFT send or receive on up to 100k watched addresses |
| `MINED_TRANSACTION` | A specific tx hash is confirmed on-chain |
| `DROPPED_TRANSACTION` | A pending tx is ejected from the mempool |

**Axiom Use:**
1. `pages/api/webhooks/alchemy.ts` — inbound webhook handler: validates Alchemy HMAC signature; routes payload to processors based on `type`
2. `scripts/alchemy-webhook-setup.ts` — one-time setup: registers `ADDRESS_ACTIVITY` webhook watching treasury wallet + AXUSD contract + AXAU contract; registers `DROPPED_TRANSACTION` webhook for any pending mint tx hashes
3. **Founding cohort auto-activation**: when `ADDRESS_ACTIVITY` fires an AXAU Transfer event *to* an `approved` wallet in `t3KycSubmissions`, the handler sets `status = 'activated'` and `activatedAt = now()` automatically
4. **Treasury alerting**: PAXG inflow to treasury wallet > 0.05 PAXG → Discord operator alert via `DISCORD_BOT_TOKEN`
5. **Dropped-tx recovery**: when `DROPPED_TRANSACTION` fires for a user's pending mint tx, Resend sends a recovery email with a link back to `/axau-buy`
6. **Mint confirmation**: `MINED_TRANSACTION` for a submitted mint → updates `t3KycSubmissions.status` if this was the activation tx; can also trigger a Resend "Your AXAU has arrived" email

**Files:** `pages/api/webhooks/alchemy.ts` (new), `scripts/alchemy-webhook-setup.ts` (new)

---

### WS-12 · NFT Activity Webhook
**Priority: Tier 3**

**Problem:** If Axiom issues governance or graduation NFTs, there is no real-time detection when those NFTs change hands — which would affect tier gating, governance weight, and LP access.

**Webhook Types:**
- `NFT_ACTIVITY` — fires on any ERC-721/ERC-1155 transfer for watched contract addresses + optional specific token IDs

**Axiom Use:**
1. Extend `pages/api/webhooks/alchemy.ts` to handle `NFT_ACTIVITY`
2. When a GEF governance NFT is transferred out of a wallet: pause that wallet's Operator Console access pending re-verification
3. When a Wealth Practice graduation NFT is minted: trigger congratulations email + unlock the Lending Fund LP onboarding flow for that wallet

**Files:** `pages/api/webhooks/alchemy.ts` (extended), `scripts/alchemy-webhook-setup.ts` (extended)

---

### WS-13 · GraphQL Custom Webhook (Large Treasury Movement Alerts)
**Priority: Tier 2**

**Problem:** `ADDRESS_ACTIVITY` fires on every transfer — too noisy for operator alert channels. What's needed is a webhook that only fires when a transfer above a specific USD threshold hits the treasury, or when a specific event topic is emitted from an Axiom contract.

**Webhook Types:**
- `GRAPHQL` — custom GraphQL filter that can match on any EVM log field, value threshold, or address combination

**Axiom Use:**
1. Register a GraphQL webhook: fires only on AXUSD Transfer events where `value > 10,000 AXUSD` — large mint or redemption events
2. Register a GraphQL webhook: fires when any address sends > 0.5 PAXG to the treasury — significant reserve deposit
3. Register a GraphQL webhook: fires on any PSM swap event from the AXUSD PSM contract — tracks every USDC↔AXUSD conversion
4. Each webhook routes to `pages/api/webhooks/alchemy.ts` → Discord alert + DB log entry in the capital accounting audit table

**Files:** `pages/api/webhooks/alchemy.ts` (extended), `scripts/alchemy-webhook-setup.ts` (extended), `shared/capInfraSchema.ts` (audit event table)

---

## PRODUCT FAMILY 5 — WebSocket Subscriptions

### WS-14 · Live Mint Status Feed (SSE on `/axau-buy`)
**Priority: Tier 2**

**Problem:** After a user submits a mint transaction, the `/axau-buy` page has no live status. Users refresh manually or watch their wallet. There is no "Submitted → Pending → Confirmed" progress indicator on-screen.

**Endpoints (WebSocket):**
| Subscription | Use |
|---|---|
| `alchemy_pendingTransactions` | Detect specific tx hash entering mempool |
| `alchemy_minedTransactions` | Detect confirmation + block number |
| `newHeads` | Track block progression for confirmation count |

**Axiom Use:**
1. `lib/alchemy/ws-client.ts` — lightweight WebSocket manager for the Alchemy Arbitrum endpoint; handles reconnect and message routing
2. `pages/api/alchemy/tx-status.ts` — Server-Sent Events (SSE) endpoint; client connects with a tx hash; server opens Alchemy WS subscription and streams status events: `pending → mined → confirmed`
3. `/axau-buy`: after submitting, a status bar appears: "Transaction submitted → Waiting for confirmation → Confirmed in block 12345678 (2 confirmations)" with a live block counter. Once confirmed, portfolio balances re-fetch automatically.
4. Operator Integrity Console: live block feed via `newHeads` — shows current block number + time since last block for chain health display

**Files:** `lib/alchemy/ws-client.ts` (new), `pages/api/alchemy/tx-status.ts` (new), `pages/axau-buy.tsx`, `pages/operator/integrity.tsx`

---

## Complete Endpoint Inventory (All Workstreams)

### Node API
| # | Endpoint | WS | Priority |
|---|---|---|---|
| 1 | `eth_getLogs` (event filtering) | WS-01 | Tier 1 |
| 2 | `debug_traceTransaction` | WS-02 | Tier 2 |
| 3 | `debug_traceCall` | WS-02 | Tier 2 |
| 4 | `trace_transaction` | WS-02 | Tier 2 |
| 5 | `trace_filter` | WS-02 | Tier 2 |
| 6 | `trace_call` | WS-02 | Tier 2 |
| 7 | `trace_callMany` | WS-02 | Tier 2 |
| 8 | `trace_replayTransaction` | WS-02 | Tier 2 |

### Data API — Token & Transfers
| # | Endpoint | WS | Priority |
|---|---|---|---|
| 9 | `GET /prices/v1/.../tokens/by-address` | WS-03 | Tier 1 |
| 10 | `GET /prices/v1/.../tokens/by-symbol` | WS-03 | Tier 1 |
| 11 | `GET /prices/v1/.../tokens/historical` | WS-03 | Tier 1 |
| 12 | `alchemy_getTokenMetadata` | WS-04 | Tier 2 |
| 13 | `alchemy_getTokenAllowance` | WS-05 | Tier 2 |
| 14 | `alchemy_getAssetTransfers` (extended) | WS-06 | Tier 2 |
| 15 | `alchemy_getTransactionReceipts` | WS-07 | Tier 3 |

### Data API — NFT
| # | Endpoint | WS | Priority |
|---|---|---|---|
| 16 | `getNFTsForOwner` | WS-08 | Tier 2 |
| 17 | `isHolderOfCollection` | WS-08 | Tier 2 |
| 18 | `verifyNFTOwnership` | WS-08 | Tier 2 |
| 19 | `getContractMetadata` | WS-08 | Tier 2 |
| 20 | `getOwnersForContract` | WS-08 | Tier 2 |
| 21 | `getNFTMetadata` | WS-08 | Tier 2 |
| 22 | `getFloorPrice` | WS-08 | Tier 3 |
| 23 | `getNFTSales` | WS-08 | Tier 3 |
| 24 | `computeRarity` | WS-08 | Tier 3 |
| 25 | `refreshNFTMetadata` | WS-08 | Tier 3 |
| 26 | `isSpamContract` | WS-08 | Tier 2 |

### Data API — Simulation
| # | Endpoint | WS | Priority |
|---|---|---|---|
| 27 | `alchemy_simulateAssetChanges` | WS-09 | Tier 1 |
| 28 | `alchemy_simulateExecution` | WS-09 | Tier 1 |
| 29 | `alchemy_simulateAssetChangesBundle` | WS-09 | Tier 1 |

### Smart Wallets (ERC-4337)
| # | Endpoint | WS | Priority |
|---|---|---|---|
| 30 | Gas Manager policy REST API | WS-10 | Tier 3 |
| 31 | `alchemy_requestGasAndPaymasterAndData` | WS-10 | Tier 3 |
| 32 | `alchemy_requestPaymasterAndData` | WS-10 | Tier 3 |
| 33 | `eth_sendUserOperation` | WS-10 | Tier 3 |
| 34 | `eth_estimateUserOperationGas` | WS-10 | Tier 3 |
| 35 | `eth_getUserOperationByHash` | WS-10 | Tier 3 |
| 36 | `eth_getUserOperationReceipt` | WS-10 | Tier 3 |
| 37 | `eth_supportedEntryPoints` | WS-10 | Tier 3 |

### Webhooks / Notify
| # | Webhook Type | WS | Priority |
|---|---|---|---|
| 38 | `ADDRESS_ACTIVITY` | WS-11 | Tier 1 |
| 39 | `MINED_TRANSACTION` | WS-11 | Tier 1 |
| 40 | `DROPPED_TRANSACTION` | WS-11 | Tier 1 |
| 41 | `NFT_ACTIVITY` | WS-12 | Tier 3 |
| 42 | `GRAPHQL` (large treasury movements) | WS-13 | Tier 2 |
| 43 | `GRAPHQL` (AXUSD large mint/redeem) | WS-13 | Tier 2 |
| 44 | `GRAPHQL` (PSM swap events) | WS-13 | Tier 2 |

### WebSocket Subscriptions
| # | Subscription | WS | Priority |
|---|---|---|---|
| 45 | `alchemy_pendingTransactions` | WS-14 | Tier 2 |
| 46 | `alchemy_minedTransactions` | WS-14 | Tier 2 |
| 47 | `newHeads` | WS-14 | Tier 2 |

**Total: 47 distinct Alchemy API capabilities** across 14 workstreams  
**Already live: 3** (token balances, asset transfers for holders, RPC provider)  
**Net new: 44**

---

## New API Routes to Build (`pages/api/alchemy/`)

| File | WS | What it does |
|---|---|---|
| `prices.ts` | WS-03 | USD prices for any token by address or symbol + historical |
| `token-metadata.ts` | WS-04 | Name, symbol, decimals, logo for any ERC-20 |
| `allowances.ts` | WS-05 | Current ERC-20 allowance between owner and spender |
| `transfers.ts` | WS-06 | Paginated transfer history by wallet + token + direction |
| `block-receipts.ts` | WS-07 | All tx receipts for a block filtered to Axiom contracts |
| `nfts.ts` | WS-08 | NFT holder check, collection metadata, individual NFT data |
| `simulate-mint.ts` | WS-09 | Single-tx AXAU mint simulation (asset changes) |
| `simulate-bundle.ts` | WS-09 | Approve → mint bundle simulation |
| `gas-policy.ts` | WS-10 | Gas Manager policy CRUD (admin only) |
| `sponsor-identity-tx.ts` | WS-10 | Gasless ERC-3643 identity registration |
| `events.ts` | WS-01 | eth_getLogs wrapper: Axiom contract events |
| `trace.ts` | WS-02 | Transaction trace (call tree, state diff, VM trace) |
| `tx-status.ts` | WS-14 | SSE endpoint: live tx status via WebSocket relay |

**New webhook handler:** `pages/api/webhooks/alchemy.ts`  
**New setup script:** `scripts/alchemy-webhook-setup.ts`  
**New WS client:** `lib/alchemy/ws-client.ts`

---

## Implementation Phases

| Phase | Workstreams | Core deliverable |
|---|---|---|
| **3A — Mint Funnel Polish** | WS-03, WS-05, WS-09 | Live USD prices; allowance check skips approve step; simulation pre-flight on AXAU mint |
| **3B — Real-Time Ops** | WS-01, WS-11, WS-13 | Event log history; founding cohort auto-activation webhook; treasury GraphQL alerts |
| **3C — Institutional Dashboards** | WS-04, WS-06, WS-08 | Token metadata registry; transfer history on investor portal + treasury; NFT badge display |
| **3D — Live Status + Tracing** | WS-02, WS-14 | Trace drill-down on Sentinel alerts; live mint tx status bar on /axau-buy |
| **3E — Gasless Onboarding** | WS-07, WS-10, WS-12 | ERC-4337 gas sponsorship for identity registration; block receipts audit; NFT activity webhook |
