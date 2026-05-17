/**
 * Rescue script — drain USDC from old AxiomTreasuryVault back to operator wallet
 *
 * The old vault (0x0d04742…) holds $25 USDC idle.  This script reads the vault's
 * current USDC balance, then calls vault.withdraw() to return the full amount to
 * the deployer wallet so it can be re-deposited into the newly deployed vault.
 *
 * vault.withdraw() is restricted to VAULT_ADMIN.  Run this from the same deployer
 * EOA that was granted VAULT_ADMIN at deploy time.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=<key> \
 *   OLD_VAULT_ADDRESS=0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8 \
 *   npx hardhat run scripts/rescue-vault-usdc.ts --network arbitrum
 *
 * Or supply OLD_VAULT_ADDRESS via env to target a different vault.
 *
 * Environment variables required:
 *   DEPLOYER_PRIVATE_KEY   — private key for the deployer EOA (holds VAULT_ADMIN)
 *   OLD_VAULT_ADDRESS      — address of the vault to drain (defaults to old vault)
 *
 * Dry-run (read-only, no transactions):
 *   DRY_RUN=1 npx hardhat run scripts/rescue-vault-usdc.ts --network arbitrum
 */

import { ethers } from 'hardhat';

const OLD_VAULT_DEFAULT = '0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8';
const USDC              = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_DECIMALS     = 6;

// Minimal ABI — only the functions this script needs
const VAULT_RESCUE_ABI = [
  // ERC-4626 primary-asset withdraw (VAULT_ADMIN only on AxiomTreasuryVault)
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  // ERC-4626 maxWithdraw — returns the max USDC the caller can withdraw
  'function maxWithdraw(address owner) view returns (uint256)',
  // ERC-4626 totalAssets — idle USDC + strategy-deployed USDC
  'function totalAssets() view returns (uint256)',
  // Share balance of an address
  'function balanceOf(address) view returns (uint256)',
  // Role check
  'function hasRole(bytes32 role, address account) view returns (bool)',
  // Role constant
  'function VAULT_ADMIN() view returns (bytes32)',
] as const;

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
] as const;

async function main() {
  const dryRun   = process.env.DRY_RUN === '1';
  const vaultAddr = process.env.OLD_VAULT_ADDRESS ?? OLD_VAULT_DEFAULT;

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer:   ${deployer.address}`);
  console.log(`Old vault:  ${vaultAddr}`);
  console.log(`Dry run:    ${dryRun ? 'YES — no transactions will be sent' : 'NO'}`);

  const provider = deployer.provider!;
  const vault    = new ethers.Contract(vaultAddr, VAULT_RESCUE_ABI, provider);
  const usdc     = new ethers.Contract(USDC, USDC_ABI, provider);

  // ── Pre-flight checks ────────────────────────────────────────────────────────

  // Verify VAULT_ADMIN role
  const vaultAdminRole: string = await vault.VAULT_ADMIN();
  const isAdmin: boolean = await vault.hasRole(vaultAdminRole, deployer.address);
  console.log(`\n[pre-flight] VAULT_ADMIN role: ${vaultAdminRole}`);
  console.log(`[pre-flight] deployer hasRole(VAULT_ADMIN): ${isAdmin}`);
  if (!isAdmin) {
    throw new Error(
      `Deployer ${deployer.address} does NOT hold VAULT_ADMIN on vault ${vaultAddr}.\n` +
      'Rescue cannot proceed — use the correct deployer wallet.',
    );
  }

  // Read vault state
  const totalAssets: bigint = await vault.totalAssets();
  const maxWithdraw: bigint = await vault.maxWithdraw(deployer.address);
  const vaultUsdcBalance: bigint = await usdc.balanceOf(vaultAddr);
  const deployerUsdcBefore: bigint = await usdc.balanceOf(deployer.address);

  console.log(`\n[vault state]`);
  console.log(`  totalAssets():          ${formatUsdc(totalAssets)} USDC`);
  console.log(`  maxWithdraw(deployer):  ${formatUsdc(maxWithdraw)} USDC`);
  console.log(`  vault USDC balance:     ${formatUsdc(vaultUsdcBalance)} USDC`);
  console.log(`  deployer USDC (before): ${formatUsdc(deployerUsdcBefore)} USDC`);

  if (maxWithdraw === 0n) {
    console.log('\nNothing to rescue — maxWithdraw is 0. Exiting.');
    return;
  }

  // ── Execute withdraw ─────────────────────────────────────────────────────────

  if (dryRun) {
    console.log(`\n[DRY RUN] Would call vault.withdraw(${formatUsdc(maxWithdraw)}, deployer, deployer)`);
    console.log('[DRY RUN] No transaction sent. Remove DRY_RUN=1 to execute.');
    return;
  }

  console.log(`\n[executing] vault.withdraw(${formatUsdc(maxWithdraw)} USDC, ${deployer.address}, ${deployer.address})`);

  const vaultSigned = new ethers.Contract(vaultAddr, VAULT_RESCUE_ABI, deployer);
  const tx = await vaultSigned.withdraw(maxWithdraw, deployer.address, deployer.address);
  console.log(`  tx submitted: ${tx.hash}`);
  console.log(`  Arbiscan:     https://arbiscan.io/tx/${tx.hash}`);

  const receipt = await tx.wait();
  if (receipt?.status !== 1) {
    throw new Error(`Transaction reverted: ${tx.hash}`);
  }
  console.log(`  confirmed in block ${receipt.blockNumber} (gasUsed=${receipt.gasUsed})`);

  // ── Post-state ───────────────────────────────────────────────────────────────

  const deployerUsdcAfter: bigint = await usdc.balanceOf(deployer.address);
  const vaultUsdcAfter: bigint    = await usdc.balanceOf(vaultAddr);
  const rescued = deployerUsdcAfter - deployerUsdcBefore;

  console.log(`\n[result]`);
  console.log(`  USDC rescued:           ${formatUsdc(rescued)} USDC`);
  console.log(`  deployer USDC (after):  ${formatUsdc(deployerUsdcAfter)} USDC`);
  console.log(`  vault USDC (after):     ${formatUsdc(vaultUsdcAfter)} USDC`);

  if (vaultUsdcAfter !== 0n) {
    console.warn(`\nWARNING: vault still holds ${formatUsdc(vaultUsdcAfter)} USDC after rescue.`);
    console.warn('This may indicate USDC is deployed into a strategy. Recall from strategies first.');
  } else {
    console.log('\nVault fully drained. Proceed to deploy-treasury-vault.ts.');
  }
}

function formatUsdc(raw: bigint): string {
  const whole = raw / BigInt(10 ** USDC_DECIMALS);
  const frac  = raw % BigInt(10 ** USDC_DECIMALS);
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, '0')}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
