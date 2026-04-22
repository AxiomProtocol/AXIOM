/**
 * whitelist-evk-platforms.js
 * Whitelists EVC + EVK_FACTORY + VAULT in LPM using the correct parameter order:
 *   lpm.addPlatform(COMPLIANCE_ADDR, platform) -- onlyOwner (deployer)
 *
 * Run: npx hardhat run scripts/whitelist-evk-platforms.js --network arbitrum
 */
const { ethers } = require('hardhat');

const LPM          = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const COMPLIANCE   = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD'; // first param to addPlatform
const EVC          = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';
const EVK_FACTORY  = '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e';

const LPM_ABI = [
  // First param is the COMPLIANCE address, second is the platform to whitelist
  'function addPlatform(address _compliance, address _platform) external',
  'function isPlatformWhitelisted(address _compliance, address _platform) external view returns (bool)',
  'function owner() view returns (address)',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  const lpm = new ethers.Contract(LPM, LPM_ABI, deployer);

  const lpmOwner = await lpm.owner();
  console.log('LPM owner:', lpmOwner);
  console.log('Match:', lpmOwner.toLowerCase() === deployer.address.toLowerCase(), '\n');

  const platforms = [
    [EVC,         'EVC'],
    [EVK_FACTORY, 'EVK Factory'],
  ];

  for (const [platform, label] of platforms) {
    const already = await lpm.isPlatformWhitelisted(COMPLIANCE, platform);
    if (already) {
      console.log(`✓ ${label} already whitelisted`);
      continue;
    }
    const tx = await lpm.addPlatform(COMPLIANCE, platform);
    await tx.wait(1);
    const confirmed = await lpm.isPlatformWhitelisted(COMPLIANCE, platform);
    console.log(`✓ ${label} whitelisted: ${confirmed} | tx: ${tx.hash}`);
  }

  console.log('\nDone. Ready for deploy-axusd-evk-vault.js');
}

main().catch(e => { console.error(e); process.exit(1); });
