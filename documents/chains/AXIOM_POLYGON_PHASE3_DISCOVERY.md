# Axiom Protocol — Polygon Phase 3 Discovery

**Document type:** Phase A — Discovery Report  
**Phase:** Polygon Phase 3 — Foundation and Architecture  
**Created:** 2026-05-14  
**Status:** COMPLETE — architecture and foundation only; no mainnet deployment  

---

## 1. Executive Summary

The Axiom Protocol codebase already contains a well-structured Polygon scaffold
across `lib/chains/` and `lib/multichain/`, created during the multichain
abstraction planning phase. This scaffold correctly gates Polygon behind feature
flags, defines its strategic capabilities, and provides typed interfaces for
future implementation. No live Polygon code is currently running.

Phase 3 begins the transition from that planning scaffold to a deliberate
architecture foundation for Polygon as the payments / treasury routing /
enterprise settlement layer. This document captures the full discovery of
what exists, what is missing, and what the risk areas are.

---

## 2. Existing Polygon Infrastructure (Already Present)

### 2.1 lib/chains/ — Complete scaffolding

| File | Polygon Content | Status |
|---|---|---|
| `lib/chains/config.ts` | `CHAIN_CONFIGS.polygon` — chainId 137, role `payments_settlement`, Alchemy `matic` network, `POLYGON_RPC_URL` env, `CHAIN_POLYGON_ENABLED` flag | PRESENT |
| `lib/chains/capabilities.ts` | `POLYGON_CAPABILITIES` — settlement=true, payments=true, treasury=true, identity=true; reserve/issuance/policy=false | PRESENT |
| `lib/chains/explorers.ts` | `polygonscan.com` in explorer map; `getTxUrl('polygon', hash)` works | PRESENT |
| `lib/chains/providers.ts` | `getPolygonRpcUrl()` — reads `POLYGON_RPC_URL` env, Alchemy `matic` network fallback; returns null if disabled | PRESENT |
| `lib/chains/contracts.ts` | Polygon section with all-null `CoreContractAddresses`; `getContractAddress('polygon', key)` returns null | PRESENT |
| `lib/chains/index.ts` | Exports all of the above | PRESENT |

### 2.2 lib/multichain/ — Interface and flag scaffolding

| File | Polygon Content | Status |
|---|---|---|
| `lib/multichain/adapters/PolygonIdentityAdapterInterface.ts` | Full typed interface for Polygon ID credential bridge — `bridgeCredential`, `getBridgeState`, `revokeCredential`, `verifyCredential`, `syncAll` | PRESENT — INTERFACE ONLY |
| `lib/multichain/featureFlags.ts` | `POLYGON_IDENTITY_BRIDGE` expansion flag — defaults false, reads `ENABLE_POLYGON_IDENTITY_BRIDGE` | PRESENT — IDENTITY SCOPE ONLY |
| `lib/multichain/chainRegistry.ts` | Polygon entry with role `identity_bridge` — does not yet reflect payments/treasury Phase 3 role | PRESENT — OUTDATED ROLE |

### 2.3 Strategic documents already defining Polygon

| Document | Polygon Content |
|---|---|
| `documents/chains/AXIOM_CHAIN_ALLOCATION_BLUEPRINT.md` | Defines Polygon role as "Payments / Treasury Routing / Enterprise Settlement" — chainId 137 |
| `documents/chains/AXIOM_MULTICHAIN_FLAGS_AND_ENV.md` | Documents `CHAIN_POLYGON_ENABLED` and `MULTICHAIN_ENABLED` as optional env vars |
| `documents/chains/AXIOM_MULTICHAIN_DISCOVERY_REPORT.md` | Lists Polygon surfaces in multichain registry |

---

## 3. What Does NOT Yet Exist

| Gap | Impact | Required For |
|---|---|---|
| `shared/contracts-polygon.ts` | No canonical Polygon contract placeholder file (analogous to `shared/contracts-avalanche.ts`) | Any future Polygon contract work |
| Polygon payments role in featureFlags.ts | `POLYGON_IDENTITY_BRIDGE` flag is identity-scoped; no flag for payments/treasury routing | Phase 3 feature-flagged payments scaffold |
| No capinfra `POLYGON` settlement type | `capSettlementTypeEnum` in DB has INTERNAL, STELLAR, PLAID, EVM, AVALANCHE — no POLYGON | Future payment instruction routing |
| No Polygon AXUSD or USDC constants | USDC on Polygon (native + bridged) not registered anywhere in shared config | Future payment flows |
| No Polygon-specific hardhat config | `hardhat-avalanche/` exists for Avalanche; no equivalent for Polygon | Any future contract deployment |
| `lib/multichain/chainRegistry.ts` Polygon role | Still says `identity_bridge` — doesn't reflect Phase 3 payments/settlement role | Accuracy |

---

## 4. Current Payment / Treasury Surfaces That Could Eventually Use Polygon

### 4.1 Card / Onramp flows

| File | Current State | Polygon Relevance |
|---|---|---|
| `lib/onramp/config.ts` | Arbitrum-only, `chainId: 42161` hardcoded in asset list | Future: Polygon USDC onramp could route here |
| `lib/onramp/sessionService.ts` | Session-level onramp logic | Future: chain-aware onramp destination |
| `app/api/onramp/` | Card-to-crypto Coinbase Onramp | Future: Polygon as destination chain option |

### 4.2 Treasury routing

| File | Current State | Polygon Relevance |
|---|---|---|
| `lib/services/CircleTreasuryService.ts` | Circle USDC wallet registry via DB — chain-agnostic schema | Future: Polygon USDC wallet entries |
| `lib/services/TreasuryLedgerService.ts` | Treasury ledger — internal | Future: Polygon treasury movement ledger rows |
| `lib/services/IncreaseTreasuryService.ts` | ACH/bank treasury movements | Increase does not support Polygon — routing context |

### 4.3 Settlement and capinfra

| File | Current State | Polygon Relevance |
|---|---|---|
| `lib/capinfra/adapters/` | EVM, ACH, STELLAR, AVALANCHE adapters | Future: POLYGON capinfra adapter |
| `shared/capInfraSchema.ts` | `capSettlementTypeEnum` values | Future: add POLYGON type |

### 4.4 AXUSD / stablecoin

| File | Current State | Polygon Relevance |
|---|---|---|
| `shared/contracts.ts` | Arbitrum AXUSD contract | Future: Polygon-side AXUSD or bridged USDC settlement |
| `lib/services/AXUSDTransactionService.ts` | Arbitrum-only AXUSD ops | Future: Polygon transaction awareness |

---

## 5. What Is Currently Arbitrum-Only and Must Remain So

| Surface | Why Arbitrum-Canonical | Migration Risk |
|---|---|---|
| `shared/contracts.ts` — 53 live contracts | All live operations, ERC-3643 identity, AXUSD issuance, AXAU reserve | HIGH — canonical source of truth |
| `lib/utils/assertArbitrumOne.ts` | Hard chain-ID gate for SIWE sign-in | DO NOT REMOVE |
| `lib/middleware/siweAuth.ts` | SIWE authentication | DO NOT MODIFY |
| `lib/web3/wagmiConfig.ts` | Wallet connector — Arbitrum primary | Polygon can be added as secondary chain only |
| ERC-3643 identity system | ONCHAINID on Arbitrum; identity_compliance canonical | Mirror only — Arbitrum owns |
| AXUSD totalSupply | ERC-3643 token on Arbitrum | Canonical — any Polygon usage is settlement only |
| AXAU reserve | PAXG-backed, Arbitrum contract | Canonical — Polygon does not hold reserve |

---

## 6. What Polygon Should Own (Future Phases)

| Responsibility | Scope | Notes |
|---|---|---|
| USDC payment routing | Polygon USDC (native) settlement | Circle Native USDC on Polygon: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Enterprise settlement | Low-cost enterprise transaction execution | PoS gas efficiency advantage |
| Treasury movement | USDC treasury routing between wallets | Internal control plane reconciles back to Arbitrum |
| Polygon ID credential delivery | Attested credentials (Arbitrum is canonical) | Read-only mirror — not canonical source |
| Card onramp destination | Future: Stripe/Coinbase card → Polygon USDC | No ACH, no banking rails |

---

## 7. What Polygon Must NOT Own

| Off-Limits | Reason |
|---|---|
| Canonical identity | Arbitrum ERC-3643 is the source of truth |
| AXUSD canonical supply | Arbitrum is issuance canonical |
| AXAU canonical reserve | Arbitrum/Ethereum anchor |
| Solvency / disclosure source | Arbitrum + Axiom control plane |
| Policy decisions | Arbitrum/capinfra control plane |
| Governance | Arbitrum governance contracts |

---

## 8. Risk Areas if Polygon Is Added Carelessly

| Risk | Description | Severity |
|---|---|---|
| R01 — SIWE fork | Adding Polygon to wagmiConfig without guarding SIWE chain check | HIGH — breaks auth |
| R02 — Supply confusion | Any mint/issuance on Polygon creating parallel supply | HIGH — solvency impact |
| R03 — Identity confusion | Polygon ID credentials treated as canonical | HIGH — KYC bypass risk |
| R04 — Onramp chain mismatch | Card onramp funds landing on Polygon without user expectation set | HIGH — UX/compliance |
| R05 — Flag leak | Polygon code paths running without CHAIN_POLYGON_ENABLED=true | MEDIUM — unexpected behavior |
| R06 — RPC failure | Missing POLYGON_RPC_URL causing build-time or runtime errors | LOW — already guarded by getPolygonRpcUrl() returning null |
| R07 — Reconciliation gap | Polygon treasury movements not reconciled back to Arbitrum ledger | HIGH — audit integrity |

---

## 9. Summary Assessment

| Area | Assessment |
|---|---|
| lib/chains/ scaffold | COMPLETE — no changes needed for Phase 3 foundation |
| Feature flags | PARTIAL — POLYGON_IDENTITY_BRIDGE exists; payments flag not yet distinct |
| Contract registry | COMPLETE — all-null Polygon section correct and present |
| Documents | GAPS — Phase 3 blueprint, decision memo, payments design not yet created |
| shared/contracts-polygon.ts | MISSING — create placeholder file |
| capinfra adapter | NOT STARTED — future phase |
| Hardhat config | NOT STARTED — no contracts to deploy yet |

---

*Axiom Protocol Internal — Polygon Phase 3 Discovery — 2026-05-14*  
*Arbitrum One remains canonical. Polygon is disabled by default. No contracts deployed.*
