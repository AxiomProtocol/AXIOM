# Axiom Protocol — Avalanche C-Chain Phase 1 Discovery

**Status:** In Progress  
**Target Network:** Avalanche C-Chain (43114) / Fuji testnet (43113)  
**Created:** 2026-05-11

---

## Overview

This document captures the discovery research for Axiom Protocol's expansion to
Avalanche C-Chain. The integration targets an EVM-compatible deployment of the
core AXUSD, AXAU, and treasury infrastructure.

---

## Why Avalanche C-Chain

| Factor | Assessment |
|---|---|
| EVM compatibility | Full — existing Solidity contracts require minimal modification |
| Throughput | ~4,500 TPS, sub-2s finality |
| Finality model | Snowman consensus — probabilistic finality, PoS-backed |
| Gas token | AVAX (18 decimals) |
| Ecosystem | DeFi-native: Trader Joe, Aave V3, Benqi |
| Regulatory posture | Avalanche Foundation is US-headquartered |

---

## Key Differences from Arbitrum One

| Property | Arbitrum One | Avalanche C-Chain |
|---|---|---|
| Chain ID | 42161 | 43114 |
| Testnet | Arbitrum Sepolia (421614) | Fuji (43113) |
| L2/L1 relationship | L2 rollup on Ethereum | L1 (own consensus) |
| Block time | ~250ms | ~2s |
| EIP-1559 | Yes | Yes |
| Contract explorer | Blockscout / Arbiscan | Snowtrace (Routescan) |

---

## Capinfra Integration

A dedicated `AVALANCHE` settlement adapter has been added to capinfra:

- Kind: `AVALANCHE`
- Env var: `AVALANCHE_ADAPTER_MODE` (DRY_RUN | LIVE | DISABLED)
- Env var: `AVALANCHE_RPC_URL` (required for LIVE)
- Env var: `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` (comma-separated asset symbols)
- Supported action types: MINT, REDEEM, TRANSFER
- Supported chain IDs (LIVE): 43114 (mainnet), 43113 (Fuji)

---

## Open Questions

- [ ] Will AXUSD on Avalanche use CCTP (Circle) or a custom bridge?
- [ ] PSM pair: USDC.e or native USDC (CCTP-minted)?
- [ ] AXAU oracle: Chainlink AVAX price feed or LandNAVOracle port?
- [ ] Multi-party authorization wallet: Gnosis Safe on Avalanche?
- [ ] Cross-chain AXM governance: snapshot-only or on-chain vote aggregation?
