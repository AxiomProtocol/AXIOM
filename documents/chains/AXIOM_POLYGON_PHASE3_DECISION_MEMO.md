# Axiom Protocol — Polygon Phase 3 Architecture Decision Memo

**Document type:** Phase C — Architecture Decision  
**Phase:** Polygon Phase 3 — Foundation and Architecture  
**Created:** 2026-05-14  
**Status:** DECIDED — see §6  

---

## 1. Decision Question

> Which Polygon path should Axiom Protocol pursue for Phase 3, and what should
> the initial implementation look like?

---

## 2. Options Evaluated

### Option A — Polygon PoS only

Start with Polygon Proof-of-Stake mainnet (chainId 137) as a USDC payment
and treasury routing layer. No zkEVM, no AggLayer. Simple EVM compatibility
via ethers.js / viem. No new smart contracts initially — USDC native on Polygon
is the settlement token; the control plane manages all logic.

**Pros:**
- Simplest implementation path — identical EVM tooling to Arbitrum
- Native USDC on Polygon PoS (Circle-issued, `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`)
- No new SDK, no ZK prover, no bridge complexity
- Fast time-to-value for payment routing experiments
- Direct fit with `lib/chains/` existing PoS config (chainId 137)
- Existing `getPolygonRpcUrl()` and capability flags already target PoS
- Maximum compatibility with Coinbase Onramp USDC delivery
- Low audit surface — no new Axiom contracts, USDC contract is Circle's
- `lib/chains/providers.ts` already has `POLYGON_RPC_URL` env and Alchemy `matic` network

**Cons:**
- PoS has some centralization risk vs zkEVM (but irrelevant at Phase 3 — no contracts)
- Not ZK-verifiable without additional work (future concern, not Phase 3)
- USDC.e (bridged) vs native USDC education required for any future user-facing work

**Complexity:** LOW  
**Repo fit:** EXCELLENT (existing scaffold targets PoS chainId 137)  
**Payment utility:** HIGH  
**Stablecoin compatibility:** EXCELLENT (native USDC)  
**Compliance complexity:** LOW (read-only / routing only at Phase 3)  
**Reconciliation complexity:** MEDIUM (standard EVM receipt + event reading)  
**Risk to current build:** NONE (feature-flagged, disabled by default)  
**Near-term value:** HIGH  

---

### Option B — Polygon zkEVM or AggLayer-oriented path

Build toward Polygon zkEVM (chainId 1101) or plan for AggLayer-connected
L2 behavior. This would require ZK-compatible tooling, different RPC
infrastructure, and a different approach to identity (zkProofs vs ERC-3643
attestation).

**Pros:**
- ZK-verifiable transactions — stronger privacy posture
- AggLayer future-proofs for cross-chain liquidity aggregation
- Better finality guarantees than PoS if ZK proofs complete

**Cons:**
- Polygon zkEVM is a separate chain (chainId 1101) — requires entirely different
  config than the existing PoS scaffold
- AggLayer is still maturing — not production-ready for mission-critical payments
- No existing repo scaffold for zkEVM
- ZK prover infrastructure is complex and expensive
- Native USDC on zkEVM is limited vs PoS supply
- Polygon ID ZK proof integration requires heavy SDK dependency
- Compliance complexity significantly higher — ZK proofs interact differently
  with KYC claim verification than standard attestation
- Much longer time-to-value — estimated additional 2-3 months before useful

**Complexity:** HIGH  
**Repo fit:** POOR (no existing zkEVM scaffold; would diverge from current config)  
**Payment utility:** MEDIUM (USDC supply thinner on zkEVM)  
**Stablecoin compatibility:** LIMITED (native USDC mostly on PoS)  
**Compliance complexity:** HIGH  
**Reconciliation complexity:** HIGH  
**Risk to current build:** LOW–MEDIUM (would require new config files)  
**Near-term value:** LOW  

---

### Option C — No contract deployment yet; payments / read-only USDC rail first

Start with zero on-chain Polygon presence: build only the control plane
awareness of Polygon as a settlement destination. Read USDC balances,
build capinfra POLYGON adapter in DRY_RUN mode, design reconciliation.
No contracts, no live payment execution — pure infrastructure readiness.

**Pros:**
- Zero risk to current build
- Builds correct mental model of Polygon before any live code
- Forces proper capinfra adapter design before rushed implementation
- No mainnet keys needed during Phase 3
- Infrastructure readiness is the correct precursor to Option A

**Cons:**
- No live payment value in isolation
- Does not validate end-to-end payment flow
- Delays practical utility

**Complexity:** VERY LOW  
**Repo fit:** PERFECT (this is what Phase 3 specifically is)  
**Payment utility:** ZERO (by design — readiness, not execution)  
**Stablecoin compatibility:** N/A  
**Compliance complexity:** NONE  
**Reconciliation complexity:** NONE (design only)  
**Risk to current build:** NONE  
**Near-term value:** MEDIUM (infrastructure value; no user-facing value)  

---

## 3. Option Comparison Summary

| Criterion | Option A (PoS) | Option B (zkEVM) | Option C (Read-only) |
|---|---|---|---|
| Complexity | Low | High | Very Low |
| Repo fit | Excellent | Poor | Perfect |
| Payment utility | High | Medium | None (by design) |
| USDC compatibility | Excellent | Limited | N/A |
| Compliance complexity | Low | High | None |
| Reconciliation complexity | Medium | High | None |
| Risk to current build | None | Low–Medium | None |
| Near-term value | High | Low | Medium |
| Time to useful | Fast | Slow (2–3 mo extra) | Immediate (read-only) |

---

## 4. Dependencies Before Any Option Can Go Live

Regardless of option chosen, the following must be satisfied before any
live Polygon payment execution:

| Dependency | Required For |
|---|---|
| Capinfra POLYGON adapter (DRY_RUN first) | All live Polygon payment options |
| `capSettlementTypeEnum` migration adding POLYGON | All capinfra routing |
| `shared/contracts-polygon.ts` with live addresses | Any contract interaction |
| Polygon RPC URL in staging environment | Any live testing |
| Reconciliation cron for Polygon | Any live payment |
| Solvency model update acknowledging Polygon balances | Audit integrity |
| Legal review of Polygon-settled payments | Compliance posture |
| No ACH, no banking rails on Polygon side | Deferred constraint |

---

## 5. Risks in Any Path

| Risk | Mitigation |
|---|---|
| SIWE chain gate must not be modified | `assertArbitrumOne.ts` stays untouched |
| Polygon USDC.e (bridged) confusion | Use native USDC only (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`) |
| Polygon supply counted as canonical AXUSD | Never — Polygon holds USDC only |
| Phase 3 scaffold scope creep into live code | Strict flag gating — `CHAIN_POLYGON_ENABLED=true` never set in production |
| AML risk of USDC routing on Polygon | Control plane authorization pre-screens all recipients |

---

## 6. Recommendation and Decision

**RECOMMENDED PATH: Option C first, then Option A**

Phase 3 (this task) executes **Option C**:
- Non-custodial, read-only / routing-aware Polygon PoS foundation
- No smart contracts deployed
- No live payments
- Scaffold, flags, contracts-polygon.ts placeholder, and design documents only
- `CHAIN_POLYGON_ENABLED` remains `false` in all deployed environments

Phase 4 (future task) executes **Option A**:
- Polygon PoS payment routing — DRY_RUN capinfra POLYGON adapter
- USDC native on Polygon as settlement token
- Capinfra migration adding POLYGON settlement type
- Full reconciliation model before any LIVE dispatch
- End-to-end smoke test on Polygon Mumbai testnet (or Amoy testnet) before mainnet

**Option B is deferred indefinitely.** AggLayer / zkEVM adds significant
complexity with no near-term value for Axiom's payment use cases. The PoS
chain has all the USDC liquidity and tooling parity needed. Reconsider
only if ZK-verifiable payments become a compliance requirement.

---

## 7. Decision Record

| Field | Value |
|---|---|
| Decision | Option C (Phase 3) → Option A (Phase 4) |
| Decided | 2026-05-14 |
| Decided by | Protocol Operator |
| Expiry | Revisit at Phase 4 start |
| Arbitrum canonical status | UNCHANGED |
| Avalanche pilot | UNCHANGED |
| Polygon mainnet deployment | NONE — Phase 3 is architecture only |

---

*Axiom Protocol Internal — Polygon Phase 3 Decision Memo — 2026-05-14*
