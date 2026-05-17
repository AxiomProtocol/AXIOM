/**
 * Deploy script — Axiom Protocol Treasury Vault stack
 *
 * Deploys and wires:
 *   1. StrategyManager              — strategy registry + execution layer
 *   2. AxiomTreasuryVault           — custody + idle balance, delegates to SM
 *   3. AaveV3Strategy (USDC)        — Aave v3 USDC yield adapter
 *   4. AaveV3Strategy (AXUSD)       — Aave v3 AXUSD yield adapter (skipped if
 *                                     AXUSD_ATOKEN_ADDRESS is unset)
 *   5. CamelotStrategy              — Camelot V3 AXUSD/USDC LP adapter
 *
 * Post-deploy role wiring:
 *   • vault granted STRATEGY_ADMIN on SM  (vault.allocate / recall / harvest)
 *   • strategies registered through vault.addStrategy (→ SM.addStrategy)
 *
 * Token flow note:
 *   vault.rebalance() snapshots assetAddr balance, calls SM.recall() which
 *   causes the strategy to PUSH funds to vault, then vault PUSHES to SM via
 *   IERC20.safeTransfer.  No ERC20 approval from vault → SM is required.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-treasury-vault.ts --network arbitrum
 *
 * Environment variables required:
 *   DEPLOYER_PRIVATE_KEY              — deployer EOA key
 *   VAULT_ADMIN_ADDRESS               — receives VAULT_ADMIN role on vault
 *   STRATEGY_ADMIN_ADDRESS            — receives STRATEGY_ADMIN role on SM
 *   SENTINEL_EXECUTOR_ADDRESS         — receives SENTINEL_EXECUTOR role on vault
 *   SENTINEL_EXECUTOR_PRIVATE_KEY     — private key for SENTINEL_EXECUTOR (used by
 *                                       /api/treasury/vault/rebalance at runtime)
 *   AXUSD_ADDRESS                     — deployed AXUSD ERC-3643 token address
 *   AXUSD_ATOKEN_ADDRESS              — Aave v3 aAXUSD token address (optional;
 *                                       AaveV3Strategy(AXUSD) is skipped if unset)
 */

import { ethers } from 'hardhat';

// Arbitrum One contract addresses (verified 2026-05)
const USDC       = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AAVE_POOL  = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AUSDC      = '0x724dc807b04555b71ed48a6896b6F41593b8C637';
const CAMELOT_PM = '0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD46';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);

  const vaultAdmin       = process.env.VAULT_ADMIN_ADDRESS       ?? deployer.address;
  const strategyAdmin    = process.env.STRATEGY_ADMIN_ADDRESS    ?? deployer.address;
  const sentinelExecutor = process.env.SENTINEL_EXECUTOR_ADDRESS ?? deployer.address;
  const axusd            = process.env.AXUSD_ADDRESS             ?? ethers.ZeroAddress;
  const axusdAToken      = process.env.AXUSD_ATOKEN_ADDRESS      ?? '';

  if (axusd === ethers.ZeroAddress) {
    console.warn('WARNING: AXUSD_ADDRESS not set — using zero address as placeholder');
  }
  if (!axusdAToken) {
    console.warn('WARNING: AXUSD_ATOKEN_ADDRESS not set — AaveV3Strategy(AXUSD) will be skipped');
  }
  if (!process.env.SENTINEL_EXECUTOR_PRIVATE_KEY) {
    console.warn('WARNING: SENTINEL_EXECUTOR_PRIVATE_KEY not set — required at runtime for /api/treasury/vault/rebalance');
  }

  // ── Step 1: Deploy StrategyManager ───────────────────────────────────────
  console.log('\n[1/5] Deploying StrategyManager...');
  const SMFactory = await ethers.getContractFactory('StrategyManager');
  const strategyManager = await SMFactory.deploy(strategyAdmin);
  await strategyManager.waitForDeployment();
  const smAddress = await strategyManager.getAddress();
  console.log(`      StrategyManager: ${smAddress}`);

  // ── Step 2: Deploy AxiomTreasuryVault ────────────────────────────────────
  console.log('\n[2/5] Deploying AxiomTreasuryVault...');
  const VaultFactory = await ethers.getContractFactory('AxiomTreasuryVault');
  const vault = await VaultFactory.deploy(
    vaultAdmin,
    strategyAdmin,
    sentinelExecutor,
    smAddress,
    USDC,
    axusd,
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`      AxiomTreasuryVault: ${vaultAddress}`);

  // ── Step 3: Grant vault STRATEGY_ADMIN on StrategyManager ────────────────
  // vault.allocate(), vault.recallFromStrategy(), vault.harvestStrategy() and
  // vault.rebalance() all delegate through SM functions gated by STRATEGY_ADMIN.
  console.log('\n[3/5] Granting vault STRATEGY_ADMIN on StrategyManager...');
  const STRATEGY_ADMIN_ROLE = await strategyManager.STRATEGY_ADMIN();
  await strategyManager.grantRole(STRATEGY_ADMIN_ROLE, vaultAddress);
  console.log(`      Vault (${vaultAddress}) granted STRATEGY_ADMIN on SM`);

  // ── Step 4: Deploy AaveV3Strategy instances ───────────────────────────────
  // Two instances: one for USDC, one for AXUSD (Aave v3 USDC/AXUSD markets).
  // Both share the same Aave Pool address; each has its own underlying + aToken.
  console.log('\n[4/5] Deploying AaveV3Strategy instances...');
  const AaveFactory = await ethers.getContractFactory('AaveV3Strategy');

  // USDC market — always deployed
  const aaveUsdc = await AaveFactory.deploy(
    vaultAddress, USDC, AAVE_POOL, AUSDC, smAddress,
  );
  await aaveUsdc.waitForDeployment();
  const aaveUsdcAddress = await aaveUsdc.getAddress();
  console.log(`      AaveV3Strategy(USDC):  ${aaveUsdcAddress}`);

  // AXUSD market — deployed only if aToken address is configured
  let aaveAxusdAddress = '';
  if (axusdAToken) {
    const aaveAxusd = await AaveFactory.deploy(
      vaultAddress, axusd, AAVE_POOL, axusdAToken, smAddress,
    );
    await aaveAxusd.waitForDeployment();
    aaveAxusdAddress = await aaveAxusd.getAddress();
    console.log(`      AaveV3Strategy(AXUSD): ${aaveAxusdAddress}`);
  } else {
    console.log('      AaveV3Strategy(AXUSD): SKIPPED — set AXUSD_ATOKEN_ADDRESS to enable');
  }

  // ── Step 5: Deploy CamelotStrategy and register all strategies ────────────
  console.log('\n[5/5] Deploying CamelotStrategy and registering strategies...');
  const CamelotFactory = await ethers.getContractFactory('CamelotStrategy');
  const camelotStrategy = await CamelotFactory.deploy(
    vaultAddress, USDC, axusd, CAMELOT_PM, smAddress,
  );
  await camelotStrategy.waitForDeployment();
  const camelotAddress = await camelotStrategy.getAddress();
  console.log(`      CamelotStrategy: ${camelotAddress}`);

  // Register via vault.addStrategy() which internally calls SM.addStrategy()
  await vault.addStrategy(aaveUsdcAddress, 'AaveV3-USDC');
  console.log('      Registered AaveV3Strategy(USDC)');

  if (aaveAxusdAddress) {
    await vault.addStrategy(aaveAxusdAddress, 'AaveV3-AXUSD');
    console.log('      Registered AaveV3Strategy(AXUSD)');
  }

  await vault.addStrategy(camelotAddress, 'Camelot-AXUSD-USDC');
  console.log('      Registered CamelotStrategy');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Deployment complete. Set these environment variables:');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  AXIOM_TREASURY_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`  AXIOM_STRATEGY_MANAGER_ADDRESS=${smAddress}`);
  console.log(`  AXIOM_AAVE_V3_STRATEGY_ADDRESS=${aaveUsdcAddress}`);
  if (aaveAxusdAddress) {
    console.log(`  AXIOM_AAVE_V3_AXUSD_STRATEGY_ADDRESS=${aaveAxusdAddress}`);
  }
  console.log(`  AXIOM_CAMELOT_STRATEGY_ADDRESS=${camelotAddress}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('\nNext: run scripts/verify-treasury-vault.ts with these addresses.');
  console.log(`Ensure SENTINEL_EXECUTOR_PRIVATE_KEY is set to the key for the`);
  console.log(`SENTINEL_EXECUTOR role holder (${sentinelExecutor}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
