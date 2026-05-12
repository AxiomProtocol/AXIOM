# Axiom Protocol — Avalanche Fuji Deployment Checklist

**Network:** Avalanche Fuji Testnet (chainId 43113)  
**Updated:** 2026-05-12 (Phase 2 — 8-contract ERC-3643 deploy)

Use this checklist before promoting a Fuji deployment to Avalanche C-Chain mainnet.

---

## Pre-Deployment

- [ ] `AVALANCHE_DEPLOYER_PRIVATE_KEY` is set (Fuji-only funded key, separate from `DEPLOYER_PRIVATE_KEY`)
- [ ] `MULTICHAIN_ENABLED=true` is set in environment
- [ ] `CHAIN_AVALANCHE_ENABLED=true` is set in environment
- [ ] `AVALANCHE_RPC_URL` or `AVALANCHE_FUJI_RPC_URL` is set
- [ ] Deployer wallet has AVAX balance on Fuji (get from https://faucet.avax.network)
- [ ] `SNOWTRACE_API_KEY` is set for post-deploy verification
- [ ] Compile cleanly: `npm run compile:avalanche` (from workspace root — 12 Solidity files, solc 0.8.24, evm paris)
- [ ] Tests pass: `npm run test:avalanche` (14/14 ERC-3643 Mocha tests green)
- [ ] Dry-run passes cleanly: `npm run deploy:avalanche:fuji` (should print 8 simulated addresses)
- [ ] Deployment manifest template reviewed: `deployments/avalanche/fuji-phase1.template.json`

---

## Deployment Execution

- [ ] Run real deploy: `AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji`
- [ ] No errors in deploy output
- [ ] Manifest written to `deployments/avalanche/fuji-phase1.json`
- [ ] Deployer address matches expected wallet
- [ ] All 8 contract addresses are non-empty in manifest
- [ ] All 7 wiring steps confirmed in manifest

### 8-contract addresses confirmed (from fuji-phase1.json):
- [ ] IdentityRegistryStorage — address populated, tx confirmed on Snowtrace
- [ ] TrustedIssuersRegistry  — address populated, tx confirmed on Snowtrace
- [ ] ClaimTopicsRegistry     — address populated, tx confirmed on Snowtrace
- [ ] IdentityRegistry        — address populated, tx confirmed on Snowtrace
- [ ] ModularCompliance       — address populated, tx confirmed on Snowtrace
- [ ] CountryAllowModule      — address populated, tx confirmed on Snowtrace
- [ ] TransferLimitModule     — address populated, tx confirmed on Snowtrace
- [ ] AxiomStable3643Fuji     — address populated, tx confirmed on Snowtrace

---

## Post-Deployment Wiring Verification

- [ ] `IdentityRegistryStorage.owner()` == IdentityRegistry address
- [ ] `ModularCompliance.getTokenBound()` == AxiomStable3643Fuji address
- [ ] `ModularCompliance.getModules()` includes CountryAllowModule and TransferLimitModule
- [ ] `CountryAllowModule.isComplianceBound(ModularCompliance)` == true
- [ ] `TransferLimitModule.isComplianceBound(ModularCompliance)` == true
- [ ] `IdentityRegistry.isAgent(deployer)` == true
- [ ] `IdentityRegistry.isVerified(deployer)` == true

---

## Post-Deployment Snowtrace Verification

```bash
# All verification commands run from workspace root
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <IdentityRegistryStorage-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <TrustedIssuersRegistry-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <ClaimTopicsRegistry-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <IdentityRegistry-address> \
  <IdentityRegistryStorage-address> <TrustedIssuersRegistry-address> <ClaimTopicsRegistry-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <ModularCompliance-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <CountryAllowModule-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <TransferLimitModule-address>
hardhat verify --config hardhat.avalanche.config.mts --network avalancheFuji <AxiomStable3643Fuji-address> \
  <IdentityRegistry-address> <ModularCompliance-address> \
  "Axiom Stable USD" "AXUSD" 6 <deployer-address>
```

- [ ] All 8 contracts verified on Snowtrace

---

## Update Registry

- [ ] Update `shared/contracts-avalanche.ts` FUJI_CONTRACTS with deployed addresses
- [ ] Commit and push addresses to repository

---

## Smoke Tests

- [ ] `AxiomStable3643Fuji.mint(deployer, 1000e6)` succeeds (deployer is verified + has MINTER_ROLE)
- [ ] `AxiomStable3643Fuji.transfer(user, 100e6)` fails if user is not registered in IdentityRegistry
- [ ] Register user in IdentityRegistry, transfer succeeds
- [ ] `AxiomStable3643Fuji.pause()` blocks transfers, `unpause()` restores them
- [ ] `TransferLimitModule.setTransferLimit(compliance, limit)` enforced on transfer
- [ ] Capinfra `AVALANCHE` adapter DRY_RUN dispatch returns expected receipt
- [ ] Capinfra `AVALANCHE` adapter LIVE dispatch mints on Fuji (AXUSD allowlisted)

---

## Mainnet Promotion Gate

All of the following must be true before deploying to Avalanche mainnet (43114):

- [ ] All Fuji checklist items above are complete
- [ ] Security review of Phase 2 contracts is signed off
- [ ] Multi-party authorization wallet (Gnosis Safe on Avalanche) is funded
- [ ] Mainnet deployer key (separate from Fuji key) is prepared and secured
- [ ] Disclosure documents updated to include Avalanche C-Chain network
- [ ] `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` populated post-deploy
