# Stellar — API Surface Map

**Purpose:** Complete map of all Stellar/anchor APIs Axiom will call.
**Status:** Pre-integration reference — none of these have been called yet.
**SDK:** `@stellar/stellar-sdk` — not yet installed.

---

## 1. Horizon REST API (Stellar Network Layer)

Base URL (mainnet): `https://horizon.stellar.org`
Base URL (testnet): `https://horizon-testnet.stellar.org`

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/` | GET | Network health, latest ledger | `getNetworkHealth()` |
| `/accounts/{publicKey}` | GET | Account balances, sequence number | `getAccountInfo()` |
| `/accounts/{publicKey}/transactions` | GET | Account transaction history | Status display |
| `/transactions/{hash}` | GET | Single transaction status | `getTransferState()` |
| `/transactions` | POST | Submit signed transaction | `initiatePayment()` |
| `/fee_stats` | GET | Current fee percentiles | Fee estimation |
| `/ledgers?order=desc&limit=1` | GET | Latest ledger (for fee base) | `getNetworkHealth()` |
| `/assets?asset_code=USDC` | GET | Find USDC asset issuers | Asset verification |

**Rate limits (public Horizon):**
- Default: 3600 requests/hour
- Burst: up to 100/minute
- Production: Consider dedicated Horizon instance (Stellar Foundation offers one) or third-party provider (QuickNode, Blockdaemon)

**SDK usage:**
```typescript
import { Horizon } from '@stellar/stellar-sdk';
const server = new Horizon.Server('https://horizon.stellar.org');

// Health check
const ledger = await server.ledgers().order('desc').limit(1).call();

// Account info
const account = await server.loadAccount(publicKey);
```

---

## 2. SEP-0010 — Authentication API

**Purpose:** Authenticate Axiom (as a sending business) with anchor partners.
**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `<anchor-domain>/.well-known/stellar.toml` | GET | Get anchor metadata including SEP-10 URL |
| `<sep10-url>/auth` | GET | Get authentication challenge |
| `<sep10-url>/auth` | POST | Submit signed challenge, receive JWT |

**Flow:**
1. Fetch `stellar.toml` → find `WEB_AUTH_ENDPOINT`
2. GET challenge from WEB_AUTH_ENDPOINT with Axiom's Stellar public key
3. Sign challenge with Axiom's Stellar signing keypair
4. POST signed XDR → receive JWT
5. Use JWT as Bearer token for all subsequent SEP-24/SEP-31 calls

**SDK support:**
```typescript
import { Utils } from '@stellar/stellar-sdk';
// Challenge validation and signing built into SDK
const { challenge } = Utils.buildChallengeTx(...);
```

---

## 3. SEP-0024 — Interactive Anchor API

**Purpose:** Interactive deposit/withdrawal flows (with user-facing UI from anchor).
**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md

| Endpoint | Method | Headers | Purpose |
|----------|--------|---------|---------|
| `/info` | GET | — | List supported assets and corridors |
| `/transactions/deposit/interactive` | POST | Authorization: Bearer JWT | Initiate deposit |
| `/transactions/withdraw/interactive` | POST | Authorization: Bearer JWT | Initiate withdrawal |
| `/transaction?id={id}` | GET | Authorization: Bearer JWT | Poll transfer status |
| `/transactions?asset_code=USDC&limit=10` | GET | Authorization: Bearer JWT | List transactions |

**Flow for AXUSD → fiat (withdrawal):**
1. Axiom calls `POST /transactions/withdraw/interactive` with USDC amount, recipient info
2. Anchor returns an `interactive_url` — a URL for the user to complete KYC/details
3. Axiom opens the `interactive_url` in an iframe or popup
4. User completes anchor's interactive flow
5. Anchor updates transaction status to `pending_user_transfer_start`
6. Axiom submits USDC from Axiom's Stellar account to anchor's Stellar address
7. Status polls until `completed` or `error`

**Status values to handle:**
- `pending_user_transfer_start` — awaiting Axiom to send USDC
- `pending_external` — anchor processing
- `pending_anchor` — anchor moving fiat
- `completed` — fiat delivered to recipient
- `error` — failed (check `message` field)
- `refunded` — USDC returned to Axiom

---

## 4. SEP-0031 — Cross-Border Payments API

**Purpose:** Direct sending-side payment flows (no interactive user UI required).
**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md

| Endpoint | Method | Headers | Purpose |
|----------|--------|---------|---------|
| `/info` | GET | — | List supported asset pairs and corridors |
| `/send` | POST | Authorization: Bearer JWT | Initiate cross-border payment |
| `/transaction/:id` | GET | Authorization: Bearer JWT | Get payment status |

**Note:** SEP-31 requires more compliance information upfront (recipient KYC).
Evaluate whether SEP-24 is simpler for Axiom's initial use case.

---

## 5. SEP-0038 — RFQ API

**Purpose:** Get price quotes before initiating payments.
**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md

| Endpoint | Method | Headers | Purpose |
|----------|--------|---------|---------|
| `/prices` | GET | — | Get list of available conversion pairs |
| `/price` | GET | — | Get specific conversion price (USDC→MXN, etc.) |
| `/quote` | POST | Authorization: Bearer JWT | Lock in a specific price quote |

**Used for:** Getting the USD→MXN exchange rate before confirming a remittance.
Required if Axiom guarantees a specific exchange rate to participants.

---

## 6. Anchor TOML (`stellar.toml`)

Every anchor publishes a `stellar.toml` at their domain root.
This is the starting point for integration with any anchor.

**Always fetch first:**
```
GET https://anchor-domain.com/.well-known/stellar.toml
```

Key fields to check:
- `WEB_AUTH_ENDPOINT` — SEP-10 URL
- `TRANSFER_SERVER_SEP0024` — SEP-24 base URL
- `DIRECT_PAYMENT_SERVER` — SEP-31 base URL
- `ANCHOR_QUOTE_SERVER` — SEP-38 base URL
- `CURRENCIES` — list of supported assets with issuers

---

## Axiom Endpoints to Build (for Stellar flows)

These routes do not exist yet. Build during Phase 3:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stellar/health` | GET | Return Stellar network health (calls adapter) |
| `/api/stellar/corridors` | GET | Return available payment corridors |
| `/api/stellar/initiate` | POST | Initiate a Stellar payment (auth required) |
| `/api/stellar/status/:transferId` | GET | Poll transfer status |
| `/api/stellar/anchors` | GET | Return anchor candidate list with evaluation status |

**Auth requirement:** All POST routes must require auth (use `ADMIN_SOLVENCY_KEY` pattern or SIWE session).
