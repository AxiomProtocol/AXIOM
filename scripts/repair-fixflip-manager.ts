/**
 * FIXFLIP_MANAGER Governance Repair Script
 * 
 * Problem: governanceEnforced=true but GovernanceHub.authorizedTargets() is broken,
 * causing ALL read functions (loanCount, totalActiveLoans, totalLockedCapital) to revert.
 * 
 * Fix: Disable governance enforcement on the Manager so read functions work again.
 * The deployer wallet has ADMIN_ROLE and DEFAULT_ADMIN_ROLE on the Manager contract.
 * 
 * After fix: Re-deploy a working GovernanceHub, authorize the Manager, and re-enable enforcement.
 */

import { ethers } from 'ethers';

const FIXFLIP_MANAGER = '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958';

const MANAGER_ABI = [
  'function governanceEnforced() view returns (bool)',
  'function setGovernanceEnforced(bool enforced)',
  'function governanceHub() view returns (address)',
  'function active() view returns (bool)',
  'function paused() view returns (bool)',
  'function loanCount() view returns (uint256)',
  'function totalActiveLoans() view returns (uint256)',
  'function totalLockedCapital() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

async function main() {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!alchemyKey || !deployerKey) {
    console.error('Missing ALCHEMY_API_KEY or DEPLOYER_PRIVATE_KEY');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);
  const wallet = new ethers.Wallet(deployerKey, provider);
  const manager = new ethers.Contract(FIXFLIP_MANAGER, MANAGER_ABI, wallet);

  console.log('=== FIXFLIP_MANAGER GOVERNANCE REPAIR ===');
  console.log('Manager:', FIXFLIP_MANAGER);
  console.log('Deployer:', wallet.address);
  console.log('');

  // Pre-flight checks
  const network = await provider.getNetwork();
  console.log('Network:', network.name, '| Chain ID:', network.chainId.toString());
  if (network.chainId !== 42161n) {
    console.error('ABORT: Not on Arbitrum One (chain 42161)');
    process.exit(1);
  }

  const balance = await provider.getBalance(wallet.address);
  console.log('Deployer ETH balance:', ethers.formatEther(balance), 'ETH');
  if (balance === 0n) {
    console.error('ABORT: Deployer has no ETH for gas');
    process.exit(1);
  }

  // Check current state
  const govEnforced = await manager.governanceEnforced();
  const govHub = await manager.governanceHub();
  const isActive = await manager.active();
  const isPaused = await manager.paused();

  console.log('');
  console.log('=== PRE-REPAIR STATE ===');
  console.log('governanceEnforced:', govEnforced);
  console.log('governanceHub:', govHub);
  console.log('active:', isActive);
  console.log('paused:', isPaused);

  if (!govEnforced) {
    console.log('\nGovernance enforcement already disabled. No action needed.');
    // Verify reads work
    const loanCount = await manager.loanCount();
    console.log('loanCount():', loanCount.toString());
    return;
  }

  // Check deployer has admin role
  const ADMIN_ROLE = ethers.id('ADMIN_ROLE');
  const hasAdmin = await manager.hasRole(ADMIN_ROLE, wallet.address);
  const hasDefaultAdmin = await manager.hasRole(ethers.ZeroHash, wallet.address);
  console.log('');
  console.log('Deployer has ADMIN_ROLE:', hasAdmin);
  console.log('Deployer has DEFAULT_ADMIN_ROLE:', hasDefaultAdmin);

  if (!hasAdmin && !hasDefaultAdmin) {
    console.error('ABORT: Deployer lacks admin role on Manager');
    process.exit(1);
  }

  // Verify loanCount currently reverts
  console.log('');
  console.log('=== CONFIRMING BUG ===');
  try {
    await manager.loanCount();
    console.log('loanCount() works — bug may already be fixed');
    return;
  } catch {
    console.log('loanCount() reverts — confirmed broken (governance enforcement blocks reads)');
  }

  // Execute repair
  console.log('');
  console.log('=== EXECUTING REPAIR ===');
  console.log('Calling setGovernanceEnforced(false)...');

  const tx = await manager.setGovernanceEnforced(false);
  console.log('Transaction submitted:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt!.blockNumber);
  console.log('Gas used:', receipt!.gasUsed.toString());

  // Verify fix
  console.log('');
  console.log('=== POST-REPAIR VERIFICATION ===');
  const govEnforcedAfter = await manager.governanceEnforced();
  console.log('governanceEnforced:', govEnforcedAfter);

  try {
    const loanCount = await manager.loanCount();
    const totalActive = await manager.totalActiveLoans();
    const lockedCapital = await manager.totalLockedCapital();
    console.log('loanCount():', loanCount.toString(), '✓');
    console.log('totalActiveLoans():', totalActive.toString(), '✓');
    console.log('totalLockedCapital():', ethers.formatUnits(lockedCapital, 18), '✓');
    console.log('');
    console.log('=== REPAIR SUCCESSFUL ===');
    console.log('All Manager read functions restored.');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Redeploy a working GovernanceHub');
    console.log('2. Authorize the V3 Manager as a target');
    console.log('3. Re-enable governance enforcement: setGovernanceEnforced(true)');
  } catch (e: any) {
    console.error('REPAIR FAILED — reads still revert:', e.message?.substring(0, 200));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Script failed:', e);
  process.exit(1);
});
