# Alchemy API Integration Plan — Axiom Protocol
**Version:** 1.0 — April 26, 2026
**Status:** Planning

---

## Current Footprint (Already Live)

| Endpoint | File | What it does |
|---|---|---|
| `alchemy_getTokenBalances` | `pages/api/alchemy/wallet-portfolio.ts` | Token balances for connected wallet (AXAU, AXUSD, AXM, PAXG, USDC, WETH) |
| `alchemy_getAssetTransfers` | `pages/api/axau/holders.ts` | AXAU transfer history → founding cohort holder list |

Everything below is **not yet implemented**.

---

## Workstream 1 — Prices API (Portfolio USD Values + AXM Market Cap)
**Priority: Tier 1 — Immediate**

### Problem
The portfolio page shows token counts but no USD values. AXM has no on-screen market price. The solvency console shows treasury token balances but no aggregate USD figure. Chainlink covers PAXG/XAU and ETH/USD perfectly, but has no feed for AXM or AXUSD. CoinGecko is rate-limited and unreliable on free tiers.

### Alchemy Endpoints
| Endpoint | Base URL |
|---|---|
| `GET /tokens/by-address` | `https://api.g.alchemy.com/prices/v1/{apiKey}/tokens/by-address` |
| `GET /tokens/by-symbol` | `https://api.g.alchemy.com/prices/v1/{apiKey}/tokens/by-symbol` |
| `GET /tokens/historical` | `https://api.g.alchemy.com/prices/v1/{apiKey}/tokens/historical` |

### What Gets Built
1. `pages/api/alchemy/prices.ts` — unified price endpoint wrapping the Alchemy Prices API; accepts a list of contract addresses or symbols, returns USD prices with timestamp and source label. Falls back to Chainlink for PAXG.
2. Portfolio page (`/portfolio` or connected wallet view on `/axau`) shows USD value per token and total portfolio USD value.
3. AXM governance page gains a live market price chip.
4. Solvency console gains total treasury USD figure derived from live prices.
5. AXAU NAV display compares Alchemy's PAXG/USD price against the Chainlink oracle price as a secondary validation signal.

### Files Affected
- `pages/api/alchemy/prices.ts` (new)
- `pages/axau.tsx` (portfolio section)
- `pages/solvency.tsx`
- `pages/governance.tsx` (AXM price chip)

---

## Workstream 2 — Transaction Pre-Flight Simulation (AXAU Mint)
**Priority: Tier 1 — Immediate**

### Problem
Before a user confirms an AXAU mint, they have no certainty about exactly what they will send (PAXG amount) and exactly what they will receive (AXAU amount). The current quote is on-chain but the simulation of the actual transaction output — including fee, slippage, and revert risk — is not shown. Users sometimes sign transactions that revert, wasting gas.

### Alchemy Endpoints
| Endpoint | Method |
|---|---|
| `alchemy_simulateAssetChanges` | POST to `https://arb-mainnet.g.alchemy.com/v2/{apiKey}` |
| `alchemy_simulateExecution` | POST to `https://arb-mainnet.g.alchemy.com/v2/{apiKey}` |

### What Gets Built
1. `pages/api/alchemy/simulate-mint.ts` — accepts `{ from, paxgAmount }`, encodes the mint calldata, calls `alchemy_simulateAssetChanges`, returns the predicted asset delta (PAXG out, AXAU in, gas estimate).
2. `/axau-buy` — "Preview Transaction" button appears after the user enters a PAXG amount. Clicking it calls `/api/alchemy/simulate-mint`, shows a confirmation panel: "You will send X PAXG, receive Y AXAU — estimated gas $Z." The existing Confirm button is only enabled after simulation succeeds.
3. If simulation returns an error (e.g. coverage ratio too low, mint paused), the error is surfaced immediately without the user needing to submit to chain.

### Files Affected
- `pages/api/alchemy/simulate-mint.ts` (new)
- `pages/axau-buy.tsx` (DirectMintTab — preview step)

---

## Workstream 3 — Webhook Real-Time Alerts (Treasury + Founding Cohort)
**Priority: Tier 1 — Immediate**

### Problem
Treasury monitoring is entirely polling-based. There is no real-time notification when PAXG arrives at the treasury wallet, when a new AXAU mint is confirmed on-chain, or when a user's mint transaction is dropped from the mempool. Founding cohort auto-activation (marking a wallet as `activated` in the DB) is currently manual.

### Alchemy Endpoints (Notify REST API)
| Webhook Type | Use |
|---|---|
| `ADDRESS_ACTIVITY` | Watch treasury wallet + AXAU contract for any incoming PAXG or AXAU transfers |
| `MINED_TRANSACTION` | Confirm when a specific user mint transaction hits the chain |
| `DROPPED_TRANSACTION` | Alert when a pending mint transaction is dropped |
| `CUSTOM_WEBHOOK` | Filter only `Transfer` events from the AXAU contract (ERC-20 Transfer topic) |

### What Gets Built
1. `pages/api/webhooks/alchemy.ts` — inbound webhook handler. Validates Alchemy HMAC signature, routes to appropriate processor: treasury inflow processor, founding cohort activator, dropped-tx notifier.
2. `scripts/alchemy-webhook-setup.ts` — one-time setup script to register Alchemy webhooks via REST (`POST https://dashboard.alchemy.com/api/create-webhook`) for: (a) treasury wallet address activity, (b) AXAU contract Transfer events.
3. **Founding cohort auto-activation**: when Alchemy fires an AXAU Transfer event to a wallet that is `approved` in `t3KycSubmissions`, the webhook handler sets `status = 'activated'` and `activatedAt = now()` automatically. No manual step required.
4. **Dropped-tx recovery**: when a user's pending mint tx is dropped, the webhook handler sends a Resend email with "Your transaction was dropped — you can resubmit" and a link back to `/axau-buy`.
5. **Treasury alerting**: large PAXG inflows (> 0.1 PAXG) trigger a Discord webhook message to the operator channel.

### Files Affected
- `pages/api/webhooks/alchemy.ts` (new)
- `scripts/alchemy-webhook-setup.ts` (new)
- `shared/erc3643Schema.ts` (activatedAt column if not present)

---

## Workstream 4 — Token Allowance Intelligence (Pre-Mint UX)
**Priority: Tier 2**

### Problem
Before minting AXAU with PAXG, the user must first `approve` the AXAU minting contract to spend their PAXG. The current UI has no visibility into whether an approval already exists or what the current allowance is. Users are asked to approve blindly, sometimes re-approving an already-sufficient allowance, paying gas unnecessarily.

### Alchemy Endpoints
| Endpoint | Method |
|---|---|
| `alchemy_getTokenAllowances` | POST (Enhanced API) |

### What Gets Built
1. `pages/api/alchemy/allowances.ts` — accepts `{ owner, spender, contractAddresses }`, calls `alchemy_getTokenAllowances`, returns formatted allowance amounts.
2. DirectMintTab on `/axau-buy` queries allowances on wallet connect. If PAXG allowance ≥ the entered mint amount, the "Approve PAXG" step is skipped entirely with a green checkmark. If allowance is insufficient, the exact shortfall is shown with an "Increase Allowance" button.
3. AssistMintTab queries AXUSD allowance for the AXAU assisted-mint contract.

### Files Affected
- `pages/api/alchemy/allowances.ts` (new)
- `pages/axau-buy.tsx` (DirectMintTab, AssistedMintTab)

---

## Workstream 5 — Transfer History (Investor Portal + Treasury Audit)
**Priority: Tier 2**

### Problem
The Investor Portal LP dashboard has no on-chain transaction history — investors cannot see their historical deposits, redemptions, or interest receipts. The Treasury audit on the Solvency page shows current balances but no inflow/outflow history. The Founder Ops playbook has no on-chain proof of capital movement.

### Alchemy Endpoints
| Endpoint | What it fetches |
|---|---|
| `alchemy_getAssetTransfers` | Full transfer history with filtering by address, token, block range |

### What Gets Built
1. `pages/api/alchemy/transfers.ts` — generic paginated transfer history endpoint. Accepts `{ wallet, contractAddresses, direction: 'in'|'out'|'both', pageKey }`. Returns transfers enriched with token metadata and USD value (from Workstream 1 price data).
2. Investor Portal (`/syndication/portal`) gains a "Transaction History" panel showing all LP token movements with USD values.
3. Solvency page gains a "Recent Treasury Movements" table: last 20 inflows and outflows to/from the treasury wallet.
4. Founder Ops dashboard gains an "On-Chain Proof of Capital" section: recent AXAU mints, PAXG deposits, and AXUSD settlements pulled from chain history.

### Files Affected
- `pages/api/alchemy/transfers.ts` (new)
- `pages/syndication/portal.tsx`
- `pages/solvency.tsx`
- `pages/founder-ops/index.tsx`

---

## Workstream 6 — Token Metadata Registry (DEX + Exchange)
**Priority: Tier 2**

### Problem
The DEX and Exchange pages hardcode token names, symbols, and decimals. When a user pastes an arbitrary token address into the swap interface, there is no lookup mechanism — the UI either shows a blank slot or requires a manual token list update. The `/axusd-3643` page token info is also hardcoded.

### Alchemy Endpoints
| Endpoint | What it fetches |
|---|---|
| `alchemy_getTokenMetadata` | name, symbol, decimals, logo URL for any ERC-20 |

### What Gets Built
1. `pages/api/alchemy/token-metadata.ts` — accepts a contract address (or list), calls `alchemy_getTokenMetadata`, returns name, symbol, decimals, logo. Results are cached in-memory for 1 hour.
2. DEX swap interface can accept arbitrary token addresses — token info is fetched dynamically and displayed in the token picker.
3. Exchange page token list is seeded from this endpoint rather than a hardcoded array.
4. MIRDT terminal's token display uses this for any non-Axiom token in the monitored portfolio.

### Files Affected
- `pages/api/alchemy/token-metadata.ts` (new)
- `pages/dex.tsx` (token picker)
- `pages/exchange.tsx`
- `pages/mirdt.tsx`

---

## Workstream 7 — WebSocket Mint Tracking (Live Status on /axau-buy)
**Priority: Tier 2**

### Problem
After a user submits a mint transaction, the `/axau-buy` page has no live status update. The user either polls manually (refreshing the page) or waits for a wallet notification. There is no "Transaction submitted → Pending → Confirmed" progress UI on-screen.

### Alchemy Endpoints (WebSocket)
| Subscription | Use |
|---|---|
| `alchemy_pendingTransactions` | Watch for specific tx hash entering mempool |
| `alchemy_minedTransactions` | Watch for tx confirmation + block number |

### What Gets Built
1. `lib/alchemy/ws-client.ts` — lightweight WebSocket manager for the Alchemy Arbitrum endpoint. Handles reconnect, subscription management, and message routing.
2. `pages/api/alchemy/tx-status.ts` — SSE (Server-Sent Events) endpoint. Client connects, provides a tx hash; server opens Alchemy WS subscription and streams: `{ status: 'pending' | 'mined' | 'dropped', blockNumber?, confirmations? }`.
3. `/axau-buy` — after the user submits their mint tx, a status strip appears at the top: "Transaction submitted — [spinner] Waiting for confirmation…" → "[green checkmark] Confirmed in block 12345678 · 1 confirmation." Once confirmed, the portfolio balance re-fetches automatically.

### Files Affected
- `lib/alchemy/ws-client.ts` (new)
- `pages/api/alchemy/tx-status.ts` (new — SSE)
- `pages/axau-buy.tsx` (status strip)

---

## Workstream 8 — Gas Manager / EIP-4337 (Gasless Identity Registration)
**Priority: Tier 3 — Strategic**

### Problem
The biggest drop-off point in the AXAU founding cohort funnel is ERC-3643 identity registration. A new wallet that just arrived from the AXAU early access approval email needs ETH for gas to register their identity credential on-chain. Many target participants (W-2 earners new to crypto) have USDC or AXUSD from the onramp but zero ETH. The gas requirement blocks them completely.

### Alchemy Endpoints (Gas Manager API + Bundler API)
| Endpoint | Use |
|---|---|
| Gas Manager policy REST API | Create a policy: sponsor gas for wallets in the founding cohort list |
| `eth_sendUserOperation` (Bundler) | Submit sponsored UserOperation |
| `eth_estimateUserOperationGas` | Pre-estimate gas cost for UX display |
| `eth_getUserOperationByHash` | Track UserOp status |

### What Gets Built
1. `pages/api/alchemy/gas-policy.ts` — admin endpoint to create/update the Alchemy Gas Manager policy. Policy rule: sponsor transactions to the ERC-3643 IdentityRegistry contract, from wallets that are `approved` in `t3KycSubmissions`, up to $2 in ETH per wallet per day.
2. `pages/api/alchemy/sponsor-identity-tx.ts` — takes an encoded `registerIdentity` calldata + wallet address, wraps it in a UserOperation, submits via the Alchemy Bundler, returns the UserOp hash. The ERC-3643 identity registration gas is paid by Axiom, not the user.
3. `/axau-early-access` — approved wallet flow: "Your application is approved. Click below to register your on-chain credential — gas is covered by Axiom." One button. No ETH required.
4. A `gasSponsored` boolean + `gasCostUsd` float are logged in `t3KycSubmissions` for treasury accounting.

### Files Affected
- `pages/api/alchemy/gas-policy.ts` (new)
- `pages/api/alchemy/sponsor-identity-tx.ts` (new)
- `pages/axau-early-access.tsx` (approved state flow)
- `shared/erc3643Schema.ts` (gasSponsored, gasCostUsd columns)

---

## Summary: Endpoint Inventory

| # | Endpoint / Feature | Workstream | Priority |
|---|---|---|---|
| 1 | `GET /prices/v1/{key}/tokens/by-address` | Prices API | Tier 1 |
| 2 | `GET /prices/v1/{key}/tokens/by-symbol` | Prices API | Tier 1 |
| 3 | `GET /prices/v1/{key}/tokens/historical` | Prices API | Tier 1 |
| 4 | `alchemy_simulateAssetChanges` | Simulation | Tier 1 |
| 5 | `alchemy_simulateExecution` | Simulation | Tier 1 |
| 6 | `ADDRESS_ACTIVITY` webhook | Webhooks | Tier 1 |
| 7 | `MINED_TRANSACTION` webhook | Webhooks | Tier 1 |
| 8 | `DROPPED_TRANSACTION` webhook | Webhooks | Tier 1 |
| 9 | `CUSTOM_WEBHOOK` (Transfer filter) | Webhooks | Tier 1 |
| 10 | `alchemy_getTokenAllowances` | Allowances | Tier 2 |
| 11 | `alchemy_getAssetTransfers` (extended) | Transfer History | Tier 2 |
| 12 | `alchemy_getTokenMetadata` | Token Metadata | Tier 2 |
| 13 | `alchemy_pendingTransactions` (WS) | WebSocket Status | Tier 2 |
| 14 | `alchemy_minedTransactions` (WS) | WebSocket Status | Tier 2 |
| 15 | Gas Manager policy API | Gas Manager | Tier 3 |
| 16 | `eth_sendUserOperation` (Bundler) | Gas Manager | Tier 3 |
| 17 | `eth_estimateUserOperationGas` | Gas Manager | Tier 3 |
| 18 | `eth_getUserOperationByHash` | Gas Manager | Tier 3 |

**Plus the 2 already live** = **20 distinct Alchemy API capabilities** mapped across Axiom Protocol.

---

## Implementation Order (Recommended)

| Sprint | Workstreams | Rationale |
|---|---|---|
| Phase 3A | Prices API + Simulation (WS 1+2) | Highest per-user impact on the mint funnel right now |
| Phase 3B | Webhooks + Allowances (WS 3+4) | Eliminates manual ops work; auto-activates founding cohort |
| Phase 3C | Transfer History + Token Metadata (WS 5+6) | Enriches institutional-grade dashboards |
| Phase 3D | WebSocket Tracking + Gas Manager (WS 7+8) | Polish layer + strategic gasless onboarding |
