# Banking Integration Overview

---

> **Scope correction — 2026-04-30:**
> The AXAU launch is a **crypto-native, non-ACH launch**. Fiat entry is supported only through
> Stripe and Coinbase card-to-crypto/onramp flows. ACH, wires, virtual accounts, direct deposit,
> rent collection, payroll, and fiat redemption/bank payout are **deferred** and are not part of
> the current launch scope. Active rails: Stripe · Coinbase Onramp · Arbitrum One (AXUSD/AXAU
> settlement) · BitGo CaaS (custody). Redemption returns PAXG, not USD.

---

## Current Banking Architecture

| Provider | Role | Rails | Status |
|---------|------|-------|--------|
| Stripe | Card/payment processor for fiat entry | Card, payment intent | Live |
| Coinbase Onramp | Card-to-crypto fiat entry | Card → USDC on Arbitrum | Live |
| BitGo | Crypto custody | On-chain (Arbitrum) | Live |
| Circle | Address compliance + programmable wallets | Off-chain compliance | Configured |
| Increase | US banking (ACH/wire) | ACH, wire, check, debit | **Deferred** |

---

## Deferred: Increase Integration

**Files:** `lib/server/integrations/bankingStore.ts`, `lib/server/banking/siweHelper.ts`, pages/api/banking/*

Increase keys remain configured in environment but the ACH/wire rail is **out of scope** for the
current launch. Do not initiate ACH debits or wire transfers until this scope is formally
re-opened.

**Deferred capabilities (do not activate):**
- ACH deposits and withdrawals
- Wire transfers (domestic + international)
- Virtual bank account creation
- Direct deposit / payroll
- Fiat redemption / bank payout

**When Increase is re-activated:**
- Increase is US-only (ACH/wire rails)
- International payments must route through Stellar or alternative rails
- Increase cannot serve participants outside the US — Stellar fills this gap

---

## Active Fiat Entry Bridge (Stripe/Coinbase → Arbitrum)

The current fiat entry flow:
```
Card (Stripe / Coinbase Onramp) → USDC on Arbitrum → AXUSD mint (Arbitrum One)
```

**Files:** `shared/bridgeSchema.ts`, `pages/api/banking/bridge/request.ts`

This is the L00→L01 connection between fiat card entry and on-chain settlement for the
crypto-native, non-ACH launch.

---

## International Payments Gap

**Current coverage:**
- Card-to-crypto: Stripe / Coinbase Onramp
- On-chain: Arbitrum One (AXUSD/AXAU settlement)

**Deferred:**
- US ACH: Increase (deferred — not in current launch scope)
- Domestic wire: Increase (deferred)
- International wire: Increase (deferred — limited corridors, high fees, 1-5 days)

**Future solution:** Stellar payments rail (when scope re-opened) fills international ACH/wire gaps.
See `docs/integrations/stellar/` for full analysis.

---

## Banking Expansion Checklist

| Item | Status | Priority |
|------|--------|---------|
| Stripe card-to-crypto entry | Live | Active |
| Coinbase Onramp card → USDC | Live | Active |
| Increase US ACH | **Deferred** | Post-launch |
| International wire (Increase) | **Deferred** | Post-launch |
| Stellar anchor for international | Planned | HIGH |
| Multi-currency account (non-USD) | Not started | MEDIUM |
| BitGo multi-chain wallets | Verify | HIGH (for gas management) |
| SEPA (European payments) | Not planned | LOW |

---

## Relevant Env Variables

| Variable | Purpose | Status |
|---------|---------|--------|
| `INCREASE_API_KEY` | Increase REST API auth | Configured |
| `INCREASE_ENVIRONMENT` | sandbox/production | Configured |
| `UNIT_API_TOKEN` | Unit.co banking (verify if still active) | Configured |
| `UNIT_API_URL` | Unit.co API endpoint | Configured |
| `UNIT_ORG_ID` | Unit.co org | Configured |
| `BITGO_API_URL` | BitGo API | Configured |
| `BITGO_ENTERPRISE_ID` | BitGo enterprise | Configured |
