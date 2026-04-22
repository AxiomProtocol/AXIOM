const { ethers } = require('hardhat');

const USDC_AXUSD = '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8';
const AXM_POOL   = '0x981763699D269E129a08E216b1AeC7caa376A8a8';
const DEPLOYER   = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

const LPM_ADDRS = {
  'LPM_deploy_script': '0x5db58d9c21369d1532a48Bdd658E4Fe415404922',
  'LPM_contracts3643': '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F',
};
const FIRST_PARAMS = {
  'MODULAR_COMPLIANCE': '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD',
  'AXUSD_TOKEN(ERC3643)': '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  'ACTIVE_AXUSD':         '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C',
};

const LPM_ABI = [
  'function addPlatform(address,address) external',
  'function isPlatformWhitelisted(address,address) view returns (bool)',
  'function getPlatforms(address) view returns (address[])',
];

async function main() {
  const [signer] = await ethers.getSigners();

  for (const [lpmName, lpmAddr] of Object.entries(LPM_ADDRS)) {
    console.log(`\n=== LPM: ${lpmName} (${lpmAddr}) ===`);
    const lpm = new ethers.Contract(lpmAddr, LPM_ABI, signer);

    for (const [paramName, paramAddr] of Object.entries(FIRST_PARAMS)) {
      // getPlatforms
      const platforms = await lpm.getPlatforms(paramAddr).catch(e => null);
      if (platforms && platforms.length > 0) {
        const hasUsdc = platforms.some(p => p.toLowerCase() === USDC_AXUSD.toLowerCase());
        const hasAxm  = platforms.some(p => p.toLowerCase() === AXM_POOL.toLowerCase());
        console.log(`  getPlatforms(${paramName}): ${platforms.length} | USDC=${hasUsdc} AXM=${hasAxm}`);
        platforms.forEach((p,i) => console.log(`    [${i}] ${p}`));
      } else if (platforms) {
        console.log(`  getPlatforms(${paramName}): empty []`);
      } else {
        console.log(`  getPlatforms(${paramName}): REVERT`);
      }
      // isPlatformWhitelisted for USDC
      const usdcW = await lpm.isPlatformWhitelisted(paramAddr, USDC_AXUSD).catch(() => 'REV');
      const axmW  = await lpm.isPlatformWhitelisted(paramAddr, AXM_POOL).catch(() => 'REV');
      console.log(`  isPlatformWhitelisted(${paramName}, USDC_POOL)=${usdcW} | AXM_POOL=${axmW}`);
    }
  }
}
main().catch(e => { console.error(e?.message?.slice(0,200)); process.exit(1); });
