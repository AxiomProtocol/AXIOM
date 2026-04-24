/**
 * upgrade-compliance-v2.js
 *
 * 1. Deploys ModularComplianceV2 (adds callModuleFunction)
 * 2. Upgrades AXUSD compliance proxy to the new impl
 * 3. Uses callModuleFunction to whitelist EVC + EVK_FACTORY in LPM
 *
 * Run:
 *   npx hardhat run scripts/upgrade-compliance-v2.js \
 *     --config hardhat.erc3643.config.ts --network arbitrum
 */
const { ethers } = require('hardhat');

const COMPLIANCE   = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';
const LPM          = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const AXUSD_ERC3643= '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const EVC          = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';
const EVK_FACTORY  = '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e';

const COMPLIANCE_V2_ABI = [
  'function owner() view returns (address)',
  'function isModuleBound(address) view returns (bool)',
  'function getModules() view returns (address[])',
  'function upgradeToAndCall(address newImpl, bytes calldata data) external',
  'function callModuleFunction(bytes calldata callData, address _module) external',
];

const LPM_ABI = [
  'function addPlatform(address token, address platform) external',
  'function isPlatformWhitelisted(address token, address platform) external view returns (bool)',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(bal), 'ETH\n');

  // ── Step 1: Deploy ModularComplianceV2 implementation ─────────────────────
  console.log('[Step 1] Deploying ModularComplianceV2 implementation...');
  const Factory = await ethers.getContractFactory('ModularComplianceV2');
  const impl = await Factory.deploy();
  await impl.waitForDeployment();
  const implAddress = await impl.getAddress();
  console.log('  ModularComplianceV2 impl deployed at:', implAddress);

  // ── Step 2: Upgrade the AXUSD compliance proxy ────────────────────────────
  console.log('\n[Step 2] Upgrading AXUSD compliance proxy to V2...');
  const compliance = new ethers.Contract(COMPLIANCE, COMPLIANCE_V2_ABI, deployer);
  const owner = await compliance.owner();
  console.log('  Compliance owner:', owner);
  console.log('  Deployer match:', owner.toLowerCase() === deployer.address.toLowerCase());

  // upgradeToAndCall with empty calldata (no re-initialization needed)
  const upgradeTx = await compliance.upgradeToAndCall(implAddress, '0x');
  await upgradeTx.wait(1);
  console.log('  Upgraded! TxHash:', upgradeTx.hash);

  // Verify upgrade
  const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const newImpl = await ethers.provider.getStorage(COMPLIANCE, implSlot);
  console.log('  New impl slot value:', '0x' + newImpl.slice(26));

  // ── Step 3: Whitelist via callModuleFunction ──────────────────────────────
  const lpmInterface = new ethers.Interface(LPM_ABI);
  const lpm = new ethers.Contract(LPM, LPM_ABI, deployer);

  async function whitelistPlatform(platform, label) {
    const already = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, platform).catch(() => false);
    if (already) { console.log(`  ${label} already whitelisted.`); return; }
    const callData = lpmInterface.encodeFunctionData('addPlatform', [AXUSD_ERC3643, platform]);
    const tx = await compliance.callModuleFunction(callData, LPM);
    await tx.wait(1);
    const confirmed = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, platform).catch(() => false);
    console.log(`  ${label} whitelisted: ${confirmed}. TxHash: ${tx.hash}`);
  }

  console.log('\n[Step 3a] Whitelisting EVC...');
  await whitelistPlatform(EVC, 'EVC');

  console.log('\n[Step 3b] Whitelisting EVK Factory...');
  await whitelistPlatform(EVK_FACTORY, 'EVK Factory');

  console.log('\n✓ All done. Ready to run deploy-axusd-evk-vault.js');
  console.log('  ModularComplianceV2 impl:', implAddress);
  console.log('  Compliance proxy (unchanged):', COMPLIANCE);
}

main().catch(err => { console.error(err); process.exit(1); });
