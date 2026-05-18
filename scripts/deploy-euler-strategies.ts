/**
 * Deploy script — Axiom Protocol Euler v2 Strategy Adapters
 *
 * Deploys three EulerV2Strategy instances and registers them with the existing
 * StrategyManager.  Does NOT redeploy the vault or StrategyManager.
 *
 * Markets targeted (Arbitrum One, 2026-05):
 *   1. USDC  — K3 Capital Theo Market  (eUSDC-5,    ~13.11% APY)
 *   2. thBILL — K3 Capital Theo Market (ethBILL-2,  ~15.31% APY)
 *   3. WETH  — K3 Capital Arbitrum Mkt (eWETH-1,    ~15.98% APY)
 *
 * Prerequisites:
 *   • AxiomTreasuryVault already deployed at AXIOM_TREASURY_VAULT_ADDRESS
 *   • StrategyManager already deployed at AXIOM_STRATEGY_MANAGER_ADDRESS
 *   • Deployer wallet holds STRATEGY_ADMIN on vault (to call addStrategy)
 *   • For WETH + thBILL: vault admin must call setAcceptedAsset() afterwards
 *     (see post-deploy instructions printed at end of script)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-euler-strategies.ts \
 *     --config hardhat.treasury.config.ts --network arbitrum
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY
 *   AXIOM_TREASURY_VAULT_ADDRESS      — existing vault
 *   AXIOM_STRATEGY_MANAGER_ADDRESS    — existing StrategyManager
 */

import { ethers } from 'hardhat';

// ── Euler vault addresses (Arbitrum One, verified 2026-05) ─────────────────
const EULER_USDC_VAULT   = '0x05d28A86E057364F6ad1a88944297E58Fc6160b3'; // eUSDC-5,    K3 Theo
const EULER_THBILL_VAULT = '0x79e1F4a1Cde92568D58EB823f81D9c0C7C384e6b'; // ethBILL-2,  K3 Theo
const EULER_WETH_VAULT   = '0x78E3E051D32157AACD550fBB78458762d8f7edFF'; // eWETH-1,    K3 Arbitrum

// ── Underlying asset addresses (Arbitrum One) ──────────────────────────────
const USDC   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const THBILL = '0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a';
const WETH   = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer:         ${deployer.address}`);

  const vaultAddr = process.env.AXIOM_TREASURY_VAULT_ADDRESS ?? '';
  const smAddr    = process.env.AXIOM_STRATEGY_MANAGER_ADDRESS ?? '';

  if (!vaultAddr || !smAddr) {
    throw new Error('Set AXIOM_TREASURY_VAULT_ADDRESS and AXIOM_STRATEGY_MANAGER_ADDRESS');
  }

  console.log(`Vault:            ${vaultAddr}`);
  console.log(`StrategyManager:  ${smAddr}\n`);

  const Factory = await ethers.getContractFactory('EulerV2Strategy');

  // ── 1. Deploy EulerV2Strategy(USDC / Theo Market) ─────────────────────────
  console.log('[1/3] Deploying EulerV2Strategy — USDC Theo Market...');
  const eulerUsdcStrategy = await Factory.deploy(vaultAddr, USDC, EULER_USDC_VAULT, smAddr);
  await eulerUsdcStrategy.waitForDeployment();
  const eulerUsdcAddr = await eulerUsdcStrategy.getAddress();
  console.log(`      EulerV2Strategy(USDC):   ${eulerUsdcAddr}`);

  // ── 2. Deploy EulerV2Strategy(thBILL / Theo Market) ──────────────────────
  console.log('[2/3] Deploying EulerV2Strategy — thBILL Theo Market...');
  const eulerThbillStrategy = await Factory.deploy(vaultAddr, THBILL, EULER_THBILL_VAULT, smAddr);
  await eulerThbillStrategy.waitForDeployment();
  const eulerThbillAddr = await eulerThbillStrategy.getAddress();
  console.log(`      EulerV2Strategy(thBILL): ${eulerThbillAddr}`);

  // ── 3. Deploy EulerV2Strategy(WETH / Arbitrum Market) ────────────────────
  console.log('[3/3] Deploying EulerV2Strategy — WETH Arbitrum Market...');
  const eulerWethStrategy = await Factory.deploy(vaultAddr, WETH, EULER_WETH_VAULT, smAddr);
  await eulerWethStrategy.waitForDeployment();
  const eulerWethAddr = await eulerWethStrategy.getAddress();
  console.log(`      EulerV2Strategy(WETH):   ${eulerWethAddr}`);

  // ── Register all three strategies with StrategyManager via vault ───────────
  console.log('\nRegistering strategies with StrategyManager via vault.addStrategy()...');

  const vaultAbi = [
    'function addStrategy(address strategy, string calldata name) external',
  ];
  const vaultContract = new ethers.Contract(vaultAddr, vaultAbi, deployer);

  const tx1 = await vaultContract.addStrategy(eulerUsdcAddr,   'Euler v2 — USDC Theo Market');
  await tx1.wait();
  console.log(`  Registered EulerV2Strategy(USDC)   tx: ${tx1.hash}`);

  const tx2 = await vaultContract.addStrategy(eulerThbillAddr, 'Euler v2 — thBILL Theo Market');
  await tx2.wait();
  console.log(`  Registered EulerV2Strategy(thBILL) tx: ${tx2.hash}`);

  const tx3 = await vaultContract.addStrategy(eulerWethAddr,   'Euler v2 — WETH Arbitrum Market');
  await tx3.wait();
  console.log(`  Registered EulerV2Strategy(WETH)   tx: ${tx3.hash}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('DEPLOYMENT COMPLETE — update Replit Secrets:');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`EULER_USDC_THEO_STRATEGY_ADDRESS=${eulerUsdcAddr}`);
  console.log(`EULER_THBILL_THEO_STRATEGY_ADDRESS=${eulerThbillAddr}`);
  console.log(`EULER_WETH_ARBITRUM_STRATEGY_ADDRESS=${eulerWethAddr}`);

  console.log('\nPost-deploy steps (run from vault VAULT_ADMIN wallet on Arbiscan):');
  console.log('  1. vault.setAcceptedAsset(thBILL, true)');
  console.log('     thBILL: ' + THBILL);
  console.log('  2. vault.setAcceptedAsset(WETH, true)');
  console.log('     WETH:   ' + WETH);
  console.log('\nThen to allocate:');
  console.log('  USDC:   vault.allocate(eulerUsdcStrategy,   USDC,   amount)');
  console.log('  thBILL: vault.depositToken(thBILL, amount) → vault.allocate(eulerThbillStrategy, thBILL, amount)');
  console.log('  WETH:   vault.depositToken(WETH, amount)   → vault.allocate(eulerWethStrategy,   WETH, amount)');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('Deployment failed:', e);
  process.exit(1);
});
