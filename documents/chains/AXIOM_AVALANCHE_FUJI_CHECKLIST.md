# Axiom Protocol — Avalanche Fuji Deployment Checklist

**Network:** Avalanche Fuji Testnet (chainId 43113)  
**Created:** 2026-05-11

Use this checklist before promoting a Fuji deployment to Avalanche C-Chain mainnet.

---

## Pre-Deployment

- [ ] `AVALANCHE_RPC_URL` or `AVALANCHE_FUJI_RPC_URL` is set in environment
- [ ] `DEPLOYER_PK` wallet has AVAX balance on Fuji (get from https://faucet.avax.network)
- [ ] `SNOWTRACE_API_KEY` is set for post-deploy verification
- [ ] Hardhat config compiles cleanly: `npx hardhat compile --config hardhat.avalanche.ts`
- [ ] Hardhat fork tests pass: `npm run test:avalanche`
- [ ] Deployment manifest template reviewed: `deployments/avalanche/fuji-phase1.template.json`

---

## Deployment Execution

- [ ] Run deploy script: `npm run deploy:avalanche:fuji`
- [ ] No errors in deploy output
- [ ] Manifest written to `deployments/avalanche/fuji-phase1.json`
- [ ] Deployer address matches expected wallet
- [ ] All 6 contract addresses populated in manifest (non-empty strings)
- [ ] All deploy transaction hashes confirmed on https://testnet.snowtrace.io

---

## Post-Deployment Verification

- [ ] Verify IdentityRegistry on Snowtrace
- [ ] Verify Compliance on Snowtrace
- [ ] Verify AXUSD on Snowtrace
- [ ] Verify LandNAVOracle on Snowtrace
- [ ] Verify AXAU on Snowtrace
- [ ] Verify Treasury on Snowtrace
- [ ] Update `shared/contracts-avalanche.ts` FUJI_CONTRACTS with deployed addresses

---

## Smoke Tests

- [ ] AXUSD mint (deployer role) succeeds on Fuji
- [ ] AXUSD transfer between two KYC'd accounts succeeds
- [ ] AXAU mint against LandNAVOracle succeeds
- [ ] Treasury receives AXUSD deposit
- [ ] Capinfra `AVALANCHE` adapter DRY_RUN dispatch returns expected receipt
- [ ] Capinfra `AVALANCHE` adapter LIVE dispatch mints on Fuji (AXUSD allowlisted)

---

## Mainnet Promotion Gate

All of the following must be true before deploying to Avalanche mainnet (43114):

- [ ] All Fuji checklist items above are complete
- [ ] Security review of Phase 1 contracts is signed off
- [ ] Multi-party authorization wallet (Gnosis Safe on Avalanche) is funded
- [ ] Treasury initialisation transaction is prepared and reviewed
- [ ] Disclosure documents updated to include Avalanche C-Chain network
- [ ] `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` populated
