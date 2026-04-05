# Stellar — API Surfaces

**Status:** Not yet reviewed or integrated.

---

## 1. Horizon API (Primary REST Interface)

Horizon is the Stellar network's REST API. It is the primary interface for submitting transactions and querying network state.

### Base URLs

| Network | URL |
|---------|-----|
| Mainnet | `https://horizon.stellar.org` |
| Testnet | `https://horizon-testnet.stellar.org` |

### Key Endpoints

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/accounts/{account_id}` | GET | Account balances, sequence number |
| `/transactions` | POST | Submit signed transaction (base64 XDR) |
| `/transactions/{hash}` | GET | Transaction detail |
| `/operations` | GET | Operations (payments, offers, etc.) |
| `/payments?cursor=...` | GET | Payment stream (supports SSE) |
| `/assets?asset_code=USDC` | GET | Asset details, issuer |
| `/paths/strict-send` | GET | Payment path discovery |
| `/paths/strict-receive` | GET | Payment path for receiver amount |

### Server-Sent Events (SSE)

Horizon supports SSE for streaming:
- `/accounts/{id}/transactions` — Live transaction stream for an account
- `/accounts/{id}/payments` — Live payment stream
- `/ledgers` — New ledger stream

**Axiom use:** SSE stream for payment confirmation and payout tracking.

---

## 2. Soroban RPC (Smart Contracts — Optional)

Soroban is Stellar's smart contract platform (Rust-based, WASM execution).

### Base URL
```
https://soroban-testnet.stellar.org  (testnet)
https://soroban.stellar.org          (mainnet — verify current URL)
```

### Key Methods (JSON-RPC)

| Method | Purpose |
|--------|---------|
| `getTransaction` | Get smart contract transaction |
| `simulateTransaction` | Simulate before submitting |
| `sendTransaction` | Submit Soroban transaction |
| `getLedgerEntries` | Read contract storage |

**Axiom use:** Soroban may not be required for the payments rail use case. Evaluate after anchor partner is selected.

---

## 3. Anchor API (SEP Standards)

Anchor integration follows Stellar Ecosystem Proposals (SEPs).

### SEP-0024 — Interactive Anchor (Fiat On/Off Ramp)

| Endpoint | Purpose |
|---------|---------|
| `GET /.well-known/stellar.toml` | Anchor metadata and endpoints |
| `POST /auth` (SEP-0010) | Wallet authentication with Stellar keypair |
| `POST /transactions/deposit/interactive` | Initiate fiat deposit |
| `POST /transactions/withdrawal/interactive` | Initiate fiat withdrawal |
| `GET /transaction?id=...` | Transaction status |

### SEP-0031 — Cross-Border Direct Payments

Used for direct fiat-equivalent payments without interactive flow:

| Endpoint | Purpose |
|---------|---------|
| `GET /info` | Supported corridors and limits |
| `POST /transactions` | Initiate direct payment |
| `GET /transactions/{id}` | Payment status |

---

## 4. Circle Stellar USDC APIs

Circle issues USDC on Stellar. For USDC-denominated payments:

- Same Circle API as Axiom's existing Circle integration
- USDC Stellar asset: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` (Circle issuer)

---

## API Keys / Env Variables Needed

| Variable | Purpose | Status |
|---------|---------|--------|
| `STELLAR_NETWORK_PASSPHRASE` | Mainnet: `Public Global Stellar Network ; September 2015` | Public constant |
| `STELLAR_HORIZON_URL` | Mainnet: `https://horizon.stellar.org` | Public constant |
| `STELLAR_SOURCE_ACCOUNT_SECRET` | Stellar keypair for signing transactions | Not configured |
| `STELLAR_SOURCE_ACCOUNT_PUBLIC` | Public key for Axiom's Stellar account | Not configured |
| `STELLAR_ANCHOR_DOMAIN` | Selected anchor's domain (e.g. `moneygram.com`) | Not configured — anchor not yet selected |
| `STELLAR_ANCHOR_API_KEY` | Anchor authentication | Not configured |
