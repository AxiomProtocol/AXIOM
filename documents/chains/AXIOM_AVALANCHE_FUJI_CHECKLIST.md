# AXIOM AVALANCHE FUJI READINESS CHECKLIST
**Phase:** Avalanche C-Chain Phase 1 foundation only  
**Canonical statement:** Arbitrum remains canonical.

## 1) Required operator assumptions
- C-Chain network target: **Avalanche Fuji**
- Chain ID: **43113**
- RPC baseline: `https://api.avax-test.network/ext/bc/C/rpc`
- Explorer baseline: `https://testnet.snowtrace.io`
- Deployer wallet: dedicated Fuji-only key funded with Fuji AVAX

## 2) Optional env setup (staging only)
- `MULTICHAIN_ENABLED=true`
- `CHAIN_AVALANCHE_ENABLED=true`
- `AVALANCHE_FUJI_RPC_URL=...`
- `AVALANCHE_DEPLOYER_PRIVATE_KEY=...`

## 3) Deployment order (scaffold phase)
1. Confirm flags/env in staging context only
2. Run Fuji scaffold script with Avalanche Hardhat config
3. Generate/update `deployments/avalanche/fuji-phase1.template.json`
4. Review manifest placeholders before any real deployment run

## 4) Post-scaffold checks
- Confirm no changes in `shared/contracts.ts`
- Confirm no Arbitrum deployment script behavior changes by default
- Confirm Avalanche artifacts are isolated under Avalanche-specific paths
- Confirm build works with Avalanche env absent
- Confirm no Polygon/Sui changes were introduced

## 5) Rollback expectations
- Unset or set `CHAIN_AVALANCHE_ENABLED=false` and/or `MULTICHAIN_ENABLED=false`
- Keep Avalanche env unset in production
- No data migration rollback required because canonical state never moved from Arbitrum
