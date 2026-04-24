# Stellar — Implementation Plan

**Status:** Pre-implementation (stub adapter in place)
**Priority:** 1 — first chain to integrate
**Feature Flag:** `ENABLE_STELLAR_PAYMENTS_RAIL`
**Adapter Stub:** `lib/multichain/stellar/StellarPaymentAdapter.ts`
**Interface Contract:** `lib/multichain/adapters/StellarPaymentAdapterInterface.ts`

---

## What Is Being Built

Stellar is Axiom's external payments and remittance rail. It does NOT replace AXUSD (internal settlement on Arbitrum). It extends Axiom to serve participants who need to receive value in fiat — via remittance corridors, payout flows, and cross-border payments.

Integration flow:
```
AXUSD (Arbitrum) → [AXUSD→USDC conversion step] → USDC (Stellar) → Anchor → Fiat
```

---

## Implementation Phases

### Phase 0 — Current (Complete)
- [x] `SettlementRailService.ts` — Stellar rail descriptor with blockers documented
- [x] `CorridorRoutingService.ts` — AXUSD→Stellar corridor route object
- [x] `ENABLE_STELLAR_PAYMENTS_RAIL` feature flag
- [x] `expansion_settlement_corridors` DB table
- [x] `StellarPaymentAdapterInterface` — typed interface contract
- [x] `StellarPaymentAdapter` — stub implementation (all methods safe to call, none live)
- [x] `StellarReadinessService` — readiness surface with DB integration
- [x] `types.ts` — full Stellar type system (assets, anchors, corridors, SEP protocols)
- [x] Documentation set (overview, apis, compliance, open-questions, etc.)

### Phase 1 — Business Prerequisites (Gate: Business Decision)
- [ ] Select anchor partner from candidates (Circle, MoneyGram, Bitso, Tempo)
- [ ] Initiate partner agreement process with selected anchor
- [ ] Define payment corridors (which countries, which currencies)
- [ ] Confirm compliance requirements for cross-border payment flows

### Phase 2 — SDK Review (Gate: Phase 1 initiated, not necessarily complete)
- [ ] `npm install @stellar/stellar-sdk`
- [ ] Review Horizon API (docs.stellar.org/api/horizon)
- [ ] Review SEP-0010 (auth), SEP-0024 (interactive anchor), SEP-0031 (cross-border)
- [ ] Obtain testnet credentials from selected anchor (testnet.stellar.org)
- [ ] Run `StellarPaymentAdapter` stub against Stellar testnet (verify types, network calls)
- [ ] Update `expansion_rail_integrations` DB row: `sdk_reviewed=true`, `docs_attached=true`

### Phase 3 — Testnet Implementation
- [ ] Replace stub methods in `StellarPaymentAdapter.ts` with real Stellar SDK calls
  - `getNetworkHealth()` — Horizon `/` endpoint
  - `getAccountInfo(publicKey)` — Horizon `/accounts/{publicKey}`
  - `getAnchorStatus(anchorId)` — anchor's SEP-1 TOML + SEP-24 `/info`
  - `initiatePayment(options)` — SEP-24 interactive deposit/withdrawal flow
  - `getTransferState(transferId)` — SEP-24 `/transaction?id=...`
- [ ] Build `AxusdToStellarBridgeService` — handles the AXUSD→USDC conversion step
- [ ] Add testnet routes to `expansion_settlement_corridors` DB table
- [ ] Enable `ENABLE_STELLAR_PAYMENTS_RAIL=true` in development/staging
- [ ] Build frontend flow: Initiate → SEP-24 interactive window → Status polling

### Phase 4 — Compliance Integration
- [ ] Add Stellar compliance check to ERC-3643 identity verification flow
- [ ] Implement cross-border payment compliance requirements (as defined with anchor)
- [ ] Add transaction limits and jurisdiction restrictions per corridor
- [ ] Add AML/CFT hooks per anchor's compliance requirements

### Phase 5 — Mainnet Launch
- [ ] Switch to mainnet anchor endpoints
- [ ] Fund Stellar hot wallet with XLM for fees
- [ ] Enable `ENABLE_STELLAR_PAYMENTS_RAIL=true` in production
- [ ] Add Stellar payment status to Founder Ops dashboard
- [ ] Update expansion_rail_integrations: `production_enabled=true`, `status=live`
- [ ] Update chainRegistry `status` to `'live'` for stellar-mainnet

---

## Implementation Order Within StellarPaymentAdapter

When replacing stubs, implement in this order (each depends on the previous):

1. `getNetworkHealth()` — baseline Horizon connectivity
2. `getAccountInfo(publicKey)` — account lookups (needed for validation)
3. `getSupportedAssets()` — asset list from anchor TOML
4. `getAnchorStatus(anchorId)` — anchor health check
5. `getAllCorridors()` / `getCorridorStatus()` — live anchor data
6. `initiatePayment(options)` — core payment flow (depends on 1-5)
7. `getTransferState(transferId)` — status polling
8. `cancelPayment(transferId)` — cancellation (if anchor supports it)

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/multichain/stellar/StellarPaymentAdapter.ts` | Stub → real implementation |
| `lib/multichain/stellar/StellarReadinessService.ts` | Readiness tracking (no changes needed for Phase 1-2) |
| `lib/multichain/stellar/types.ts` | All Stellar types — extend as needed |
| `lib/multichain/adapters/StellarPaymentAdapterInterface.ts` | Interface contract — do not change without updating stub |
| `lib/multichain/SettlementRailService.ts` | Base rail descriptor — update blockers as resolved |
| `shared/expansionSchema.ts` | DB tables for status tracking |
| `pages/api/infrastructure/corridors.ts` | API that surfaces corridor state |

---

## What Must NOT Be Changed

| Constraint | Reason |
|-----------|--------|
| AXUSD remains internal settlement on Arbitrum | Stellar is the external rail — not a replacement |
| ERC-3643 identity layer on Arbitrum is primary | Stellar payments use existing identity for compliance |
| `isLive` defaults to false | Controlled by `ENABLE_STELLAR_PAYMENTS_RAIL` env var |
| All methods must return structured types | Never throw — return error fields in result objects |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Anchor partner takes months to integrate | HIGH | Start with Circle USDC — simplest path |
| SEP-24 interactive flow adds UX friction | MEDIUM | Design anchor iframe/redirect flow early |
| Cross-border compliance varies by jurisdiction | HIGH | Define corridors narrowly at launch |
| XLM price volatility affects fee stability | MEDIUM | Pre-fund XLM wallet with buffer |
| Anchor service downtime | MEDIUM | Design fallback and user-facing status page |
