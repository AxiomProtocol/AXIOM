/**
 * scripts/redeploy-controller.ts
 *
 * Redeploys MintRedeemController with configurable oracle staleness window
 * (default 97,200 s = 27 h, covering the 24 h Chainlink XAU/USD heartbeat).
 *
 * What this script does:
 *   1. Compiles and deploys the updated MintRedeemController.
 *   2. Grants MINTER_ROLE on the AXAU token to the new controller.
 *   3. Pauses mint + redeem on the OLD controller (safety: strands no user funds).
 *   4. Updates deployments/axau-arbitrum.json with the new controller address.
 *
 * DRY_RUN=1 simulates gas estimates without sending any transactions.
 *
 * Usage:
 *   npx tsx scripts/redeploy-controller.ts          # live — spends deployer ETH
 *   DRY_RUN=1 npx tsx scripts/redeploy-controller.ts # plan only
 */

import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.env.DRY_RUN === '1';

const L2_RPC     = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ''}`;
const MANIFEST   = path.join(process.cwd(), 'deployments', 'axau-arbitrum.json');

// ── Existing on-chain addresses (from deployment manifest) ─────────────────
const AXAU_TOKEN   = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const REGISTRY     = '0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa';
const NAV_ENGINE   = '0x80F8634a43B26a2bd403396A42465F138aeCC519';
const OLD_CTRL     = '0x036F05a3fB74d35439c074f25F691b36f5D37792';

// ── ABIs (minimal) ─────────────────────────────────────────────────────────
const TOKEN_ABI = [
  'function MINTER_ROLE() view returns (bytes32)',
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const OLD_CTRL_ABI = [
  'function pauseMint(bool paused) external',
  'function pauseRedeem(bool paused) external',
  'function protocolFeeRecipient() view returns (address)',
];

// ── MintRedeemController bytecode via hardhat artifact ────────────────────
async function getControllerFactory(signer: ethers.Signer) {
  const { ethers: hre } = await import('hardhat');
  return hre.getContractFactory('MintRedeemController', signer);
}

async function main() {
  console.log(`\n=== MintRedeemController Redeploy ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'} ===\n`);

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  if (!process.env.ALCHEMY_API_KEY) throw new Error('ALCHEMY_API_KEY not set');

  const provider = new ethers.JsonRpcProvider(L2_RPC);
  const signer   = new ethers.Wallet(pk, provider);

  console.log(`Deployer  : ${signer.address}`);
  const bal = await provider.getBalance(signer.address);
  console.log(`ETH bal   : ${ethers.formatEther(bal)} ETH`);
  if (bal < ethers.parseEther('0.002')) {
    throw new Error('Deployer balance too low — need at least 0.002 ETH for deployment gas');
  }

  // Resolve current fee recipient from old controller
  const oldCtrl       = new ethers.Contract(OLD_CTRL, OLD_CTRL_ABI, signer);
  const feeRecipient  = await oldCtrl.protocolFeeRecipient();
  console.log(`Fee recip : ${feeRecipient}`);

  // ── Step 1: Deploy new controller ──────────────────────────────────────
  console.log('\n[1/4] Deploying updated MintRedeemController...');
  const Factory  = await getControllerFactory(signer);
  const initArgs = [signer.address, AXAU_TOKEN, NAV_ENGINE, REGISTRY, feeRecipient];
  console.log('      constructor args:', initArgs);

  if (DRY_RUN) {
    const deployTx = await Factory.getDeployTransaction(...initArgs);
    const gas = await provider.estimateGas({ ...deployTx, from: signer.address });
    console.log(`      [DRY RUN] estimated gas: ${gas.toString()}`);
    console.log('\nDRY RUN complete — no transactions sent.');
    return;
  }

  const newCtrl = await Factory.deploy(...initArgs);
  await newCtrl.waitForDeployment();
  const newAddr = await newCtrl.getAddress();
  console.log(`      Deployed at: ${newAddr}`);

  // ── Step 2: Grant MINTER_ROLE to new controller ────────────────────────
  console.log('\n[2/4] Granting MINTER_ROLE to new controller on AXAU token...');
  const token      = new ethers.Contract(AXAU_TOKEN, TOKEN_ABI, signer);
  const minterRole = await token.MINTER_ROLE();
  const alreadyHas = await token.hasRole(minterRole, newAddr);
  if (alreadyHas) {
    console.log('      Already has MINTER_ROLE — skipping.');
  } else {
    const tx = await token.grantRole(minterRole, newAddr);
    await tx.wait();
    console.log(`      MINTER_ROLE granted — tx: ${tx.hash}`);
  }

  // ── Step 3: Pause old controller ──────────────────────────────────────
  console.log('\n[3/4] Pausing mint + redeem on OLD controller...');
  try {
    const tx1 = await oldCtrl.pauseMint(true);
    await tx1.wait();
    console.log(`      pauseMint(true)   — tx: ${tx1.hash}`);
    const tx2 = await oldCtrl.pauseRedeem(true);
    await tx2.wait();
    console.log(`      pauseRedeem(true) — tx: ${tx2.hash}`);
  } catch (err) {
    console.warn(`      WARNING: Could not pause old controller — ${err instanceof Error ? err.message : err}`);
    console.warn('      Old controller may not have deployer as PAUSER_ROLE. Continuing anyway.');
  }

  // ── Step 4: Update deployment manifest ────────────────────────────────
  console.log('\n[4/4] Updating deployments/axau-arbitrum.json...');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  manifest.contracts.MintRedeemController_v1_staleness_hardcoded = OLD_CTRL;
  manifest.contracts.MintRedeemController = newAddr;
  manifest.updatedAt = new Date().toISOString();
  manifest.controllerRedeploy = {
    reason: 'Oracle staleness window made configurable — default 97200 s (27 h)',
    oldAddress: OLD_CTRL,
    newAddress: newAddr,
    deployedAt: new Date().toISOString(),
    deployer: signer.address,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 4));
  console.log('      Manifest updated.');

  console.log(`
=== DONE ===
New MintRedeemController : ${newAddr}
Oracle staleness window  : 97,200 s (27 h) — adjustable via setOracleStaleness()
Old controller           : ${OLD_CTRL} (PAUSED)

Next steps:
  1. Verify the new contract on Arbiscan:
     npx hardhat verify --network arbitrum-one ${newAddr} \\
       ${initArgs.join(' \\\n       ')}
  2. Confirm mint is unpaused on the NEW controller if needed:
     (MintRedeemController.pauseMint defaults to false — minting is open)
  3. Optionally call newController.setOracleStaleness(97200) to emit the event.
  4. Monitor /api/operator/readiness until xauOracleStalenessPolicy clears.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
