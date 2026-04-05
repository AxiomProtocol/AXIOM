# Stellar — Axiom Fit Analysis

---

## Why Stellar

Stellar was designed specifically for cross-border payments, remittance, and asset movement at low cost and high speed. It is the technical infrastructure underlying several major fiat payment corridors (MoneyGram, IBM World Wire, Circle USDC international transfers). For Axiom, which manages participant capital and distributions across a community that spans jurisdictions, Stellar provides the cleanest path to fiat payment delivery.

Key advantages:
- Sub-5 second finality (vs hours for ACH, days for international wire)
- $0.00001 per operation (negligible vs wire fees)
- USDC natively on Stellar (Circle)
- Established anchor network for 50+ country corridors
- Well-documented SEP standards (SEP-0024, SEP-0031) for fiat integration
- No EVM tooling required — fresh, clean integration

---

## What Stellar Strengthens in Axiom

| Axiom Layer | How Stellar Helps |
|------------|-------------------|
| L00 — Banking/Fiat | Extends fiat reach beyond US ACH (Increase) to international corridors |
| L03 — Capital Deployment | Enables international LP distributions via Stellar anchor |
| Wealth Practice | Enables group distributions across borders for diaspora communities |
| Land Acquisition Pipeline | Enables international participant payouts |

---

## What Stellar Does NOT Change

| Axiom Component | Stellar Impact |
|----------------|---------------|
| Arbitrum as core execution | None — Stellar is a payments rail, not a compute layer |
| AXUSD as internal settlement | None — AXUSD stays on Arbitrum; Stellar handles outbound movement |
| AXAU reserve | None |
| DEX / Camelot / Euler | None |
| Banking (Increase, ACH/wire) | Additive — Stellar handles corridors Increase cannot reach |
| ERC-3643 identity | None |

---

## Fit Score by Integration Surface

| Surface | Score | Rationale |
|---------|-------|-----------|
| Payment finality | HIGH | Sub-5 seconds — far superior to ACH |
| Fee model | HIGH | Near-zero fees |
| USDC support | HIGH | Circle USDC on Stellar natively |
| Anchor ecosystem | HIGH | 50+ country coverage via anchor network |
| Non-EVM tooling | MEDIUM | Fresh SDK (stellar-sdk), not Hardhat/ethers |
| Compliance integration | MEDIUM | SEP-0010 auth, but identity model is different |
| Anchor partner dependency | LOW-MEDIUM | Requires partner relationship (not purely technical) |
| Soroban smart contracts | LOW | Not needed for payments rail use case |

---

## Integration Priority vs Effort

**Priority:** HIGH — directly enables participant distributions and international payment reach  
**Effort:** MEDIUM — non-EVM but well-documented SDK and SEP standards  
**Key blocker:** Anchor partner selection — this is a business decision, not technical  
**Pre-requirement:** Define exact payment corridors (which countries, which currencies)

---

## AXUSD ↔ Stellar Payment Flow Design

```
Participant receives distribution (AXUSD on Arbitrum)
  ↓
Participant requests payout to bank account
  ↓
Axiom: AXUSD → USDC via PSM (existing PSM on Arbitrum)
  ↓
USDC on Arbitrum → bridge to Stellar (Circle CCTP or anchor)
  ↓
USDC on Stellar → Stellar anchor → local fiat (SEP-0024/0031)
  ↓
Participant receives fiat in bank account
```

**Alternative (simpler):** Axiom uses Increase banking (existing) for US payouts, Stellar only for international corridors Increase cannot reach.

---

## Competitor Comparison

| Rail | Finality | Fees | International | Fiat Reach |
|------|---------|------|--------------|------------|
| Increase (ACH) | 1-3 days | ~$0.25 | No | US only |
| Stellar + Anchor | <5 seconds | ~$0 | Yes | 50+ countries |
| Wire (via Increase) | 1-2 days | $15-45 | Limited | ~180 countries |

Stellar clearly fills the gap for international, low-cost, fast settlement that existing Increase integration cannot cover.
