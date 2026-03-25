/**
 * AXIOM Protocol — EVK Open Money Market Vault Deployment Script
 * Task #38: New AXUSD EVK Open Money Market
 *
 * Deployment order:
 *   1. This script runs AFTER scripts/deploy-axusd-oracle.js (oracle must exist)
 *   2. Whitelist EVC + EVK Factory in LendingPlatformModule (ERC-3643 prerequisite)
 *   3. Deploy Linear Kink IRM via IRMFactory (address captured via staticCall)
 *   4. Deploy AXUSD EVK vault via EVK Factory
 *   5. Whitelist vault in LPM
 *   6. Configure vault: set IRM, oracle, LTV, supply cap, borrow cap
 *   7. Governor remains deployer; transfer via governance multisig after seeding
 *
 * Run:
 *   AXUSD_ORACLE_ADAPTER=<oracleAddr> npx hardhat run scripts/deploy-axusd-evk-vault.js --network arbitrumOne
 *
 * After deployment update these four constants:
 *   shared/contracts.ts            → EVK_OPEN_MARKET_VAULT, EVK_OPEN_MARKET_IRM, EVK_OPEN_MARKET_GOVERNOR
 *   src/config/activeContracts.generated.ts → EVK_OPEN_MARKET_VAULT_ADDRESS, EVK_OPEN_MARKET_IRM_ADDRESS, EVK_OPEN_MARKET_GOVERNOR_ADDRESS
 */

const { ethers } = require('hardhat');

// ── Arbitrum One canonical addresses ─────────────────────────────────────────
const EVK_FACTORY    = '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e';
const EVC            = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';
const IRM_FACTORY    = '0xE1C43c63EC62E0B8dcE0e98Da08E9fa48cAC4D40';

// ERC-3643 AXUSD token (asset for the new vault)
const AXUSD_ERC3643  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
// USDC on Arbitrum One
const USDC           = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
// ERC-7726 AXIOMOracleAdapter — set via env or update this script after deploy-axusd-oracle.js
const ORACLE_ADAPTER = process.env.AXUSD_ORACLE_ADAPTER || '0x0000000000000000000000000000000000000000';
// Lending Platform Module (ERC-3643 compliance module)
const LPM            = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';

// ── IRM Parameters (LinearKink) ───────────────────────────────────────────────
// All rates in WAD/second. Annual rates: ratePerSecond = APR_pct / 100 / SECONDS_PER_YEAR
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
const WAD = ethers.parseEther('1'); // 1e18

function aprToWadPerSec(aprPct) {
  return (BigInt(Math.round(aprPct * 1e6)) * WAD) / (100n * 1_000_000n * SECONDS_PER_YEAR);
}

// LinearKink: base=1%, 5% at 80% kink, 100% above kink
const IRM_BASE_RATE = aprToWadPerSec(1);
const IRM_SLOPE1    = aprToWadPerSec(5);
const IRM_SLOPE2    = aprToWadPerSec(100);
const IRM_KINK      = ethers.parseEther('0.80'); // 80% utilization (WAD)

// ── Vault Parameters ──────────────────────────────────────────────────────────
const BORROW_LTV      = 9000;  // 90.00% in basis points
const LIQUIDATION_LTV = 9500;  // 95.00% liquidation LTV

// EVK AmountCap encoding: uint16 = (mantissa << 6) | exponent
// amount_in_asset_units = (mantissa * 10^exponent) / 1e9
// For 500K AXUSD (18 dec): 500000e18 = 5e23 → need 5e23*1e9=5e32 → mantissa=5, exp=32
// For 1M   AXUSD (18 dec): 1000000e18 = 1e24 → need 1e24*1e9=1e33 → mantissa=1, exp=33
function encodeAmountCap(mantissa, exponent) {
  return (mantissa << 6) | exponent;
}
const SUPPLY_CAP_UINT16 = encodeAmountCap(1, 33); // 1M AXUSD
const BORROW_CAP_UINT16 = encodeAmountCap(5, 32); // 500K AXUSD

// ── ABIs ──────────────────────────────────────────────────────────────────────
const EVK_FACTORY_ABI = [
  'function createProxy(address implementation, bool upgradeable, bytes calldata trailingData) external returns (address)',
  'function getProxyListLength() external view returns (uint256)',
  'function getProxyListSlice(uint256 start, uint256 end) external view returns (address[] memory list)',
];

const EVK_VAULT_ABI = [
  'function setInterestRateModel(address newModel) external',
  'function setOracle(address newOracle) external',
  'function setLTV(address collateral, uint16 borrowLTV, uint16 liquidationLTV, uint32 rampDuration) external',
  'function setCaps(uint16 supplyCap, uint16 borrowCap) external',
  'function setGovernorAdmin(address newGovernorAdmin) external',
  'function asset() external view returns (address)',
  'function governorAdmin() external view returns (address)',
  'function oracle() external view returns (address)',
  'function interestRateModel() external view returns (address)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
];

const IRM_FACTORY_ABI = [
  'function deploy(uint256 baseRate, uint256 slope1, uint256 slope2, uint256 kink) external returns (address)',
];

const LPM_ABI = [
  'function addPlatform(address token, address platform) external',
  'function isPlatformWhitelisted(address token, address platform) external view returns (bool)',
  'function getPlatforms(address token) external view returns (address[])',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  if (ORACLE_ADAPTER === '0x0000000000000000000000000000000000000000') {
    console.warn('WARNING: AXUSD_ORACLE_ADAPTER is not set. Deploy oracle first:');
    console.warn('  npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne');
    console.warn('  Then set AXUSD_ORACLE_ADAPTER env var.');
    // Continue — oracle can be set post-deployment via vault.setOracle() as governor
  }

  const lpm = new ethers.Contract(LPM, LPM_ABI, deployer);
  const irmFactory = new ethers.Contract(IRM_FACTORY, IRM_FACTORY_ABI, deployer);
  const factory = new ethers.Contract(EVK_FACTORY, EVK_FACTORY_ABI, deployer);

  // ── Step 1a: Whitelist EVC in LPM ─────────────────────────────────────────
  console.log('\n[Step 1a] Whitelisting EVC in LendingPlatformModule...');
  const evcWhitelisted = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, EVC).catch(() => false);
  if (!evcWhitelisted) {
    const tx = await lpm.addPlatform(AXUSD_ERC3643, EVC);
    await tx.wait(1);
    console.log('  EVC whitelisted. TxHash:', tx.hash);
  } else {
    console.log('  EVC already whitelisted.');
  }

  // ── Step 1b: Whitelist EVK Factory in LPM ─────────────────────────────────
  console.log('\n[Step 1b] Whitelisting EVK Factory in LendingPlatformModule...');
  const factoryWhitelisted = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, EVK_FACTORY).catch(() => false);
  if (!factoryWhitelisted) {
    const tx = await lpm.addPlatform(AXUSD_ERC3643, EVK_FACTORY);
    await tx.wait(1);
    console.log('  EVK Factory whitelisted. TxHash:', tx.hash);
  } else {
    console.log('  EVK Factory already whitelisted.');
  }

  // ── Step 2: Deploy Linear Kink IRM ───────────────────────────────────────
  // Use staticCall first to capture the return address, then send the actual tx.
  console.log('\n[Step 2] Deploying Linear Kink IRM via IRMFactory...');
  console.log('  Parameters:');
  console.log('    baseRate (WAD/s):', IRM_BASE_RATE.toString(), '≈ 1% APR');
  console.log('    slope1   (WAD/s):', IRM_SLOPE1.toString(), '≈ 5% APR at kink');
  console.log('    slope2   (WAD/s):', IRM_SLOPE2.toString(), '≈ 100% APR max');
  console.log('    kink     (WAD):  ', IRM_KINK.toString(), '= 80% utilization');

  // staticCall gives us the deterministic return value without sending a tx
  const irmAddress = await irmFactory.deploy.staticCall(IRM_BASE_RATE, IRM_SLOPE1, IRM_SLOPE2, IRM_KINK);
  console.log('  Expected IRM address (from staticCall):', irmAddress);

  const irmTx = await irmFactory.deploy(IRM_BASE_RATE, IRM_SLOPE1, IRM_SLOPE2, IRM_KINK);
  const irmReceipt = await irmTx.wait(1);
  console.log('  IRM deployed. TxHash:', irmTx.hash);
  console.log('  Confirmed IRM address:', irmAddress);

  // ── Step 3: Deploy EVK vault ──────────────────────────────────────────────
  console.log('\n[Step 3] Deploying AXUSD EVK vault via EVK Factory...');
  const unitOfAccount = USDC; // USD reference token
  const trailingData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'address', 'address'],
    [AXUSD_ERC3643, ORACLE_ADAPTER, unitOfAccount, deployer.address]
  );

  const listLenBefore = await factory.getProxyListLength();
  const deployTx = await factory.createProxy(
    '0x0000000000000000000000000000000000000000', // implementation=0 → factory default
    true,         // upgradeable
    trailingData,
    { gasLimit: 3_000_000 }
  );
  await deployTx.wait(1);
  console.log('  Vault deployment TxHash:', deployTx.hash);

  const listLenAfter = await factory.getProxyListLength();
  const vaults = await factory.getProxyListSlice(listLenBefore, listLenAfter);
  const vaultAddress = vaults[vaults.length - 1];
  console.log('  Vault deployed at:', vaultAddress);

  const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, deployer);

  // ── Step 4: Whitelist vault in LPM ───────────────────────────────────────
  console.log('\n[Step 4] Whitelisting vault in LendingPlatformModule...');
  const vaultWhitelisted = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, vaultAddress).catch(() => false);
  if (!vaultWhitelisted) {
    const tx = await lpm.addPlatform(AXUSD_ERC3643, vaultAddress);
    await tx.wait(1);
    console.log('  Vault whitelisted. TxHash:', tx.hash);
  } else {
    console.log('  Vault already whitelisted.');
  }

  // ── Step 5: Configure vault (IRM, oracle, LTV, caps) ─────────────────────
  console.log('\n[Step 5] Configuring vault...');

  // 5a: IRM
  const irmSetTx = await vault.setInterestRateModel(irmAddress);
  await irmSetTx.wait(1);
  console.log('  IRM set. TxHash:', irmSetTx.hash);

  // 5b: Oracle (if deployed)
  if (ORACLE_ADAPTER !== '0x0000000000000000000000000000000000000000') {
    const oracleTx = await vault.setOracle(ORACLE_ADAPTER);
    await oracleTx.wait(1);
    console.log('  Oracle set. TxHash:', oracleTx.hash);
  } else {
    console.log('  Oracle skipped (zero address). Run vault.setOracle(<oracleAddr>) after deploying oracle.');
  }

  // 5c: USDC collateral LTV
  const ltvTx = await vault.setLTV(USDC, BORROW_LTV, LIQUIDATION_LTV, 0);
  await ltvTx.wait(1);
  console.log('  USDC LTV set (90% borrow / 95% liq). TxHash:', ltvTx.hash);

  // 5d: Supply + borrow caps (set at launch, not deferred to governance)
  const capsTx = await vault.setCaps(SUPPLY_CAP_UINT16, BORROW_CAP_UINT16);
  await capsTx.wait(1);
  console.log('  Caps set (1M supply / 500K borrow). TxHash:', capsTx.hash);
  console.log('  SUPPLY_CAP_UINT16:', SUPPLY_CAP_UINT16, '| BORROW_CAP_UINT16:', BORROW_CAP_UINT16);

  // ── Step 6: Confirm governor ──────────────────────────────────────────────
  const governorAddr = await vault.governorAdmin();
  console.log('\n[Step 6] Governor admin:', governorAddr);
  console.log('  Transfer via vault.setGovernorAdmin(<multisig>) once operational.');

  // ── Final LPM audit ────────────────────────────────────────────────────────
  console.log('\n[Audit] LPM whitelisted platforms for AXUSD_ERC3643:');
  const platforms = await lpm.getPlatforms(AXUSD_ERC3643).catch(() => []);
  for (const p of platforms) console.log('  ', p);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('Deployment Summary');
  console.log('========================================');
  console.log('Vault Address:          ', vaultAddress);
  console.log('IRM Address:            ', irmAddress);
  console.log('Oracle Adapter:         ', ORACLE_ADAPTER);
  console.log('Governor Admin:         ', governorAddr);
  console.log('Asset:                  ', AXUSD_ERC3643, '(ERC-3643 AXUSD)');
  console.log('Collateral:             ', USDC, '(USDC at 90% borrow LTV / 95% liq LTV)');
  console.log('Supply Cap:             1,000,000 AXUSD (AmountCap uint16:', SUPPLY_CAP_UINT16, ')');
  console.log('Borrow Cap:               500,000 AXUSD (AmountCap uint16:', BORROW_CAP_UINT16, ')');
  console.log('LPM Whitelisted:         EVC + EVK Factory + Vault');
  console.log('');
  console.log('Update the following constants after deployment:');
  console.log('  shared/contracts.ts:');
  console.log('    EVK_OPEN_MARKET_VAULT:     "' + vaultAddress + '"');
  console.log('    EVK_OPEN_MARKET_IRM:       "' + irmAddress + '"');
  console.log('    EVK_OPEN_MARKET_GOVERNOR:  "' + governorAddr + '"');
  console.log('  src/config/activeContracts.generated.ts:');
  console.log('    EVK_OPEN_MARKET_VAULT_ADDRESS:    "' + vaultAddress + '"');
  console.log('    EVK_OPEN_MARKET_IRM_ADDRESS:      "' + irmAddress + '"');
  console.log('    EVK_OPEN_MARKET_GOVERNOR_ADDRESS: "' + governorAddr + '"');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
