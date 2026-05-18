#!/usr/bin/env npx tsx
/**
 * TSX-native deploy script for Axiom Protocol Euler v2 Strategy Adapters.
 * Uses ethers + precompiled artifact — no Hardhat ESM requirement.
 *
 * Usage:  npx tsx scripts/deploy-euler-tsx.ts
 *
 * Required env vars (already set in Replit Secrets):
 *   DEPLOYER_PRIVATE_KEY
 *   AXIOM_TREASURY_VAULT_ADDRESS
 *   AXIOM_STRATEGY_MANAGER_ADDRESS
 *   ALCHEMY_API_KEY  (or ARBITRUM_RPC_URL)
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';

// ── Addresses ─────────────────────────────────────────────────────────────────
const VAULT_ADDR = process.env.AXIOM_TREASURY_VAULT_ADDRESS!;
const SM_ADDR    = process.env.AXIOM_STRATEGY_MANAGER_ADDRESS!;

const EULER_USDC_VAULT   = '0x05d28A86E057364F6ad1a88944297E58Fc6160b3'; // eUSDC-5
const EULER_THBILL_VAULT = '0x79e1F4a1Cde92568D58EB823f81D9c0C7C384e6b'; // ethBILL-2
const EULER_WETH_VAULT   = '0x78E3E051D32157AACD550fBB78458762d8f7edFF'; // eWETH-1

const USDC   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const THBILL = '0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a';
const WETH   = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

// ── Load artifact ─────────────────────────────────────────────────────────────
const artifact = JSON.parse(
  readFileSync('./artifacts/contracts/treasury/EulerV2Strategy.sol/EulerV2Strategy.json', 'utf8')
);
const vaultArtifact = JSON.parse(
  readFileSync('./artifacts/contracts/treasury/AxiomTreasuryVault.sol/AxiomTreasuryVault.json', 'utf8')
);

async function deployStrategy(
  factory: ethers.ContractFactory,
  vault: string,
  asset: string,
  eulerVault: string,
  manager: string,
  label: string
): Promise<string> {
  console.log(`\n[deploy] ${label}`);
  const contract = await factory.deploy(vault, asset, eulerVault, manager);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`         address : ${addr}`);
  const receipt = await contract.deploymentTransaction()?.wait(1);
  console.log(`         tx hash : ${receipt?.hash}`);
  console.log(`         gas used: ${receipt?.gasUsed?.toString()}`);
  return addr;
}

async function main() {
  if (!VAULT_ADDR || !SM_ADDR || !process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error('Missing required env vars: DEPLOYER_PRIVATE_KEY, AXIOM_TREASURY_VAULT_ADDRESS, AXIOM_STRATEGY_MANAGER_ADDRESS');
  }

  const rpc = process.env.ARBITRUM_RPC_URL
    ?? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpc);
  const deployer  = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  const { chainId } = await provider.getNetwork();
  if (chainId !== 42161n) {
    throw new Error(`Wrong network — expected Arbitrum One (42161), got ${chainId}`);
  }

  const balance = await provider.getBalance(deployer.address);
  console.log('\n══════════════════════════════════════════════════════');
  console.log(' Axiom Protocol — Euler v2 Strategy Deployment');
  console.log('══════════════════════════════════════════════════════');
  console.log(` Deployer : ${deployer.address}`);
  console.log(` Balance  : ${ethers.formatEther(balance)} ETH`);
  console.log(` Vault    : ${VAULT_ADDR}`);
  console.log(` SM       : ${SM_ADDR}`);
  console.log(` Chain    : Arbitrum One (42161)`);

  if (balance < ethers.parseEther('0.0001')) {
    throw new Error(`Insufficient ETH — need at least 0.0001 ETH for gas, have ${ethers.formatEther(balance)}`);
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);

  // ── Deploy all three strategies ───────────────────────────────────────────
  const eulerUsdcAddr   = await deployStrategy(factory, VAULT_ADDR, USDC,   EULER_USDC_VAULT,   SM_ADDR, 'EulerV2Strategy — USDC Theo Market   (~13.11% APY)');
  const eulerThbillAddr = await deployStrategy(factory, VAULT_ADDR, THBILL, EULER_THBILL_VAULT, SM_ADDR, 'EulerV2Strategy — thBILL Theo Market  (~15.31% APY)');
  const eulerWethAddr   = await deployStrategy(factory, VAULT_ADDR, WETH,   EULER_WETH_VAULT,   SM_ADDR, 'EulerV2Strategy — WETH Arbitrum Market (~15.98% APY)');

  // ── Register strategies via vault.addStrategy() ───────────────────────────
  console.log('\n[register] Registering strategies with StrategyManager via vault...');
  const vaultContract = new ethers.Contract(VAULT_ADDR, vaultArtifact.abi, deployer);

  const tx1 = await vaultContract.addStrategy(eulerUsdcAddr,   'Euler v2 — USDC Theo Market');
  await tx1.wait(1);
  console.log(`  ✓ USDC   strategy registered  tx: ${tx1.hash}`);

  const tx2 = await vaultContract.addStrategy(eulerThbillAddr, 'Euler v2 — thBILL Theo Market');
  await tx2.wait(1);
  console.log(`  ✓ thBILL strategy registered  tx: ${tx2.hash}`);

  const tx3 = await vaultContract.addStrategy(eulerWethAddr,   'Euler v2 — WETH Arbitrum Market');
  await tx3.wait(1);
  console.log(`  ✓ WETH   strategy registered  tx: ${tx3.hash}`);

  // ── Print secrets to set ──────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(' DEPLOYMENT COMPLETE — set these Replit Secrets:');
  console.log('══════════════════════════════════════════════════════');
  console.log(`EULER_USDC_THEO_STRATEGY_ADDRESS=${eulerUsdcAddr}`);
  console.log(`EULER_THBILL_THEO_STRATEGY_ADDRESS=${eulerThbillAddr}`);
  console.log(`EULER_WETH_ARBITRUM_STRATEGY_ADDRESS=${eulerWethAddr}`);
  console.log(`NEXT_PUBLIC_EULER_USDC_THEO_STRATEGY_ADDRESS=${eulerUsdcAddr}`);
  console.log(`NEXT_PUBLIC_EULER_THBILL_THEO_STRATEGY_ADDRESS=${eulerThbillAddr}`);
  console.log(`NEXT_PUBLIC_EULER_WETH_ARBITRUM_STRATEGY_ADDRESS=${eulerWethAddr}`);

  console.log('\n Post-deploy actions (vault VAULT_ADMIN role required):');
  console.log('  1. vault.setAcceptedAsset(' + THBILL + ', true)  ← thBILL asset');
  console.log('  2. vault.setAcceptedAsset(' + WETH   + ', true)  ← WETH asset');
  console.log('\n To allocate USDC immediately (no extra steps needed):');
  console.log('  vault.allocate(' + eulerUsdcAddr + ', ' + USDC + ', <amount_in_6_decimals>)');
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('\n[FATAL]', e.message || e);
  process.exit(1);
});
