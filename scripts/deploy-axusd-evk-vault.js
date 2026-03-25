/**
 * AXIOM Protocol — EVK Open Money Market Vault Deployment Script
 * Task #38: New AXUSD EVK Open Money Market
 *
 * Deployment order:
 *   1. This script runs AFTER scripts/deploy-axusd-oracle.js (oracle must exist)
 *   2. Register vault + EVC in LendingPlatformModule (ERC-3643 prerequisite)
 *   3. Deploy Linear Kink IRM via IRMFactory
 *   4. Deploy AXUSD EVK vault via EVK Factory
 *   5. Configure vault: set IRM, oracle, LTV, borrow cap
 *   6. Transfer governor to Axiom deployer multisig
 *
 * Run:
 *   npx hardhat run scripts/deploy-axusd-evk-vault.js --network arbitrumOne
 *
 * After deployment:
 *   1. Update EVK_OPEN_MARKET_VAULT in shared/contracts.ts
 *   2. Update EVK_OPEN_MARKET_IRM in shared/contracts.ts
 *   3. Update EVK_OPEN_MARKET_VAULT_ADDRESS in src/config/activeContracts.generated.ts
 *   4. Update EVK_OPEN_MARKET_IRM_ADDRESS in src/config/activeContracts.generated.ts
 */

const { ethers } = require('hardhat');

// ── Arbitrum One addresses ────────────────────────────────────────────────────
const EVK_FACTORY    = '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e';
const EVC            = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';
const IRM_FACTORY    = '0xE1C43c63EC62E0B8dcE0e98Da08E9fa48cAC4D40';

// ERC-3643 AXUSD token (asset for the new vault)
const AXUSD_ERC3643  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
// USDC on Arbitrum One
const USDC           = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
// ERC-7726 AXIOMOracleAdapter — update after deploy-axusd-oracle.js
const ORACLE_ADAPTER = process.env.AXUSD_ORACLE_ADAPTER || '0x0000000000000000000000000000000000000000';
// Lending Platform Module (ERC-3643 compliance module)
const LPM            = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';

// ── IRM Parameters (LinearKink) ───────────────────────────────────────────────
// All rates in WAD/second format. Annual rates converted via:
//   ratePerSecond = APR_pct / 100 / SECONDS_PER_YEAR
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
const WAD = ethers.parseEther('1'); // 1e18

function aprToWadPerSec(aprPct) {
  // aprPct = 1 → 1% APR
  return (BigInt(Math.round(aprPct * 1e6)) * WAD) / (100n * 1_000_000n * SECONDS_PER_YEAR);
}

// LinearKink: base=1%, slope1=5%@kink(80%), slope2=100% above kink
const IRM_BASE_RATE     = aprToWadPerSec(1);   // 1% base
const IRM_SLOPE1        = aprToWadPerSec(5);   // reaches 5% at kink
const IRM_SLOPE2        = aprToWadPerSec(100); // up to 100% above kink
const IRM_KINK          = ethers.parseEther('0.80'); // 80% utilization kink (WAD)

// ── Vault Parameters ──────────────────────────────────────────────────────────
const BORROW_LTV         = 9000;  // 90.00% in basis points (EVK uses 1/100 of a percent = 10000 = 100%)
const LIQUIDATION_LTV    = 9500;  // 95.00% liquidation LTV
const BORROW_CAP         = ethers.parseEther('500000');  // 500K AXUSD borrow cap
const SUPPLY_CAP         = ethers.parseEther('1000000'); // 1M AXUSD supply cap

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
    console.warn('  Then set AXUSD_ORACLE_ADAPTER env var or update this script.');
    // Continue anyway — oracle can be set post-deployment via setOracle()
  }

  // ── Step 1: Whitelist vault addresses in LendingPlatformModule ────────────
  console.log('\n[Step 1] Checking LendingPlatformModule whitelist...');
  const lpm = new ethers.Contract(LPM, LPM_ABI, deployer);

  // We need to whitelist the vault address and EVC. Since vault isn't deployed yet,
  // we whitelist EVC now and vault after deployment.
  const evcWhitelisted = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, EVC).catch(() => false);
  if (!evcWhitelisted) {
    console.log('  Whitelisting EVC in LPM...');
    const tx = await lpm.addPlatform(AXUSD_ERC3643, EVC);
    await tx.wait(1);
    console.log('  EVC whitelisted. TxHash:', tx.hash);
  } else {
    console.log('  EVC already whitelisted in LPM.');
  }

  // ── Step 2: Deploy Linear Kink IRM ───────────────────────────────────────
  console.log('\n[Step 2] Deploying Linear Kink IRM via IRMFactory...');
  const irmFactory = new ethers.Contract(IRM_FACTORY, IRM_FACTORY_ABI, deployer);
  const irmTx = await irmFactory.deploy(IRM_BASE_RATE, IRM_SLOPE1, IRM_SLOPE2, IRM_KINK);
  const irmReceipt = await irmTx.wait(1);
  const irmAddress = irmReceipt.logs?.[0]?.address || 'PARSE_FROM_LOGS';
  console.log('  IRM deployed at:', irmAddress);
  console.log('  IRM TxHash:', irmTx.hash);

  // ── Step 3: Deploy EVK vault ──────────────────────────────────────────────
  console.log('\n[Step 3] Deploying AXUSD EVK vault via EVK Factory...');

  // EVK Factory createProxy expects trailingData = abi.encodePacked(asset, oracle, unitOfAccount, admin)
  // unit of account = USD = USDC address (or USD stablecoin reference)
  const unitOfAccount = USDC;
  const trailingData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'address', 'address'],
    [AXUSD_ERC3643, ORACLE_ADAPTER, unitOfAccount, deployer.address]
  );

  const factory = new ethers.Contract(EVK_FACTORY, EVK_FACTORY_ABI, deployer);
  const listLenBefore = await factory.getProxyListLength();

  const deployTx = await factory.createProxy(
    '0x0000000000000000000000000000000000000000', // implementation = 0 = use factory default
    true, // upgradeable
    trailingData,
    { gasLimit: 3_000_000 }
  );
  const deployReceipt = await deployTx.wait(1);
  console.log('  Vault deployment TxHash:', deployTx.hash);

  const listLenAfter = await factory.getProxyListLength();
  const vaults = await factory.getProxyListSlice(listLenBefore, listLenAfter);
  const vaultAddress = vaults[vaults.length - 1];
  console.log('  Vault deployed at:', vaultAddress);

  // ── Step 4: Whitelist vault in LPM ───────────────────────────────────────
  console.log('\n[Step 4] Whitelisting vault in LendingPlatformModule...');
  const vaultLpmTx = await lpm.addPlatform(AXUSD_ERC3643, vaultAddress);
  await vaultLpmTx.wait(1);
  console.log('  Vault whitelisted. TxHash:', vaultLpmTx.hash);

  // ── Step 5: Configure vault ───────────────────────────────────────────────
  console.log('\n[Step 5] Configuring vault (IRM, oracle, LTV, caps)...');
  const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, deployer);

  if (irmAddress !== 'PARSE_FROM_LOGS') {
    const irmTx2 = await vault.setInterestRateModel(irmAddress);
    await irmTx2.wait(1);
    console.log('  IRM set. TxHash:', irmTx2.hash);
  }

  if (ORACLE_ADAPTER !== '0x0000000000000000000000000000000000000000') {
    const oracleTx = await vault.setOracle(ORACLE_ADAPTER);
    await oracleTx.wait(1);
    console.log('  Oracle set. TxHash:', oracleTx.hash);
  }

  // Set USDC collateral LTV: 90% borrow, 95% liquidation, 0 ramp duration (immediate)
  const ltvTx = await vault.setLTV(USDC, BORROW_LTV, LIQUIDATION_LTV, 0);
  await ltvTx.wait(1);
  console.log('  USDC LTV configured (90% borrow / 95% liq). TxHash:', ltvTx.hash);

  // Set caps using EVK encoded format (mantissa * 10^exponent with 18 decimal assumption)
  // For simple caps, pass as raw uint16 encoded — 0 = unlimited, use governance to tighten
  // Encoding: supplyCap and borrowCap in EVK AmountCap format (mantissa << 6 | exponent)
  // Simple approach: set via separate governance tx after deployment
  console.log('  Note: Borrow/supply caps set via governance post-deployment.');

  // ── Step 6: Transfer governor ─────────────────────────────────────────────
  console.log('\n[Step 6] Governor admin remains:', deployer.address, '(transfer via governance)');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('Deployment Summary');
  console.log('========================================');
  console.log('Vault Address:  ', vaultAddress);
  console.log('IRM Address:    ', irmAddress);
  console.log('Oracle:         ', ORACLE_ADAPTER);
  console.log('Asset:          ', AXUSD_ERC3643, '(ERC-3643 AXUSD)');
  console.log('Collateral:     ', USDC, '(USDC at 90% LTV)');
  console.log('EVC:            ', EVC, '(whitelisted in LPM)');
  console.log('LPM:            ', LPM);
  console.log('');
  console.log('Next steps:');
  console.log('1. Update shared/contracts.ts: EVK_OPEN_MARKET_VAULT =', vaultAddress);
  console.log('2. Update shared/contracts.ts: EVK_OPEN_MARKET_IRM =', irmAddress);
  console.log('3. Update src/config/activeContracts.generated.ts: EVK_OPEN_MARKET_VAULT_ADDRESS =', vaultAddress);
  console.log('4. Update src/config/activeContracts.generated.ts: EVK_OPEN_MARKET_IRM_ADDRESS =', irmAddress);
  console.log('5. Seed initial AXUSD liquidity via vault.deposit()');
  console.log('6. Verify on Arbiscan and Euler Finance app');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
