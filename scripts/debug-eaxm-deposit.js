const { ethers } = require('hardhat');

const AXM_TOKEN = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const eAXM_VAULT = '0x8e28ffa89d168599156004db4f4d12c2af7c250e';
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

const EVK_ABI = [
  'function asset() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
  'function maxMint(address) view returns (uint256)',
  'function deposit(uint256,address) external returns (uint256)',
  'function hookConfig() view returns (address hookTarget, uint32 hookedOps)',
  'function caps() view returns (uint16 supplyCap, uint16 borrowCap)',
  'function LTVFull(address) view returns (uint16,uint16,uint16,uint32,address)',
  'function governorAdmin() view returns (address)',
  'function operationsDisabled() view returns (uint32)',
  'function isRecognizedCollateral(address) view returns (bool)',
  'function configFlags() view returns (uint32)',
  'function permit2Address() view returns (address)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = new ethers.Contract(eAXM_VAULT, EVK_ABI, signer);

  console.log('eAXM-1 vault:', eAXM_VAULT);
  const asset = await vault.asset().catch(() => 'err');
  console.log('asset():', asset);

  const hookCfg = await vault.hookConfig().catch(() => null);
  if (hookCfg) console.log('hookConfig: target=', hookCfg.hookTarget, 'hookedOps=', hookCfg.hookedOps.toString());

  const caps = await vault.caps().catch(() => null);
  if (caps) console.log('caps: supply=', caps.supplyCap.toString(), 'borrow=', caps.borrowCap.toString());

  const maxDep = await vault.maxDeposit(DEPLOYER).catch(e => 'ERR:' + e.message?.slice(0,60));
  console.log('maxDeposit(deployer):', typeof maxDep === 'bigint' ? ethers.formatUnits(maxDep, 18) : maxDep);

  const govAdmin = await vault.governorAdmin().catch(() => 'n/a');
  console.log('governorAdmin:', govAdmin);

  // Try small deposit
  const testAmount = ethers.parseUnits('1', 18); // 1 AXM
  console.log('\nTrying static call deposit(1 AXM)...');
  try {
    const shares = await vault.deposit.staticCall(testAmount, DEPLOYER);
    console.log('OK — would receive', ethers.formatUnits(shares, 18), 'shares');
  } catch(err) {
    const errMsg = err?.info?.error?.message || err?.reason || err?.message?.slice(0, 200);
    console.log('REVERT:', errMsg);
  }

  // Check configFlags
  const flags = await vault.configFlags().catch(() => null);
  if (flags !== null) console.log('configFlags:', flags.toString());
}
main().catch(e => { console.error(e?.message?.slice(0,200)); process.exit(1); });
