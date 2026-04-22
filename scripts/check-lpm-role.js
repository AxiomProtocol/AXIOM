const { ethers } = require('hardhat');

const LPM_ADDRESS = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922';
const COMPLIANCE  = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';
const DEPLOYER    = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const AXM_POOL    = '0x981763699D269E129a08E216b1AeC7caa376A8a8';
const USDC_AXUSD  = '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8';

const LPM_ABI = [
  'function isPlatformWhitelisted(address compliance, address platform) view returns (bool)',
  'function getPlatforms(address compliance) view returns (address[])',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function ADMIN_ROLE() view returns (bytes32)',
  'function owner() view returns (address)',
  'function addPlatform(address compliance, address platform) external',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  const lpm = new ethers.Contract(LPM_ADDRESS, LPM_ABI, signer);

  const [usdcW, axmW] = await Promise.all([
    lpm.isPlatformWhitelisted(COMPLIANCE, USDC_AXUSD).catch(e => 'err:'+e.message?.slice(0,40)),
    lpm.isPlatformWhitelisted(COMPLIANCE, AXM_POOL).catch(e => 'err:'+e.message?.slice(0,40)),
  ]);
  console.log('USDC/AXUSD whitelisted:', usdcW);
  console.log('AXM/AXUSD whitelisted: ', axmW);

  const owner = await lpm.owner().catch(() => 'no-owner-fn');
  console.log('LPM owner():', owner);
  console.log('signer:', signer.address);

  const adminRole = await lpm.DEFAULT_ADMIN_ROLE().catch(() => null);
  if (adminRole) {
    const has = await lpm.hasRole(adminRole, signer.address).catch(() => 'err');
    console.log('signer hasRole(DEFAULT_ADMIN_ROLE):', has, '  role:', adminRole);
  }
  const adminRole2 = await lpm.ADMIN_ROLE().catch(() => null);
  if (adminRole2) {
    const has2 = await lpm.hasRole(adminRole2, signer.address).catch(() => 'err');
    console.log('signer hasRole(ADMIN_ROLE):', has2, '  role:', adminRole2);
  }

  // Static call
  console.log('\nStatic call addPlatform(COMPLIANCE, AXM_POOL)...');
  try {
    await lpm.addPlatform.staticCall(COMPLIANCE, AXM_POOL);
    console.log('Static call OK — deployer can whitelist');
  } catch(err) {
    console.log('Static call reverted:', err?.reason || err?.info?.error?.message || err?.message?.slice(0,200));
  }

  // Current platforms
  const platforms = await lpm.getPlatforms(COMPLIANCE).catch(e => null);
  if (platforms) {
    console.log('\nCurrent platforms (', platforms.length, '):');
    platforms.forEach((p, i) => console.log(`  [${i}] ${p}`));
  }
}
main().catch(e => { console.error(e.message?.slice(0,200)); process.exit(1); });
