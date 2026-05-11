# Axiom Protocol — Avalanche Phase 1 Contract Plan

**Status:** Draft  
**Target Network:** Avalanche C-Chain (43114) / Fuji (43113)  
**Created:** 2026-05-11

---

## Phase 1 Scope

Phase 1 establishes the minimum viable contract infrastructure on Avalanche C-Chain
to enable AXUSD issuance and AXAU reserve management.

### Contracts in Scope

| # | Contract | Inherits / Standard | Dependency |
|---|---|---|---|
| 1 | `IdentityRegistry` | ERC-3643 | — |
| 2 | `Compliance` | ERC-3643 | IdentityRegistry |
| 3 | `AXUSD` | ERC-20 + mintable | Compliance |
| 4 | `LandNAVOracle` | Chainlink AggregatorV3 | — |
| 5 | `AXAU` | ERC-20 + mintable | LandNAVOracle, Compliance |
| 6 | `Treasury` | Multi-party vault | AXUSD, AXAU |

### Out of Scope (Phase 2+)

- Staking / emissions (AXM)
- PSM (Peg Stability Module)
- Cross-chain bridge receiver
- Lending market integration (Benqi/Aave V3)

---

## Deployment Order

```
IdentityRegistry → Compliance → AXUSD
                                     ↘
LandNAVOracle ──────────────── AXAU → Treasury
```

---

## Address Manifest

Addresses are persisted to `deployments/avalanche/fuji-phase1.json` by the deploy
script. See `deployments/avalanche/fuji-phase1.template.json` for the schema.

---

## Verification

All contracts must be verified on Snowtrace (Routescan) via:

```bash
npx hardhat verify --config hardhat.avalanche.ts \
  --network avalancheFuji <address> [constructor-args]
```

Requires `SNOWTRACE_API_KEY` environment variable.

---

## Gas Budget (Fuji Estimates)

| Contract | Estimated Deploy Gas |
|---|---|
| IdentityRegistry | ~800,000 |
| Compliance | ~400,000 |
| AXUSD | ~1,200,000 |
| LandNAVOracle | ~300,000 |
| AXAU | ~1,200,000 |
| Treasury | ~600,000 |
| **Total** | **~4,500,000** |

At Fuji gas prices (~25 nAVAX), total cost ≈ 0.11 AVAX.
