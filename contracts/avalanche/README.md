# contracts/avalanche/

Solidity contracts targeting Avalanche C-Chain (Phase 2 — ERC-3643 suite).

## Status

Phase 2 contracts complete. All 8 contracts authored and test-covered.
Deployment to Fuji testnet is gated behind `AVALANCHE_PHASE2_REAL_DEPLOY=true`.

## Phase 2 Contracts (ERC-3643 suite)

| Contract | Standard | Purpose |
|---|---|---|
| `IdentityRegistryStorage.sol` | ERC-3643 | On-chain investor identity + country storage |
| `TrustedIssuersRegistry.sol` | ERC-3643 | Registry of approved KYC claim issuers |
| `ClaimTopicsRegistry.sol` | ERC-3643 | Registry of required claim topics for compliance |
| `IdentityRegistry.sol` | ERC-3643 | Main KYC registry — wires storage + issuers + topics |
| `ModularCompliance.sol` | ERC-3643 | Pluggable compliance engine |
| `CountryAllowModule.sol` | ERC-3643 module | Country allowlist compliance check |
| `TransferLimitModule.sol` | ERC-3643 module | Per-wallet daily transfer limit |
| `AxiomStable3643Fuji.sol` | ERC-3643 + ERC-20 | AXUSD stablecoin — KYC-gated, compliance-enforced |

### Deploy order (dependency chain)

```
1. IdentityRegistryStorage
2. TrustedIssuersRegistry
3. ClaimTopicsRegistry
4. IdentityRegistry        (deps: 1, 2, 3)
5. ModularCompliance
6. CountryAllowModule
7. TransferLimitModule
8. AxiomStable3643Fuji     (deps: 4, 5)
```

### Supporting files

| File | Purpose |
|---|---|
| `AbstractModule.sol` | Base class for compliance modules (bindCompliance, hooks) |
| `interfaces/IModule.sol` | Module interface |
| `interfaces/IModularCompliance.sol` | Compliance engine interface |
| `interfaces/IIdentityRegistry.sol` | Identity registry interface |

## Compilation

Compilation runs from the isolated `hardhat-avalanche/` subdirectory
(its own `"type":"module"` package.json satisfies Hardhat 3's ESM requirement).

```bash
npm run compile:avalanche
```

Artifacts output to `artifacts/avalanche/` (isolated from Arbitrum artifacts).

## Testing

```bash
npm run test:avalanche
```

Tests live in `test/avalanche/AxiomStable3643Fuji.test.ts`.

## Deployment

```bash
# Dry-run (safe default — no transactions broadcast)
npm run deploy:avalanche:fuji

# Real broadcast to Fuji (requires env vars)
AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji
```

### Required env vars for real deploy

```
AVALANCHE_DEPLOYER_PRIVATE_KEY  funded Fuji-only deployer key
MULTICHAIN_ENABLED=true
CHAIN_AVALANCHE_ENABLED=true
AVALANCHE_PHASE2_REAL_DEPLOY=true
```

See `documents/chains/AXIOM_AVALANCHE_FUJI_ENV.md` for full documentation.

## Verification (Snowtrace)

```bash
cd hardhat-avalanche
npx hardhat verify --network avalancheFuji <address> [constructor-args...]
```

## Security notes

- Contracts are **non-upgradeable** (Fuji Phase 2 scope).
- Avalanche is **disabled by default** in production (`CHAIN_AVALANCHE_ENABLED` not set).
- The deploy script blocks mainnet (chainId 43114) — Fuji (43113) only.
- `AVALANCHE_DEPLOYER_PRIVATE_KEY` must be a separate Fuji-only key.
