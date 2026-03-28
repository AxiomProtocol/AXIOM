/**
 * Fix eAXM-1 vault hookConfig: clear hookedOps to 0 so deposits/withdrawals work.
 * governorAdmin = deployer ✓
 */
const { ethers } = require('hardhat');

const eAXM_VAULT = '0x8e28ffa89d168599156004db4f4d12c2af7c250e';

const EVK_ABI = [
  'function hookConfig() view returns (address hookTarget, uint32 hookedOps)',
  'function setHookConfig(address newHookTarget, uint32 newHookedOps) external',
  'function maxDeposit(address) view returns (uint256)',
  'function deposit(uint256,address) external returns (uint256)',
  'function governorAdmin() view returns (address)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = new ethers.Contract(eAXM_VAULT, EVK_ABI, signer);

  const [hookBefore, maxBefore] = await Promise.all([
    vault.hookConfig(),
    vault.maxDeposit(signer.address),
  ]);
  console.log('Before: hookTarget=', hookBefore.hookTarget, 'hookedOps=', hookBefore.hookedOps.toString());
  console.log('Before: maxDeposit=', ethers.formatUnits(maxBefore, 18));

  // Static call first
  console.log('\nStatic call setHookConfig(address(0), 0)...');
  try {
    await vault.setHookConfig.staticCall('0x0000000000000000000000000000000000000000', 0);
    console.log('  Static call OK');
  } catch(e) {
    console.log('  Static call REVERT:', e?.reason || e?.message?.slice(0,100));
    process.exit(1);
  }

  const feeData = await ethers.provider.getFeeData();
  const nonce = await ethers.provider.getTransactionCount(signer.address, 'latest');
  const tx = await vault.setHookConfig('0x0000000000000000000000000000000000000000', 0, {
    nonce,
    gasLimit: 200_000,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });
  console.log('setHookConfig tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('Status:', receipt.status === 1 ? 'SUCCESS ✓' : 'REVERTED ✗');
  if (receipt.status !== 1) process.exit(1);

  const [hookAfter, maxAfter] = await Promise.all([
    vault.hookConfig(),
    vault.maxDeposit(signer.address),
  ]);
  console.log('\nAfter: hookTarget=', hookAfter.hookTarget, 'hookedOps=', hookAfter.hookedOps.toString());
  console.log('After: maxDeposit=', ethers.formatUnits(maxAfter, 18) === '0.0' ? '0 (no cap applied differently?)' : ethers.formatUnits(maxAfter, 18));
}
main().catch(e => { console.error(e?.reason || e?.message?.slice(0,200)); process.exit(1); });
