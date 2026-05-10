# Stellar — SDK Review Checklist

**SDK:** `@stellar/stellar-sdk` (npm)
**SDK Status:** Not yet installed
**Source:** https://www.npmjs.com/package/@stellar/stellar-sdk
**Docs:** https://developers.stellar.org/docs

Complete this checklist after installing the SDK and before beginning Phase 3 implementation.

---

## Installation

```bash
npm install @stellar/stellar-sdk
```

After install, update DB:
```sql
UPDATE expansion_rail_integrations
SET sdk_reviewed = true, updated_at = now()
WHERE chain_slug = 'stellar';
```

Or via the admin API once implemented:
```
PATCH /api/infrastructure/readiness/stellar/sdk-reviewed
```

---

## Horizon API Review

- [ ] Read https://developers.stellar.org/docs/data/horizon/api-reference
- [ ] Understand rate limits (default: 3600 requests/hour on public Horizon)
- [ ] Test `GET /` endpoint (network health check)
- [ ] Test `GET /accounts/{publicKey}` (account info, balances, sequence)
- [ ] Test `GET /transactions/{hash}` (transaction status)
- [ ] Test `GET /ledgers?order=desc&limit=1` (latest ledger — used for fee estimation)
- [ ] Review `GET /fee_stats` — understand fee percentiles

**Horizon connection in adapter:**
```typescript
import { Horizon } from '@stellar/stellar-sdk';
const server = new Horizon.Server('https://horizon.stellar.org');
const ledger = await server.ledgers().order('desc').limit(1).call();
```

---

## Core SDK Concepts to Review

- [ ] **Keypair** — Stellar public/private key model (`Keypair.fromPublicKey()`)
- [ ] **TransactionBuilder** — how Stellar transactions are constructed
- [ ] **Operations** — `payment()`, `pathPaymentStrictReceive()`, `manageTrustline()`
- [ ] **Asset** — `new Asset('USDC', issuerAddress)` vs `Asset.native()`
- [ ] **Memo** — how to attach text/hash memos to transactions
- [ ] **Sequence numbers** — how to handle sequence number management
- [ ] **XDR** — Stellar's wire format (needed when submitting signed transactions)

---

## SEP Protocol Review

### SEP-0010 — Stellar Web Authentication
- [ ] Read spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
- [ ] Understand: challenge/response flow for authenticating with anchors
- [ ] Note: Required by SEP-0024 and SEP-0031 — implement this first
- [ ] SDK support: `@stellar/stellar-sdk` includes challenge/verify helpers

### SEP-0024 — Interactive Anchor
- [ ] Read spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- [ ] Understand: `/info`, `/transactions`, `/transaction?id=...` endpoints
- [ ] Understand: interactive flow redirect pattern (anchor opens iframe/window)
- [ ] Note: Status polling is required — anchor does not push status
- [ ] Test with selected anchor's testnet endpoint

### SEP-0031 — Cross-Border Payments
- [ ] Read spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md
- [ ] Understand: sending-side API (POST /send, GET /transaction/:id)
- [ ] Note: More complex than SEP-0024 — requires more compliance information upfront
- [ ] Evaluate: Is SEP-0024 sufficient for Axiom's initial corridors?

### SEP-0038 — RFQ (Request for Quote)
- [ ] Read spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md
- [ ] Understand: price quoting before payment initiation
- [ ] Note: Required if using Circle anchor for USDC/fiat conversions

---

## USDC on Stellar

- [ ] Confirm USDC issuer address: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- [ ] Test: load a testnet USDC-funded account and verify balance structure
- [ ] Understand: trustlines — Stellar accounts must establish trustline before receiving USDC
- [ ] Test: create a trustline operation in code

---

## Testnet Setup

- [ ] Create a Stellar testnet keypair: https://laboratory.stellar.org/#account-creator
- [ ] Fund testnet account via Friendbot: `https://friendbot.stellar.org?addr={publicKey}`
- [ ] Establish USDC trustline on testnet
- [ ] Run the `StellarPaymentAdapter.getNetworkHealth()` stub against testnet — verify it runs
- [ ] Run `StellarPaymentAdapter.getAccountInfo(publicKey)` against testnet — verify account loads

---

## Axiom-Specific Notes

- Axiom does NOT issue a new asset on Stellar — it uses USDC (Circle-issued)
- Axiom's hot wallet on Stellar needs XLM for transaction fees (minimum 1 XLM per account)
- Axiom backend calls Stellar — no MetaMask or Wagmi involved in Stellar flows
- The AXUSD → USDC conversion step happens BEFORE the Stellar transaction
  (design this as a separate service: `AxusdToUsdcBridgeService`)
- Never put DEPLOYER_PRIVATE_KEY on Stellar — create a dedicated Stellar signing key
  and store it as a separate secret: `STELLAR_SIGNING_KEY`

---

## Completion Criteria

The SDK review is complete when:
- [ ] All Horizon API endpoints tested
- [ ] SEP-0024 flow manually traced end-to-end (at least on testnet docs)
- [ ] USDC trustline behavior understood
- [ ] `StellarPaymentAdapter` stub methods annotated with real SDK replacement code
- [ ] `expansion_rail_integrations` DB row updated: `sdk_reviewed=true`
