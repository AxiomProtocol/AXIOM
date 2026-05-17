/**
 * Deploy script — Axiom Protocol Treasury Vault stack
 *
 * Deploys and wires:
 *   1. StrategyManager         — strategy registry + execution layer
 *   2. AxiomTreasuryVault      — custody + idle balance, delegates to SM
 *   3. AaveV3Strategy          — Aave v3 USDC yield adapter
 *   4. CamelotStrategy         — Camelot V3 AXUSD/USDC LP adapter
 *
 * Post-deploy role wiring:
 *   • vault granted STRATEGY_ADMIN on SM  (vault.allocate → SM.allocate)
 *   • vault granted SENTINEL_EXECUTOR on SM (vault.rebalance → SM.rebalance)
 *   • vault approves SM for max USDC (required for SM.rebalance pull-from-vault)
 *   • strategies registered through vault.addStrategy (SM.addStrategy)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-treasury-vault.ts --network arbitrum
 *
 * Environment variables required:
 *   DEPLOYER_PRIVATE_KEY        — deployer EOA key
 *   VAULT_ADMIN_ADDRESS         — address that receives VAULT_ADMIN role
 *   STRATEGY_ADMIN_ADDRESS      — address that receives STRATEGY_ADMIN role
 *   SENTINEL_EXECUTOR_ADDRESS   — Axiom Sentinel executor address
 *   AXUSD_ADDRESS               — deployed AXUSD ERC-3643 token address
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

  if (axusd === ethers.ZeroAddress) {
    console.warn('WARNING: AXUSD_ADDRESS not set — using zero address as placeholder');
  }

  // ── Step 1: Deploy StrategyManager ───────────────────────────────────────
  // No vault address needed — vault is granted roles on SM after deploy.
  console.log('\n[1/7] Deploying StrategyManager...');
  const SMFactory = await ethers.getContractFactory('StrategyManager');
  const strategyManager = await SMFactory.deploy(strategyAdmin, sentinelExecutor);
  await strategyManager.waitForDeployment();
  const smAddress = await strategyManager.getAddress();
  console.log(`      StrategyManager: ${smAddress}`);

  // ── Step 2: Deploy AxiomTreasuryVault (with SM address) ─────────────────
  console.log('\n[2/7] Deploying AxiomTreasuryVault...');
  const VaultFactory = await ethers.getContractFactory('AxiomTreasuryVault');
  const vault = await VaultFactory.deploy(
    vaultAdmin,
    strategyAdmin,
    sentinelExecutor,
    smAddress,
    USDC,
    axusd
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`      AxiomTreasuryVault: ${vaultAddress}`);

  // ── Step 3: Grant vault roles on StrategyManager ─────────────────────────
  console.log('\n[3/7] Granting vault roles on StrategyManager...');
  const STRATEGY_ADMIN    = await strategyManager.STRATEGY_ADMIN();
  const SENTINEL_EXECUTOR = await strategyManager.SENTINEL_EXECUTOR();

  await strategyManager.grantRole(STRATEGY_ADMIN,    vaultAddress);
  console.log(`      Vault granted STRATEGY_ADMIN on SM`);
  await strategyManager.grantRole(SENTINEL_EXECUTOR, vaultAddress);
  console.log(`      Vault granted SENTINEL_EXECUTOR on SM`);

  // ── Step 4: Vault max-approves SM for USDC (rebalance pull) ───────────────
  // During rebalance, SM pulls withdrawn funds from vault to forward to the
  // destination strategy.  A max-approval issued here avoids per-rebalance
  // gas overhead and is acceptable because SM is a trusted protocol contract.
  // NOTE: this tx must be signed by VAULT_ADMIN.  In production, substitute
  //       the appropriate signer below.
  console.log('\n[4/7] Vault approves StrategyManager for USDC (rebalance pull)...');
  const usdcToken = await ethers.getContractAt('IERC20', USDC);
  // This step requires the vault's VAULT_ADMIN to call approve — the deployer
  // address may not match in production.  Log the calldata for the operator.
  const approveCalldata = usdcToken.interface.encodeFunctionData('approve', [smAddress, ethers.MaxUint256]);
  console.log(`      [ACTION REQUIRED] Vault admin must submit approve() call:`);
  console.log(`        to:   ${USDC}`);
  console.log(`        data: ${approveCalldata}`);
  console.log(`      (Max-approve SM on USDC so rebalance can pull from vault)`);

  // ── Step 5: Deploy AaveV3Strategy ─────────────────────────────────────────
  console.log('\n[5/7] Deploying AaveV3Strategy...');
  const AaveFactory = await ethers.getContractFactory('AaveV3Strategy');
  const aaveStrategy = await AaveFactory.deploy(
    vaultAddress, USDC, AAVE_POOL, AUSDC, smAddress
  );
  await aaveStrategy.waitForDeployment();
  const aaveAddress = await aaveStrategy.getAddress();
  console.log(`      AaveV3Strategy: ${aaveAddress}`);

  // ── Step 6: Deploy CamelotStrategy ────────────────────────────────────────
  console.log('\n[6/7] Deploying CamelotStrategy...');
  const CamelotFactory = await ethers.getContractFactory('CamelotStrategy');
  const camelotStrategy = await CamelotFactory.deploy(
    vaultAddress, USDC, axusd, CAMELOT_PM, smAddress
  );
  await camelotStrategy.waitForDeployment();
  const camelotAddress = await camelotStrategy.getAddress();
  console.log(`      CamelotStrategy: ${camelotAddress}`);

  // ── Step 7: Register strategies (through vault → SM) ─────────────────────
  console.log('\n[7/7] Registering strategies via vault.addStrategy()...');
  await vault.addStrategy(aaveAddress,    'AaveV3-USDC');
  console.log('      Registered AaveV3Strategy');
  await vault.addStrategy(camelotAddress, 'Camelot-AXUSD-USDC');
  console.log('      Registered CamelotStrategy');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Deployment complete. Set these environment variables:');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  AXIOM_TREASURY_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`  AXIOM_STRATEGY_MANAGER_ADDRESS=${smAddress}`);
  console.log(`  AXIOM_AAVE_V3_STRATEGY_ADDRESS=${aaveAddress}`);
  console.log(`  AXIOM_CAMELOT_STRATEGY_ADDRESS=${camelotAddress}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('\nNext: run scripts/verify-treasury-vault.ts with these addresses.');
  console.log('Remember: vault admin must submit the USDC approve() calldata (step 4).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
