# Axiom Protocol — Multi-Chain Expansion Readiness Report

**Generated:** April 5, 2026  
**Status:** Research Phase — All chains in `researching` state  
**Author:** Agent research pass — full repo inspection + public knowledge synthesis

---

## Executive Summary

Axiom Protocol has a fully prepared multi-chain expansion scaffolding in place. The chain registry, feature flags, DB tables, service abstractions, API routes, and this documentation framework are all built. No integration is live except Arbitrum One (core execution). This report defines exactly what is needed to proceed, per chain.

---

## Current State (What Is Built)

| Component | Status | Files |
|-----------|--------|-------|
| Chain Registry | Built | `lib/multichain/chainRegistry.ts` |
| Feature Flags | Built | `lib/multichain/featureFlags.ts` |
| DB Schema (5 tables) | Live in DB | `shared/expansionSchema.ts` |
| Service Layer (6 services) | Built | `lib/multichain/*.ts` |
| API Routes (7 routes) | Built | `pages/api/infrastructure/*.ts` |
| Integration Readiness Model | Built | `lib/multichain/IntegrationReadinessModel.ts` |
| Docs Framework (this) | Built | `docs/integrations/` |

---

## Chain-by-Chain Status

### POLYGON — Identity Bridge

| Dimension | State |
|-----------|-------|
| Role | Identity bridge + credential expansion |
| Status | Researching |
| Feature flag | `ENABLE_POLYGON_IDENTITY_BRIDGE` (disabled) |
| EVM compatible | Yes (chainId 137) |
| RPC available | Yes (Alchemy polygon-mainnet) |
| SDK reviewed | No — @polygon-id/js-sdk needed |
| Docs attached | No — docs.id.polygon.technology |
| Architecture decided | No — ZK (Polygon ID) vs ONCHAINID mirror vs allowlist |
| Partnership required | No |
| Time to implement (once unblocked) | 4-8 weeks |

**Top 3 blockers:**
1. Collect @polygon-id/js-sdk and review
2. Make architecture decision (ZK vs mirror vs allowlist)
3. Collect Polygon ID issuer node documentation

**What is ready now:** RPC endpoint (Alchemy polygon-mainnet, same API key), Hardhat network config extension (trivial), ERC-3643 credential schema (reuse from Arbitrum), `expansion_identity_bridges` DB table.

---

### AVALANCHE — Capital Deployment Zone

| Dimension | State |
|-----------|-------|
| Role | Compliance-aware capital deployment environment |
| Status | Researching |
| Feature flag | `ENABLE_AVALANCHE_CAPITAL_ENV` (disabled) |
| EVM compatible | Yes (C-Chain chainId 43114) |
| RPC available | Yes (Alchemy avax-mainnet) |
| SDK reviewed | No — @avalabs/avalanchejs needed |
| Docs attached | No — docs.avax.network/subnets |
| Architecture decided | No — C-Chain only vs custom Subnet |
| Partnership required | No (C-Chain); validator agreement needed (Subnet) |
| Time to implement (once unblocked) | 4-8 weeks (C-Chain); 12-20 weeks (Subnet) |

**Top 3 blockers:**
1. Make C-Chain vs Subnet architecture decision
2. Define which capital programs move to Avalanche
3. Collect AvalancheJS SDK and subnet documentation

**What is ready now:** RPC endpoint (Alchemy avax-mainnet), C-Chain EVM deployment via existing Hardhat (minor config extension), `expansion_rail_integrations` DB table, AllowList precompile design (documented).

---

### STELLAR — Payments Rail

| Dimension | State |
|-----------|-------|
| Role | External payments rail + remittance corridors |
| Status | Researching |
| Feature flag | `ENABLE_STELLAR_PAYMENTS_RAIL` (disabled) |
| EVM compatible | No (non-EVM) |
| SDK available | @stellar/stellar-sdk (npm) |
| Docs available | developers.stellar.org (public) |
| Architecture decided | Partially — AXUSD → USDC → Stellar anchor; anchor not selected |
| Partnership required | YES — anchor partner required |
| Time to implement (once anchor selected) | 6-10 weeks |

**Top 3 blockers:**
1. Select anchor partner (MoneyGram, Circle, Bitso — business decision)
2. Collect @stellar/stellar-sdk and review
3. Define payment corridors (which countries/currencies)

**What is ready now:** Stellar SDK is on npm (public, no partnership needed), SEP specs are public GitHub docs, Circle USDC on Stellar is live, Horizon API is public. The entire technical stack can be reviewed and the `StellarPaymentAdapter` can be built — only the anchor partner relationship is missing to go live.

**Important:** Stellar is the most actionable near-term expansion target. Once anchor partner is selected, implementation is straightforward.

---

### CANTON — Institutional Bridge

| Dimension | State |
|-----------|-------|
| Role | Institutional-grade finance interoperability bridge |
| Status | Researching |
| Feature flag | `ENABLE_CANTON_INSTITUTIONAL_BRIDGE` (disabled) |
| EVM compatible | No (DAML on participant nodes) |
| SDK reviewed | No — DAML SDK required |
| Partner agreement | No — Digital Asset agreement required |
| DAML expertise | No — none in current codebase |
| Architecture decided | Partially — participant bridge concept defined |
| Partnership required | YES — participant agreement with Digital Asset REQUIRED |
| Time to implement | 12-24 months from partnership initiation |

**Top 3 blockers:**
1. Initiate contact with Digital Asset (canton.network) — this is a business relationship
2. Obtain DAML expertise (train team or engage specialist)
3. Sign Canton participant agreement

**What is ready now:** Integration architecture defined, DB tables ready (`expansion_institutional_connectors`), connector descriptor modeled in `InstitutionalBridgeService`. Canton is architecturally designed — execution requires partnership.

---

### COSMOS — Sovereign Future

| Dimension | State |
|-----------|-------|
| Role | Sovereign infrastructure — Axiom-native chain or IBC hub |
| Status | Researching |
| Feature flag | `ENABLE_COSMOS_SOVEREIGN_PREP` (disabled) |
| EVM compatible | Optional (via Ethermint/evmOS) |
| SDK reviewed | No — Cosmos SDK (Go) + CosmJS (TS) needed |
| Architecture decided | No — appchain vs IBC hub |
| Go expertise | No — none in current codebase |
| Partnership required | No (public chain) |
| Time to implement | 18-36 months |

**Top 3 blockers:**
1. Make appchain vs IBC hub architecture decision
2. Acquire Go development expertise
3. Define AXM validator economics model

**What is ready now:** Architecture documented, `expansion_sovereign_readiness` DB table, `SovereignChainService` service layer, CosmJS (TypeScript) can be reviewed without Go expertise. This is a long-term track — preparation work can happen in parallel with near-term targets.

---

## Priority Implementation Order

| Priority | Chain | Rationale | Partnership Required |
|---------|-------|-----------|---------------------|
| 1 | Stellar | Highest near-term impact, anchor partner is only blocker | YES (anchor) |
| 2 | Polygon | EVM tooling familiar, no partnership needed, clear use case | No |
| 3 | Avalanche | EVM familiar, high institutional value, C-Chain path is fast | No |
| 4 | Canton | High strategic value, 12-24 month track | YES (Digital Asset) |
| 5 | Cosmos | Sovereign future, 18-36 month track | No (but Go expertise) |

---

## Artifacts Still Required (Complete List by Chain)

### Stellar (anchor partner is the gate)
- [ ] Anchor partner agreement (MoneyGram / Circle / Bitso — business decision)
- [ ] @stellar/stellar-sdk — npm install + review (1-2 hours)
- [ ] SEP-0024 spec — public GitHub download (30 minutes)
- [ ] SEP-0031 spec — public GitHub download (30 minutes)
- [ ] Payment corridor definition (which countries/currencies)

### Polygon (architecture decision is the gate)
- [ ] Architecture decision: ZK vs mirror vs allowlist bridge
- [ ] @polygon-id/js-sdk — npm install + review (4-8 hours)
- [ ] Polygon ID issuer node documentation (1-2 hours, public)
- [ ] iden3 circuits review (optional for ZK path)

### Avalanche (architecture decision is the gate)
- [ ] Architecture decision: C-Chain only vs Subnet
- [ ] @avalabs/avalanchejs — npm install + review (4-8 hours)
- [ ] Avalanche Subnet docs — public (1-2 hours)
- [ ] Subnet-EVM source — if Subnet path chosen
- [ ] Validator infrastructure plan — if Subnet path chosen

### Canton (partnership is the gate — everything else follows)
- [ ] Digital Asset contact initiation
- [ ] Canton participant agreement
- [ ] DAML SDK installation and learning
- [ ] DAML expertise acquisition
- [ ] DAML Hub evaluation for managed participant

### Cosmos (architecture decision + Go expertise are the gates)
- [ ] Appchain vs IBC hub architecture decision
- [ ] Go development expertise acquisition
- [ ] Cosmos SDK review (docs.cosmos.network)
- [ ] CosmJS TypeScript client review (can do now)
- [ ] AXM validator economics design
- [ ] Legal review of AXM token classification for PoS staking

---

## What Can Be Done Immediately Without Any Manual Input

1. Install and review `@stellar/stellar-sdk` — no partnership needed
2. Install and review `@polygon-id/js-sdk` — no partnership needed
3. Read Polygon ID docs (public) — no partnership needed
4. Read Stellar SEP-0024 / SEP-0031 specs (public GitHub) — no partnership needed
5. Read Avalanche Subnet docs (public) — no partnership needed
6. Install and review `@avalabs/avalanchejs` — no partnership needed
7. Install and review `@cosmjs/stargate` — no partnership needed
8. Read Cosmos SDK overview (public) — no partnership needed
9. Reach out to Digital Asset (canton.network) — business contact

Items 1-8 are technical and can begin immediately. Item 9 is the most important business action.
