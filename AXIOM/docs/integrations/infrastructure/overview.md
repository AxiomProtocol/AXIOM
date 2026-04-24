# Infrastructure Integration Overview

This document summarizes Axiom Protocol's current integration infrastructure and how it extends across the multi-chain expansion targets.

---

## Current Production Infrastructure (Arbitrum One)

| Layer | Component | Status | Technology |
|-------|-----------|--------|-----------|
| L00 — Banking | Increase (ACH/wire) | Live | REST API |
| L00 — Custody | BitGo CaaS | Live (activated) | REST API |
| L01 — Settlement | AXUSD (ERC-3643) | Live | Solidity / Arbitrum |
| L01 — PSM | Canonical PSM (ERC-3643 gated) | Live | Solidity / Arbitrum |
| L01.5 — DEX | Camelot V2/V3 | Live (read-only integration) | Subgraph / EVM |
| L01.5 — Lending | Euler V2 | Live (configured) | EVM |
| L02 — Reserve | AXAU (PAXG-backed) | Live | Solidity / Arbitrum |
| L02 — Oracle | LandNAVOracle | Live | Solidity / Arbitrum |
| L03 — Capital | Lending Fund (Reg D 506(c)) | Formation | DB / Arbitrum |
| L04 — Intelligence | MIRDT, Sentinel, AME | Live (internal) | DB / AI |
| L05 — Trust | ERC-3643 identity | Live | Solidity / Arbitrum |
| Identity bridge | ONCHAINID (T-REX) | Live | Solidity / Arbitrum |
| Auth | Auth0 + SIWE | Live | Cloud |
| Email | Resend | Live | REST API |
| AI | Gemini (Google) | Live | REST API |
| Compliance | Circle compliance screening | Configured | REST API |
| Onramp | Coinbase onramp | Configured | Widget |

---

## RPC Provider Configuration

| Chain | Network Slug | Status |
|-------|-------------|--------|
| Arbitrum One | `arb-mainnet` | Live (primary) |
| Ethereum Mainnet | `eth-mainnet` | Available (reserve reference) |
| Polygon | `polygon-mainnet` | Available (not yet used) |
| Avalanche C-Chain | `avax-mainnet` | Available (not yet used) |
| Optimism | `opt-mainnet` | Available (not yet used) |

All above via the same `ALCHEMY_API_KEY` environment variable. No additional credential required to add Polygon or Avalanche RPC — only code changes needed.

---

## Hardcoded Arbitrum Assumptions to Abstract (When Needed)

| File | Hardcoded Value | Impact |
|------|----------------|--------|
| `lib/services/ERC3643Service.ts` | `arb-mainnet.g.alchemy.com` URL | Arbitrum-only identity service |
| `lib/config.ts` `getArbitrumRpcUrl()` | Always returns Arbitrum RPC | Any service using this can't use other chains |
| `lib/circle/walletClient.ts` | `blockchains = ['ARB']` | Circle wallet creation is Arbitrum-only |
| `lib/circle/complianceEngine.ts` | `chain = 'ARB'` default | Circle compliance defaults to Arbitrum |
| `src/config/activeContracts.generated.ts` | All contract addresses | All contracts are Arbitrum addresses |
| `lib/onramp/config.ts` | `cbNetworkMap` has `42161: 'arbitrum'` as primary | Onramp defaults to Arbitrum |

**Strategy:** Do NOT refactor these now. Arbitrum remains the core execution layer. Abstract only when a specific expansion rail requires it. Add a `getChainRpcUrl(chainSlug: string)` helper to `lib/config.ts` when the first expansion chain needs RPC access.

---

## BitGo Multi-Chain Status

BitGo CaaS is Axiom's institutional crypto custody layer. Key questions for expansion:

| Chain | BitGo Support | Verify |
|-------|--------------|--------|
| Arbitrum (ARBETH) | Live — confirmed | N/A |
| Ethereum | Yes — confirmed | N/A |
| Polygon (MATIC) | Verify | Check BitGo API coins list |
| Avalanche (AVAXC) | Verify | Check BitGo API coins list |
| Stellar (XLM) | Verify | Check BitGo API coins list |
| Cosmos (ATOM) | Verify | Check BitGo API coins list |

**Action:** Query `GET /api/v2/wallet` BitGo endpoint with each chain to verify support.

---

## Circle Integration Status

Circle is used for:
1. `lib/circle/walletClient.ts` — Programmable wallets (currently Arbitrum/ARB)
2. `lib/circle/complianceEngine.ts` — Address compliance screening

| Chain | Circle Compliance Support | Circle Wallet Support |
|-------|--------------------------|----------------------|
| Arbitrum | Yes (chain='ARB') | Yes |
| Polygon | Verify 'POLYGON' | Verify |
| Avalanche | Verify 'AVAX' | Verify |
| Stellar | Verify 'XLM' | Different product line |

---

## Monitoring and Alerting Infrastructure

| Component | Current | Expansion Needs |
|-----------|---------|-----------------|
| Chain health | Arbitrum via Alchemy | Add per-chain health endpoints |
| Event monitoring | Alchemy Notify (Arbitrum) | Add Polygon/Avax if Alchemy supports |
| Payment tracking | Internal DB + Increase webhooks | Add Stellar SSE tracking |
| Error logging | `lib/errorLogger.ts` | Chain-aware error context |
