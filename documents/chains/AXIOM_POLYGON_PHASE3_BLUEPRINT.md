# Axiom Protocol — Polygon Phase 3 Responsibility Blueprint

**Document type:** Phase B — Chain Responsibility Blueprint  
**Phase:** Polygon Phase 3 — Foundation and Architecture  
**Created:** 2026-05-14  
**Status:** AUTHORITATIVE — foundation and architecture only  

---

## 1. Non-Negotiable Principle

> Arbitrum One remains the canonical source of truth for identity, reserve
> accounting, AXUSD issuance, policy decisions, and solvency / disclosure.
>
> Polygon is an additive payments and treasury routing layer.
> It does not replace or supersede any Arbitrum canonical surface.

---

## 2. Polygon's Strategic Role

**Phase 3 designation:** Payments / Treasury Routing / Enterprise Settlement  
**Chain ID:** 137 (Polygon PoS mainnet)  
**Strategic phase:** Future — architecture only at Phase 3 start  
**Feature flag:** `CHAIN_POLYGON_ENABLED` (default: false)  
**Capability flag:** `MULTICHAIN_ENABLED` must also be true  

Polygon's primary value to Axiom Protocol is cost-efficient, high-throughput
settlement for USDC-denominated flows: card onramp destination routing,
enterprise USDC settlement, treasury movement between Polygon-native wallets,
and optional future AXUSD settlement corridors.

It is a **payment and movement layer**, not an identity, reserve, or policy layer.

---

## 3. Responsibility Allocation Matrix

### 3.1 What Remains on Arbitrum One (canonical — must not migrate)

| Responsibility | Arbitrum Contract / Service | Notes |
|---|---|---|
| AXUSD canonical supply | `AxiomStable3643` (ERC-3643) | Minting and burning are Arbitrum-only |
| AXAU canonical reserve | AXAU contract, PAXG anchor on Ethereum | Reserve truth stays Arbitrum + Ethereum |
| ERC-3643 identity | `AxiomIdentityComplianceHub` | Canonical identity — Polygon mirrors, never owns |
| Solvency / disclosure state | Axiom Sentinel + on-chain contracts | Arbitrum data feeds Sentinel — no Polygon input |
| Policy decisions | `AllocationPolicyService`, Sentinel | Arbitrum contracts enforce policy |
| Governance | TimelockController, governance hub | Governance is Arbitrum-only |
| DePIN node economy | `AxiomDePIN` contracts | Infrastructure layer stays Arbitrum |
| Land acquisition registry | `AxiomLandAndAssetRegistry` | Real asset anchoring stays Arbitrum |
| SIWE authentication | `assertArbitrumOne.ts` + `siweAuth.ts` | Must remain Arbitrum-only |
| Internal DEX (Camelot/Euler) | Camelot pool contracts | Liquidity stays Arbitrum |

### 3.2 What May Route Through Polygon

| Capability | Polygon's Role | Reconciliation Requirement |
|---|---|---|
| USDC payments | Native USDC on Polygon as payment settlement token | All movement reconciled back to Axiom control plane |
| Card/onramp destination | Future: card-to-USDC landing on Polygon PoS | Reconcile to Arbitrum canonical ledger before crediting |
| Enterprise settlement | Polygon USDC transactions for enterprise flows | Full transaction log, reconciliation with capinfra |
| Treasury movement | USDC wallet-to-wallet routing on Polygon | Reconciliation cron + control plane ledger entry |
| Polygon ID credentials | Attested credential delivery (read from Arbitrum) | Arbitrum is source; Polygon is delivery layer |
| Low-cost transaction batch | Operational batch transactions in USDC | Not for issuance — only movement |

### 3.3 What Must Stay Off-Chain in the Axiom Control Plane

| Control Function | Where It Lives | Notes |
|---|---|---|
| Payment authorization | `lib/capinfra/` — Axiom Sentinel | Authorization happens before any on-chain Polygon call |
| Cap enforcement | Capinfra policy layer | Polygon has no caps of its own — control plane enforces |
| Fraud / dispute management | Axiom control plane + Stripe/Coinbase dispute rails | Never on-chain |
| Identity verification | Arbitrum ERC-3643 → capinfra policy check | Polygon does not re-verify identity independently |
| Reconciliation | Capinfra reconciliation layer | Daily automated reconciliation |
| Compliance gating | `AllocationPolicyService` + `PolicyGuardService` | US-only and other jurisdiction gates stay in control plane |

### 3.4 What Must Reconcile Back to Canonical Ledger

Every Polygon-side movement must produce a reconciliation record that ties back
to the Arbitrum canonical state. The reconciliation model is:

```
Polygon action
  → capinfra POLYGON adapter creates instruction
  → instruction records: amount, fromWallet, toWallet, txHash, block
  → reconciliation cron reads Polygon chain state
  → reconciliation result written to capinfra ledger
  → Arbitrum treasury position updated (if applicable)
  → Axiom Sentinel sees net position delta
```

No Polygon payment may be considered "settled" by the Axiom ledger until the
capinfra reconciliation record is written and validated.

---

## 4. Capability Assignment

Polygon's authorized capabilities (from `lib/chains/capabilities.ts`):

| Capability | Authorized | Rationale |
|---|---|---|
| `settlement` | ✓ YES | Enterprise settlement layer — USDC settlement on Polygon PoS |
| `payments` | ✓ YES | Primary role — payment routing and treasury movement |
| `treasury` | ✓ YES | Treasury wallet routing for USDC flows |
| `identity` | ✓ YES (attested only) | Polygon ID credential delivery — Arbitrum is canonical source |
| `reserve` | ✗ NO | Reserve accounting is Arbitrum + Ethereum |
| `issuance` | ✗ NO | AXUSD and AXAU issuance is Arbitrum-canonical |
| `policy` | ✗ NO | Policy decisions are capinfra + Arbitrum |
| `governance` | ✗ NO | Governance is Arbitrum-only |
| `distribution` | ✗ NO | Community distribution is Sui's strategic role |

---

## 5. Token Jurisdiction on Polygon

### 5.1 USDC on Polygon

Polygon has two USDC variants. Phase 3 plans around **native USDC only**:

| Token | Address | Standard | Recommendation |
|---|---|---|---|
| USDC (native, Circle-issued) | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | Circle Native USDC | **USE THIS** |
| USDC.e (bridged from Ethereum) | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | Bridge-wrapped | LEGACY — avoid for new flows |

**Why native USDC:** Circle-issued directly on Polygon PoS, no bridge risk,
Circle's canonical Polygon USDC, redeemable 1:1 via Circle API.

### 5.2 AXUSD on Polygon

No AXUSD contract is deployed on Polygon. No AXUSD issuance is planned for
Polygon at Phase 3. Any Polygon-side settlement in AXUSD terms would require:
1. A separate architecture review and accepted-risk record
2. A bridge or cross-chain settlement mechanism (not currently in scope)
3. Explicit approval from the Axiom canonical authority decision

**Phase 3 stance: USDC only. No AXUSD on Polygon.**

### 5.3 AXAU on Polygon

Not applicable. AXAU is reserve-anchored to PAXG on Ethereum, with canonical
accounting on Arbitrum. No AXAU Polygon presence is contemplated at any phase.

---

## 6. Layer Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  AXIOM CONTROL PLANE (capinfra / Sentinel / PolicyGuard)        │
│  Authorization · Policy · Reconciliation · Solvency State       │
│  Runs off-chain — feeds Arbitrum canonical contracts            │
└───────────────────┬─────────────────────┬───────────────────────┘
                    │                     │
       ┌────────────▼──────────┐  ┌───────▼──────────────┐
       │  Arbitrum One         │  │  Polygon PoS          │
       │  CANONICAL LAYER      │  │  PAYMENTS LAYER       │
       │  ─────────────────    │  │  ─────────────────    │
       │  AXUSD supply         │  │  USDC settlement      │
       │  AXAU reserve         │  │  Treasury routing     │
       │  ERC-3643 identity    │  │  Enterprise payment   │
       │  Governance           │  │  Polygon ID (mirror)  │
       │  Policy contracts     │  │                       │
       └───────────────────────┘  └──────────────────────┘
                    │                     │
                    └─────────┬───────────┘
                              │
              ┌───────────────▼──────────────┐
              │  Reconciliation Layer         │
              │  capinfra POLYGON adapter     │
              │  Daily reconciliation cron    │
              │  Writes to canonical ledger   │
              └──────────────────────────────┘
```

---

## 7. What Polygon Phase 3 Does NOT Do

- Does not deploy any contract on Polygon mainnet
- Does not activate any Polygon payment flows
- Does not move AXUSD or AXAU to Polygon
- Does not change Arbitrum canonical status
- Does not change Avalanche pilot behavior
- Does not add banking rails, ACH, or wires
- Does not create public user-facing Polygon routes
- Does not require new env vars for the current deployment
- Does not break the existing build

---

*Axiom Protocol Internal — Polygon Phase 3 Blueprint — 2026-05-14*  
*Arbitrum One remains canonical for all identity, reserve, issuance, and policy.*
