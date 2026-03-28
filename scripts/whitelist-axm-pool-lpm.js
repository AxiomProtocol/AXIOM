/**
 * Whitelist the AXM/AXUSD EulerSwap pool in the ERC-3643 LendingPlatformModule.
 * LPM.addPlatform(axusdToken, poolAddress)
 */
const { ethers } = require('hardhat');

const LPM_ADDRESS   = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F'; // LendingPlatformModule
const AXUSD_TOKEN   = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'; // ERC-3643 AXUSD (1st param)
const AXM_POOL      = '0x981763699D269E129a08E216b1AeC7caa376A8a8'; // AXM/AXUSD EulerSwap pool

const LPM_ABI = [
  'function addPlatform(address,address) external',
  'function isPlatformWhitelisted(address,address) view returns (bool)',
  'function getPlatforms(address) view returns (address[])',
  'function hasRole(bytes32,address) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const lpm = new ethers.Contract(LPM_ADDRESS, LPM_ABI, signer);
  console.log('Signer:', signer.address);

  // Verify roles
  const adminRole = await lpm.DEFAULT_ADMIN_ROLE().catch(() => null);
  if (adminRole) {
    const has = await lpm.hasRole(adminRole, signer.address).catch(() => false);
    console.log('Has DEFAULT_ADMIN_ROLE:', has);
  }

  // Check current state
  const already = await lpm.isPlatformWhitelisted(AXUSD_TOKEN, AXM_POOL).catch(() => false);
  if (already) { console.log('[OK] Pool already whitelisted in LPM'); return; }
  console.log('Pool not yet whitelisted — whitelisting now...');

  // Get current platforms count
  const before = await lpm.getPlatforms(AXUSD_TOKEN).catch(() => []);
  console.log('Platforms before:', before.length);

  // Whitelist
  const nonce = await ethers.provider.getTransactionCount(signer.address, 'latest');
  const tx = await lpm.addPlatform(AXUSD_TOKEN, AXM_POOL, { gasLimit: 300_000, nonce });
  console.log('addPlatform tx:', tx.hash);
  await tx.wait();
  console.log('[OK] Whitelisted!');

  // Verify
  const after = await lpm.getPlatforms(AXUSD_TOKEN).catch(() => []);
  console.log('Platforms after:', after.length);
  const idx = after.findIndex(p => p.toLowerCase() === AXM_POOL.toLowerCase());
  console.log('AXM pool at index:', idx);
  const verified = await lpm.isPlatformWhitelisted(AXUSD_TOKEN, AXM_POOL).catch(() => false);
  console.log('isPlatformWhitelisted:', verified, verified ? '✓' : '✗');
}
main().catch(e => { console.error(e?.reason || e?.message?.slice(0, 300)); process.exit(1); });
