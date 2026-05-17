/**
 * Deploy script — Axiom Protocol Treasury Vault stack
 *
 * Deploys:
 *   1. AxiomTreasuryVault
 *   2. StrategyManager
 *   3. AaveV3Strategy  (wires to vault + strategy manager)
 *   4. CamelotStrategy (wires to vault + strategy manager)
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

// Arbitrum One contract addresses (hardcoded — production only)
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AAVE_POOL     = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AUSDC         = '0x724dc807b04555b71ed48a6896b6F41593b8C637';
const CAMELOT_PM    = '0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD46';

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

  // 1. Deploy AxiomTreasuryVault
  console.log('\n[1/4] Deploying AxiomTreasuryVault...');
  const VaultFactory = await ethers.getContractFactory('AxiomTreasuryVault');
  const vault = await VaultFactory.deploy(vaultAdmin, strategyAdmin, sentinelExecutor, USDC, axusd);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`      AxiomTreasuryVault: ${vaultAddress}`);

  // 2. Deploy StrategyManager
  console.log('\n[2/4] Deploying StrategyManager...');
  const SMFactory = await ethers.getContractFactory('StrategyManager');
  const strategyManager = await SMFactory.deploy(strategyAdmin, sentinelExecutor);
  await strategyManager.waitForDeployment();
  const smAddress = await strategyManager.getAddress();
  console.log(`      StrategyManager: ${smAddress}`);

  // 3. Deploy AaveV3Strategy
  console.log('\n[3/4] Deploying AaveV3Strategy...');
  const AaveFactory = await ethers.getContractFactory('AaveV3Strategy');
  const aaveStrategy = await AaveFactory.deploy(vaultAddress, USDC, AAVE_POOL, AUSDC, smAddress);
  await aaveStrategy.waitForDeployment();
  const aaveAddress = await aaveStrategy.getAddress();
  console.log(`      AaveV3Strategy: ${aaveAddress}`);

  // 4. Deploy CamelotStrategy
  console.log('\n[4/4] Deploying CamelotStrategy...');
  const CamelotFactory = await ethers.getContractFactory('CamelotStrategy');
  const camelotStrategy = await CamelotFactory.deploy(vaultAddress, USDC, axusd, CAMELOT_PM, smAddress);
  await camelotStrategy.waitForDeployment();
  const camelotAddress = await camelotStrategy.getAddress();
  console.log(`      CamelotStrategy: ${camelotAddress}`);

  // 5. Register strategies in StrategyManager
  console.log('\n[5/5] Registering strategies in StrategyManager...');
  await strategyManager.addStrategy(aaveAddress,    'AaveV3-USDC');
  console.log('      Registered AaveV3Strategy');
  await strategyManager.addStrategy(camelotAddress, 'Camelot-AXUSD-USDC');
  console.log('      Registered CamelotStrategy');

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Deployment complete. Add these to shared/contracts.ts:');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  AXIOM_TREASURY_VAULT:     '${vaultAddress}',`);
  console.log(`  AXIOM_STRATEGY_MANAGER:   '${smAddress}',`);
  console.log(`  AXIOM_AAVE_V3_STRATEGY:   '${aaveAddress}',`);
  console.log(`  AXIOM_CAMELOT_STRATEGY:   '${camelotAddress}',`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('\nNext: run scripts/verify-treasury-vault.ts with these addresses.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
