/**
 * scripts/set-navengine-staleness.ts
 *
 * Calls NAVEngine.setOracleStaleSecs(97200) to widen the on-chain oracle
 * staleness window from the constructor default of 3 600 s (1 h) to
 * 97 200 s (27 h), matching the MintRedeemController and the service-level
 * threshold in AXAUContractService.ts.
 *
 * The Chainlink XAU/USD feed on Arbitrum One has a 24 h heartbeat; the
 * 1 h default causes "NAVEngine: stale oracle" reverts between feed updates.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/set-navengine-staleness.ts   # plan only
 *   npx tsx scripts/set-navengine-staleness.ts              # live tx
 */

import { ethers } from 'ethers';

const DRY_RUN    = process.env.DRY_RUN === '1';
const TARGET_SEC = 97_200;   // 27 h  (matches MintRedeemController + service layer)
const MIN_SEC    =  3_600;   // 1 h   (sanity lower bound)
const MAX_SEC    = 172_800;  // 48 h  (sanity upper bound)

const L2_RPC     = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ''}`;
const NAV_ENGINE = '0x80F8634a43B26a2bd403396A42465F138aeCC519';

const NAV_ENGINE_ABI = [
  'function oracleStaleSecs() view returns (uint256)',
  'function ORACLE_STALE_SECS() view returns (uint256)',
  'function revertOnStaleOracle() view returns (bool)',
  'function setOracleStaleSecs(uint256 secs) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function GOVERNOR_ROLE() view returns (bytes32)',
];

async function main() {
  console.log(`\n=== NAVEngine setOracleStaleSecs ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'} ===\n`);

  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  if (!process.env.ALCHEMY_API_KEY)      throw new Error('ALCHEMY_API_KEY not set');

  const provider = new ethers.JsonRpcProvider(L2_RPC);
  const signer   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(NAV_ENGINE, NAV_ENGINE_ABI, signer);

  console.log(`Deployer   : ${signer.address}`);
  const bal = await provider.getBalance(signer.address);
  console.log(`ETH balance: ${ethers.formatEther(bal)} ETH`);

  // ── Read current state ────────────────────────────────────────────────
  const [currentStaleSecs, revertOnStale, govRole] = await Promise.all([
    contract.oracleStaleSecs(),
    contract.revertOnStaleOracle(),
    contract.GOVERNOR_ROLE(),
  ]);
  const isGovernor = await contract.hasRole(govRole, signer.address);

  console.log(`\nNAVEngine  : ${NAV_ENGINE}`);
  console.log(`oracleStaleSecs (current) : ${currentStaleSecs.toString()} s`);
  console.log(`revertOnStaleOracle       : ${revertOnStale}`);
  console.log(`Deployer is governor      : ${isGovernor}`);

  if (!isGovernor) {
    throw new Error(`Deployer ${signer.address} does not hold GOVERNOR_ROLE on NAVEngine. Cannot proceed.`);
  }

  if (Number(currentStaleSecs) === TARGET_SEC) {
    console.log(`\noracleStaleSecs is already ${TARGET_SEC}. Nothing to do.`);
    return;
  }

  if (TARGET_SEC < MIN_SEC || TARGET_SEC > MAX_SEC) {
    throw new Error(`Target ${TARGET_SEC} s is outside sanity bounds [${MIN_SEC}, ${MAX_SEC}].`);
  }

  console.log(`\nChange     : ${currentStaleSecs} s → ${TARGET_SEC} s`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would call setOracleStaleSecs. No tx submitted.');
    return;
  }

  // ── Submit transaction ────────────────────────────────────────────────
  console.log('\nSubmitting setOracleStaleSecs tx...');
  const tx = await contract.setOracleStaleSecs(TARGET_SEC);
  console.log(`Tx hash    : ${tx.hash}`);
  console.log('Waiting for confirmation...');
  const receipt = await tx.wait(1);
  console.log(`Confirmed  : block ${receipt?.blockNumber}  status ${receipt?.status === 1 ? 'SUCCESS' : 'FAILED'}`);

  if (receipt?.status !== 1) {
    throw new Error('Transaction reverted on-chain');
  }

  // ── Verify ────────────────────────────────────────────────────────────
  const newStaleSecs = await contract.oracleStaleSecs();
  console.log(`\nVerified oracleStaleSecs  : ${newStaleSecs.toString()} s`);

  if (Number(newStaleSecs) !== TARGET_SEC) {
    throw new Error(`On-chain value ${newStaleSecs} does not match target ${TARGET_SEC}`);
  }

  console.log('\n✔  NAVEngine staleness window widened to 27 h (97 200 s). Done.\n');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
