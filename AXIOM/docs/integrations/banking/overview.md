# Banking Integration Overview

---

## Current Banking Architecture

| Provider | Role | Rails | Status |
|---------|------|-------|--------|
| Increase | Primary US banking | ACH, wire, check, debit | Live |
| BitGo | Crypto custody bridge | On-chain (Arbitrum) | Live |
| Circle | Address compliance + programmable wallets | Off-chain compliance | Configured |

---

## Increase Integration

**Files:** `lib/server/integrations/bankingStore.ts`, `lib/server/banking/siweHelper.ts`, pages/api/banking/*

**Capabilities:**
- ACH deposits and withdrawals
- Wire transfers (domestic + international — limited)
- Account creation for participants
- Transaction webhook processing
- Group insurance accounts (wealth practice)
- FDIC-insured deposit accounts

**Webhook:** `UNIT_WEBHOOK_SECRET` (also `INCREASE_API_KEY`, `INCREASE_ENVIRONMENT`)

**Expansion relevance:**
- Increase is US-only (ACH/wire rails)
- International payments must route through Stellar or alternative rails
- Increase cannot serve participants outside the US — Stellar fills this gap

---

## Banking ↔ Crypto Bridge (Current)

The current bridge flow (Increase ↔ Arbitrum):
```
Fiat (Increase ACH) → Bridge request → BitGo custody → AXUSD mint (Arbitrum)
```

**Files:** `shared/bridgeSchema.ts`, `pages/api/banking/bridge/request.ts`

This bridge is the L00→L01 connection between fiat banking and on-chain settlement.

---

## International Payments Gap

**Current coverage:**
- US ACH: 1-3 business days, Increase
- Domestic wire: Same day, Increase
- International wire: Increase (limited corridors, high fees, 1-5 days)

**Gap:**
- Cross-border payments to Caribbean, West Africa, Latin America — NOT covered by Increase
- Sub-$1000 international remittances — wire fees make this impractical

**Solution:** Stellar payments rail (when live) fills this gap. See `docs/integrations/stellar/` for full analysis.

---

## Banking Expansion Checklist

| Item | Status | Priority |
|------|--------|---------|
| Increase US ACH | Live | N/A |
| International wire (Increase) | Limited | Already live but expensive |
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
