/**
 * upgrade-compliance-step2.js
 * Uses the already-deployed ModularComplianceV2 impl to:
 * 1. Upgrade the compliance proxy
 * 2. Whitelist EVC + EVK_FACTORY via callModuleFunction
 *
 * Run: npx hardhat run scripts/upgrade-compliance-step2.js --config hardhat.erc3643.config.ts --network arbitrum
 */
const { ethers } = require('hardhat');

const IMPL         = '0x3B89Ec0CC840e5E6C515ca532fD22c08C51887DF'; // deployed in step1
const COMPLIANCE   = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';
const LPM          = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const AXUSD_ERC3643= '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const EVC          = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';
const EVK_FACTORY  = '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e';

const ABI = [
  'function owner() view returns (address)',
  'function upgradeToAndCall(address newImpl, bytes calldata data) external',
  'function callModuleFunction(bytes calldata callData, address _module) external',
];
const LPM_ABI = [
  'function addPlatform(address token, address platform) external',
  'function isPlatformWhitelisted(address token, address platform) external view returns (bool)',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  // Sync nonce explicitly to avoid stale nonce issues
  const nonce = await ethers.provider.getTransactionCount(deployer.address, 'latest');
  console.log('Deployer:', deployer.address, '| On-chain nonce:', nonce);

  const compliance = new ethers.Contract(COMPLIANCE, ABI, deployer);

  // ── Step 2: Upgrade proxy ─────────────────────────────────────────────────
  console.log('\n[Step 2] Upgrading compliance proxy to ModularComplianceV2...');
  const upgradeTx = await compliance.upgradeToAndCall(IMPL, '0x', { nonce });
  await upgradeTx.wait(1);
  console.log('  TxHash:', upgradeTx.hash);

  // Verify new implementation
  const slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const stored = await ethers.provider.getStorage(COMPLIANCE, slot);
  console.log('  Impl slot now points to:', '0x' + stored.slice(26));

  // ── Step 3a: Whitelist EVC ────────────────────────────────────────────────
  console.log('\n[Step 3a] Whitelisting EVC via callModuleFunction...');
  const lpm = new ethers.Contract(LPM, LPM_ABI, deployer);
  const lpmIface = new ethers.Interface(LPM_ABI);

  async function whitelist(platform, label, extraNonce) {
    const already = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, platform).catch(() => false);
    if (already) { console.log(`  ${label} already whitelisted.`); return; }
    const callData = lpmIface.encodeFunctionData('addPlatform', [AXUSD_ERC3643, platform]);
    const tx = await compliance.callModuleFunction(callData, LPM, { nonce: extraNonce });
    await tx.wait(1);
    const ok = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, platform).catch(() => false);
    console.log(`  ${label} whitelisted: ${ok}. TxHash: ${tx.hash}`);
  }

  const currentNonce = await ethers.provider.getTransactionCount(deployer.address, 'latest');
  await whitelist(EVC, 'EVC', currentNonce);

  console.log('\n[Step 3b] Whitelisting EVK Factory...');
  const nonce2 = await ethers.provider.getTransactionCount(deployer.address, 'latest');
  await whitelist(EVK_FACTORY, 'EVK Factory', nonce2);

  console.log('\n✓ Compliance upgraded and platforms whitelisted.');
  console.log('  Now run deploy-axusd-evk-vault.js (Steps 2-5 will succeed)');
}

main().catch(e => { console.error(e); process.exit(1); });
