const { ethers } = require('hardhat');

const LPM = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const USDC_AXUSD_POOL = '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8';
const AXM_POOL = '0x981763699D269E129a08E216b1AeC7caa376A8a8';

// All AXUSD token variants to try as compliance/token arg
const tokens = {
  'ERC3643_AXUSD (new)': '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  'ACTIVE_AXUSD':         '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C',
  'EULER_AXUSD':          '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
  'MODULAR_COMPLIANCE':   '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD',
  'zero':                 '0x0000000000000000000000000000000000000000',
};

const LPM_ABI = [
  'function getPlatforms(address) view returns (address[])',
  'function isPlatformWhitelisted(address,address) view returns (bool)',
  'function addPlatform(address,address) external',
  'function hasRole(bytes32,address) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function getRoleAdmin(bytes32) view returns (bytes32)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const lpm = new ethers.Contract(LPM, LPM_ABI, signer);
  console.log('Signer:', signer.address);

  // Check role
  const adminRole = await lpm.DEFAULT_ADMIN_ROLE();
  const hasRole = await lpm.hasRole(adminRole, signer.address);
  console.log('Has DEFAULT_ADMIN_ROLE:', hasRole, '| role:', adminRole);
  const roleAdmin = await lpm.getRoleAdmin(adminRole).catch(() => 'n/a');
  console.log('Role admin of DEFAULT_ADMIN_ROLE:', roleAdmin);

  // Try each token variant for getPlatforms
  console.log('\n--- getPlatforms(tokenVariant) ---');
  for (const [name, addr] of Object.entries(tokens)) {
    const platforms = await lpm.getPlatforms(addr).catch(e => 'ERR:'+e.message?.slice(0,40));
    const count = Array.isArray(platforms) ? platforms.length : platforms;
    const hasUsdc = Array.isArray(platforms) && platforms.some(p => p.toLowerCase() === USDC_AXUSD_POOL.toLowerCase());
    console.log(`  ${name}: ${count} platforms${hasUsdc ? ' ← USDC/AXUSD found!' : ''}`);
    if (Array.isArray(platforms) && platforms.length > 0) {
      platforms.forEach((p, i) => console.log(`    [${i}] ${p}`));
    }
  }

  // Try static call addPlatform with each token variant
  console.log('\n--- staticCall addPlatform(tokenVariant, AXM_POOL) ---');
  for (const [name, addr] of Object.entries(tokens)) {
    try {
      await lpm.addPlatform.staticCall(addr, AXM_POOL);
      console.log(`  ${name}: OK (would succeed)`);
    } catch(err) {
      console.log(`  ${name}: REVERT - ${err?.reason || err?.message?.slice(0,60)}`);
    }
  }
}
main().catch(e => { console.error(e?.message?.slice(0,200)); process.exit(1); });
