# Stellar — Integration Overview

**Axiom Role:** External Payments Rail + Remittance Corridors  
**Chain Category:** payments (non-EVM)  
**Status:** Researching  
**Feature Flag:** `ENABLE_STELLAR_PAYMENTS_RAIL`  
**EVM Compatible:** No  
**Primary Protocol:** Stellar Consensus Protocol (SCP)  
**Primary API:** Horizon REST API + Soroban RPC

---

## What Stellar Does in the Axiom Architecture

Stellar is the planned **external payments and asset movement rail** for Axiom Protocol. It does NOT replace AXUSD as the internal settlement layer. It does NOT replace Arbitrum as the core execution environment.

Its single role is: **enable outbound payment flows, remittance corridors, and fiat/stablecoin movement across jurisdictions** — particularly for participants who need to receive value outside of the on-chain ecosystem.

### Why This Matters

Axiom's internal settlement layer (AXUSD on Arbitrum) serves on-chain operations. But participants in capital programs, wealth practice groups, and land acquisition vehicles may need to move value:
- Into fiat (USD, foreign currencies) via banking corridors
- Across borders via remittance pathways
- To non-crypto recipients who need stable-value instruments

Stellar is purpose-built for this. It has:
- Sub-5 second finality
- Near-zero transaction fees ($0.00001 XLM per operation)
- Native USDC support (Circle issues USDC on Stellar)
- Established anchor network for fiat on/off ramps
- Cross-border payment corridors via the Stellar anchor ecosystem

---

## Axiom's Role on Stellar: NOT as the Issuer

Axiom does NOT need to issue an asset on Stellar. The integration model is:

```
AXUSD (Arbitrum) → [bridge/conversion step] → USDC (Stellar) → Stellar anchor → fiat
```

Axiom acts as the orchestrator between its internal settlement layer and the Stellar payments rail. The Stellar anchor partner handles the fiat conversion.

---

## Integration Surface Summary

| Surface | Status | Notes |
|--------|--------|-------|
| Stellar SDK (stellar-sdk) | Not reviewed | Primary JS/TS SDK |
| Horizon API | Not reviewed | REST API for Stellar network |
| Soroban (Stellar smart contracts) | Not reviewed | Optional — may not be needed for payments rail |
| SEP-0024 (interactive anchor) | Not reviewed | Primary anchor protocol for fiat corridors |
| SEP-0031 (cross-border payments) | Not reviewed | Direct payment protocol for sending |
| Anchor partner selection | Not started | MoneyGram, Circle, Bitso — not yet evaluated |
| USDC on Stellar (Circle) | Available | USDC is live on Stellar; used as corridor currency |

---

## Role Boundaries (Must Not Be Crossed)

| Stellar IS | Stellar IS NOT |
|-----------|---------------|
| External payment movement rail | Internal settlement layer |
| Remittance corridor | AXUSD replacement |
| Fiat conversion surface | Arbitrum replacement |
| Outbound payment rail | Reserve layer |
| Jurisdiction-crossing payment vehicle | Identity/compliance layer |

---

## Anchor Partner Requirement

Stellar payments to fiat require an **anchor partner** — a regulated entity that bridges between Stellar USDC and local fiat. This is a partnership decision, not a purely technical one.

Candidate anchors (to evaluate):
- **Circle** — Issues USDC on Stellar; may provide anchor services
- **MoneyGram** — Has Stellar anchor integration for remittance
- **Bitso** — Strong LATAM corridor
- **Tempo** — European Stellar anchor

**This partnership decision must be made before any Stellar payments implementation begins.**
