# Custody Integration Overview

---

## Current Custody Architecture

Axiom Protocol uses a hybrid custody model:

| Layer | Provider | Type | Status |
|-------|---------|------|--------|
| Institutional Crypto | BitGo CaaS | Non-custodial MPC/HSM | Live (activated) |
| Banking (Fiat) | Increase | FDIC-insured | Live |
| Community Group Insurance | Increase (hold model) | Per-group account | Live |
| Circle Wallets | Circle (W3S) | Programmable wallets | Configured |
| PAXG Reserve | Paxos / Arbitrum | On-chain vault | Live (contract-based) |

---

## BitGo CaaS Integration

**Files:** `lib/bitgo/client.ts`, `lib/bitgo/helpers.ts`, `lib/server/integrations/bitgoClient.ts`, `lib/services/BitGoWalletService.ts`, `lib/services/BitGoTreasuryExtension.ts`

**API Base URL:** `BITGO_API_URL` env var (defaults to `https://app.bitgo-test.com/api/v2`)

**Live capabilities:**
- Enterprise wallet management
- Multi-signature treasury operations (pending approvals)
- On-chain transaction submission
- Transaction history
- Balance monitoring

**Expansion surface:**
- Verify which chains BitGo supports for multi-chain expansion
- BitGo coins list: `GET /api/v2/wallet` shows supported coins per environment
- Known Arbitrum support: `arbeth` coin type
- Polygon/Avalanche/Stellar/Cosmos support: must verify via API

**Key env vars:**
- `BITGO_API_URL` — API base URL (configured)
- `BITGO_ENTERPRISE_ID` — Enterprise ID (configured)
- Secret: BitGo access token (configured)

---

## Circle Programmable Wallets

**Files:** `lib/circle/walletClient.ts`

**Current state:** Configured for Arbitrum (`blockchains: ['ARB']`)

**Expansion:** Circle W3S supports multiple blockchains. Verify which chains are supported.

**API base:** `https://api.circle.com/v1/w3s`

**Environment variable needed:** `CIRCLE_APP_ID` (not currently in secrets list — verify)

---

## Key Questions for Custody Expansion

1. Does BitGo support Polygon MATIC wallets? → Needed if Axiom holds MATIC for gas
2. Does BitGo support Avalanche AVAX wallets? → Needed if Axiom holds AVAX for gas
3. Does BitGo support Stellar XLM wallets? → Critical for Stellar key management
4. Does BitGo support Cosmos ATOM wallets? → Needed for Cosmos validator staking
5. Can Circle W3S wallets be created on Polygon / Avalanche?

---

## Gas Wallet Management Per Chain

Each expansion chain requires a gas wallet funded with the native token:

| Chain | Native Token | Gas Wallet Strategy |
|-------|-------------|---------------------|
| Polygon | MATIC | BitGo wallet (if supported) or EOA with MATIC |
| Avalanche | AVAX | BitGo wallet (if supported) or EOA with AVAX |
| Stellar | XLM | BitGo Stellar wallet (if supported) or keypair |
| Cosmos | ATOM or AXM | BitGo Cosmos wallet (if supported) or validator key |
| Canton | Network fee to sync domain | Participant node fee model (not token-based) |

---

## PAXG Reserve Custody (Ethereum Layer)

The AXAU reserve instrument is backed by PAXG (ERC-20 on Ethereum Mainnet). PAXG is issued by Paxos and represents physical gold.

**Current model:** PAXG held in GoldVault contract on Arbitrum (bridged PAXG representation)

**For Expansion:** PAXG custody model does not need to change for any expansion target. Reserve is locked on Arbitrum.
