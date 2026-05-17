/**
 * Verify script — Axiom Protocol Treasury Vault stack on Arbiscan
 *
 * Usage:
 *   npx hardhat run scripts/verify-treasury-vault.ts --network arbitrum
 *
 * Set the deployed addresses via environment variables before running:
 *   AXIOM_TREASURY_VAULT_ADDRESS
 *   AXIOM_STRATEGY_MANAGER_ADDRESS
 *   AXIOM_AAVE_V3_STRATEGY_ADDRESS
 *   AXIOM_CAMELOT_STRATEGY_ADDRESS
 *   VAULT_ADMIN_ADDRESS (must match deploy)
 *   STRATEGY_ADMIN_ADDRESS
 *   SENTINEL_EXECUTOR_ADDRESS
 *   AXUSD_ADDRESS
 */

import hre from 'hardhat';

const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AAVE_POOL     = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AUSDC         = '0x724dc807b04555b71ed48a6896b6F41593b8C637';
const CAMELOT_PM    = '0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD46';

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

async function main() {
  const vaultAddress    = required('AXIOM_TREASURY_VAULT_ADDRESS');
  const smAddress       = required('AXIOM_STRATEGY_MANAGER_ADDRESS');
  const aaveAddress     = required('AXIOM_AAVE_V3_STRATEGY_ADDRESS');
  const camelotAddress  = required('AXIOM_CAMELOT_STRATEGY_ADDRESS');
  const vaultAdmin      = required('VAULT_ADMIN_ADDRESS');
  const strategyAdmin   = required('STRATEGY_ADMIN_ADDRESS');
  const sentinel        = required('SENTINEL_EXECUTOR_ADDRESS');
  const axusd           = required('AXUSD_ADDRESS');

  console.log('Verifying AxiomTreasuryVault...');
  await hre.run('verify:verify', {
    address: vaultAddress,
    constructorArguments: [vaultAdmin, strategyAdmin, sentinel, USDC, axusd],
  });

  console.log('Verifying StrategyManager...');
  await hre.run('verify:verify', {
    address: smAddress,
    constructorArguments: [strategyAdmin, sentinel],
  });

  console.log('Verifying AaveV3Strategy...');
  await hre.run('verify:verify', {
    address: aaveAddress,
    constructorArguments: [vaultAddress, USDC, AAVE_POOL, AUSDC, smAddress],
  });

  console.log('Verifying CamelotStrategy...');
  await hre.run('verify:verify', {
    address: camelotAddress,
    constructorArguments: [vaultAddress, USDC, axusd, CAMELOT_PM, smAddress],
  });

  console.log('\nAll contracts verified on Arbiscan.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
