# contracts/avalanche/

Solidity contracts targeting Avalanche C-Chain.

## Status

Phase 1 contract authoring is in progress. Contracts will be added here as they are
ported or newly written for the Avalanche deployment.

## Planned Phase 1 Contracts

| Contract | Standard | Purpose |
|---|---|---|
| `IdentityRegistry.sol` | ERC-3643 | KYC/identity compliance |
| `Compliance.sol` | ERC-3643 | Compliance module |
| `AXUSD.sol` | ERC-20 | AXUSD stablecoin (mintable + compliance-gated) |
| `LandNAVOracle.sol` | Chainlink-compatible | Land NAV price feed |
| `AXAU.sol` | ERC-20 | AXAU gold reserve instrument |
| `Treasury.sol` | — | Protocol treasury vault |

## Compilation

```bash
npx hardhat compile --config hardhat.avalanche.ts
```

Artifacts output to `artifacts_avalanche/` (isolated from Arbitrum artifacts).

## Deployment

```bash
# Fuji testnet
npm run deploy:avalanche:fuji

# Mainnet (after Fuji validation)
npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
  --config hardhat.avalanche.ts --network avalanche
```

## Verification

```bash
npx hardhat verify --config hardhat.avalanche.ts --network avalancheFuji <address> <constructor-args>
```

Verification is powered by Routescan (Snowtrace). Set `SNOWTRACE_API_KEY` in your environment.
