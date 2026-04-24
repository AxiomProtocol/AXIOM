/**
 * Whitelist the AXM/AXUSD EulerSwap pool in LendingPlatformModule.
 * CORRECT CALL: LPM.addPlatform(MODULAR_COMPLIANCE, AXM_POOL)
 * LPM      = 0xC0177120Fb5922813031a5857f4dF7F01750Bb6F
 * Param1   = 0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD (MODULAR_COMPLIANCE)
 * Platform = 0x981763699D269E129a08E216b1AeC7caa376A8a8 (AXM/AXUSD pool)
 */
const { ethers } = require('hardhat');

const LPM              = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const MODULAR_COMP     = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';
const AXM_POOL         = '0x981763699D269E129a08E216b1AeC7caa376A8a8';

const LPM_ABI = [
  'function addPlatform(address,address) external',
  'function isPlatformWhitelisted(address,address) view returns (bool)',
  'function getPlatforms(address) view returns (address[])',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const lpm = new ethers.Contract(LPM, LPM_ABI, signer);
  console.log('Signer:', signer.address);
  const bal = await ethers.provider.getBalance(signer.address);
  console.log('ETH balance:', ethers.formatEther(bal));

  // State before
  const already = await lpm.isPlatformWhitelisted(MODULAR_COMP, AXM_POOL).catch(() => false);
  if (already) {
    console.log('[OK] AXM/AXUSD pool already whitelisted — done');
    return;
  }
  const before = await lpm.getPlatforms(MODULAR_COMP).catch(() => []);
  console.log('Platforms before:', before.length);

  // Static call to confirm it won't revert
  console.log('Running static call...');
  try {
    await lpm.addPlatform.staticCall(MODULAR_COMP, AXM_POOL);
    console.log('  Static call OK — tx will succeed');
  } catch(e) {
    console.log('  Static call REVERT:', e?.reason || e?.message?.slice(0,120));
    console.log('  Proceeding anyway...');
  }

  const nonce = await ethers.provider.getTransactionCount(signer.address, 'latest');
  console.log('Nonce:', nonce);
  const feeData = await ethers.provider.getFeeData();
  const tx = await lpm.addPlatform(MODULAR_COMP, AXM_POOL, {
    gasLimit: 200_000,
    nonce,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });
  console.log('TX sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('TX mined in block', receipt.blockNumber, '| status', receipt.status === 1 ? 'SUCCESS ✓' : 'REVERTED ✗');
  if (receipt.status !== 1) process.exit(1);

  // Verify
  const after = await lpm.getPlatforms(MODULAR_COMP).catch(() => []);
  console.log('Platforms after:', after.length);
  const idx = after.findIndex(p => p.toLowerCase() === AXM_POOL.toLowerCase());
  console.log('AXM pool index:', idx);
  const v = await lpm.isPlatformWhitelisted(MODULAR_COMP, AXM_POOL).catch(() => false);
  console.log('isPlatformWhitelisted:', v, v ? '✓' : '✗');
}
main().catch(e => { console.error(e?.reason || e?.message?.slice(0,300)); process.exit(1); });
