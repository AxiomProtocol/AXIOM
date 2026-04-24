/**
 * AXIOM Protocol — EVK Open Money Market Vault Deployment Script
 * Task #38: New AXUSD EVK Open Money Market
 *
 * KEY DISCOVERY (root cause of prior failures):
 *   LendingPlatformModule.addPlatform(address _compliance, address _platform)
 *   The FIRST param is the COMPLIANCE address — NOT the token address.
 *   The function is onlyOwner; deployer IS the LPM owner → call directly.
 *
 * Uses direct ethers.js Wallet (not Hardhat signers) with explicit pending-nonce
 * management to prevent nonce-too-low errors in multi-tx scripts.
 *
 * Run:
 *   AXUSD_ORACLE_ADAPTER=0x66461fF463BF19f511488F8BF6E99EACD0D7461D \
 *   npx hardhat run scripts/deploy-axusd-evk-vault.js --network arbitrum
 */

// Use RAW ethers.js (not Hardhat's wrapped version) to avoid nonce caching.
// Hardhat's HardhatEthersSigner mangles getTransactionCount — we bypass it entirely.
const hardhatEthers = require('hardhat').ethers;
const { ethers } = require('ethers');

// ── Real Euler V2 Arbitrum One addresses (from euler-interfaces on GitHub) ────
// Source: https://raw.githubusercontent.com/euler-xyz/euler-interfaces/master/addresses/42161/CoreAddresses.json
const EVK_FACTORY    = '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50'; // eVaultFactory
const EVC            = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066'; // EVC
// IRMLinearKink is deployed directly at 0x13B4F093C95785a621b928A9fa31Ea7a7fAb1662
// (deployed earlier in this session — reuse if already deployed)

const AXUSD_ERC3643  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC           = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// ERC-7726 oracle adapter v2 (deployed: deploy-axusd-oracle-v2.js)
// NOTE: In this EVK implementation, the oracle is IMMUTABLE — baked into the
// MetaProxy trailing data at deployment. setOracle() does NOT exist in this version.
// The oracle must be correct in the trailingData passed to createProxy().
const ORACLE_ADAPTER = process.env.AXUSD_ORACLE_ADAPTER
  || '0xc894d1500CB1FBf8F045e87bd357A51345197c4e'; // Oracle v2 (ERC3643 primaryAxusd)

// LPM: addPlatform(compliance, platform) — onlyOwner — deployer IS owner
const LPM            = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
// COMPLIANCE: first param to LPM.addPlatform (not the token!)
const COMPLIANCE     = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';

// ── IRM Parameters (LinearKink) ───────────────────────────────────────────────
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
const WAD = ethers.parseEther('1'); // 1e18

function aprToWadPerSec(aprPct) {
  return (BigInt(Math.round(aprPct * 1e6)) * WAD) / (100n * 1_000_000n * SECONDS_PER_YEAR);
}

// LinearKink: base=1%, slope1=5%@kink, slope2=100% above kink, kink=80%
const IRM_BASE_RATE = aprToWadPerSec(1);
const IRM_SLOPE1    = aprToWadPerSec(5);
const IRM_SLOPE2    = aprToWadPerSec(100);
const IRM_KINK      = ethers.parseEther('0.80');

// ── Vault Parameters ──────────────────────────────────────────────────────────
const BORROW_LTV      = 9000; // 90.00% borrow LTV
const LIQUIDATION_LTV = 9500; // 95.00% liquidation LTV

// EVK AmountCap uint16 encoding: (mantissa << 6) | exponent
// decoded amount = mantissa * 10^exponent / 1e9
// 1M AXUSD (18 dec) = 1e24 units → mantissa=1, exp=33
// 500K AXUSD        = 5e23 units → mantissa=5, exp=32
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

// NOTE: setOracle does NOT exist in this EVK implementation version.
// The oracle is immutable, baked into the MetaProxy trailing data at deployment.
const EVK_VAULT_ABI = [
  'function setInterestRateModel(address newModel) external',
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

// CORRECT: first param is _compliance, second is _platform
const LPM_ABI = [
  'function addPlatform(address _compliance, address _platform) external',
  'function isPlatformWhitelisted(address _compliance, address _platform) external view returns (bool)',
  'function getPlatforms(address _compliance) external view returns (address[])',
  'function owner() view returns (address)',
];

// ── Nonce manager ─────────────────────────────────────────────────────────────
// Fetch nonce ONCE at startup, then track locally to avoid any RPC caching issues.
let _nonce = null;

function useNonce() {
  const n = _nonce;
  _nonce++;
  return n;
}

async function initNonce(provider, address) {
  _nonce = await provider.getTransactionCount(address, 'pending');
  console.log('Initial nonce:', _nonce);
}

async function sendTx(contract, method, args, overrides = {}) {
  const nonce = useNonce();
  return contract[method](...args, { ...overrides, nonce });
}

async function main() {
  // Raw ethers.js provider + wallet — bypasses Hardhat nonce caching entirely
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY env var not set');
  const deployer = new ethers.Wallet(pk, provider);

  console.log('Deployer:', deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  console.log('Oracle adapter:', ORACLE_ADAPTER);

  await initNonce(provider, deployer.address);

  const lpm     = new ethers.Contract(LPM,        LPM_ABI,        deployer);
  const factory = new ethers.Contract(EVK_FACTORY, EVK_FACTORY_ABI, deployer);

  // Verify deployer IS lpm owner
  const lpmOwner = await lpm.owner();
  console.log('LPM owner:', lpmOwner, '| match:', lpmOwner.toLowerCase() === deployer.address.toLowerCase());

  // Idempotent whitelist helper — passes COMPLIANCE as first param (correct order)
  async function whitelistPlatform(platform, label) {
    const already = await lpm.isPlatformWhitelisted(COMPLIANCE, platform).catch(() => false);
    if (already) { console.log(`  ${label} already whitelisted.`); return; }
    const tx = await sendTx(lpm, 'addPlatform', [COMPLIANCE, platform]);
    await tx.wait(1);
    const ok = await lpm.isPlatformWhitelisted(COMPLIANCE, platform).catch(() => false);
    console.log(`  ${label} whitelisted: ${ok} | tx: ${tx.hash}`);
  }

  // ── Step 1a: Whitelist EVC ─────────────────────────────────────────────────
  console.log('\n[Step 1a] Whitelisting EVC in LendingPlatformModule...');
  await whitelistPlatform(EVC, 'EVC');

  // ── Step 1b: Whitelist EVK Factory ────────────────────────────────────────
  console.log('\n[Step 1b] Whitelisting EVK Factory in LendingPlatformModule...');
  await whitelistPlatform(EVK_FACTORY, 'EVK Factory');

  // ── Step 2: Deploy Linear Kink IRM directly (or reuse already deployed) ──
  console.log('\n[Step 2] Deploying IRMLinearKink directly...');
  console.log('  baseRate (WAD/s):', IRM_BASE_RATE.toString(), '≈ 1% APR');
  console.log('  slope1   (WAD/s):', IRM_SLOPE1.toString(),    '≈ 5% APR at kink');
  console.log('  slope2   (WAD/s):', IRM_SLOPE2.toString(),    '≈ 100% APR max');
  console.log('  kink     (WAD):  ', IRM_KINK.toString(),      '= 80% utilization');

  // Reuse the already-deployed IRM if code exists at that address
  const EXISTING_IRM = '0x13B4F093C95785a621b928A9fa31Ea7a7fAb1662';
  const irmCode = await provider.getCode(EXISTING_IRM);
  let irmAddress;
  if (irmCode && irmCode !== '0x') {
    irmAddress = EXISTING_IRM;
    console.log('  Reusing existing IRMLinearKink at:', irmAddress);
  } else {
    // Deploy via Hardhat artifact (raw ethers.js doesn't have getContractFactory)
    const HardhatFactory = await hardhatEthers.getContractFactory('IRMLinearKink');
    const deployTxData = HardhatFactory.interface.encodeDeploy([IRM_BASE_RATE, IRM_SLOPE1, IRM_SLOPE2, IRM_KINK]);
    const fullBytecode = HardhatFactory.bytecode + deployTxData.slice(2);
    const deployTx = await deployer.sendTransaction({ data: fullBytecode, nonce: useNonce(), gasLimit: 500_000 });
    const receipt = await deployTx.wait(1);
    irmAddress = receipt.contractAddress;
    console.log('  IRMLinearKink deployed at:', irmAddress, '| tx:', deployTx.hash);
  }

  // ── Step 3: Deploy AXUSD EVK vault ───────────────────────────────────────
  console.log('\n[Step 3] Deploying AXUSD EVK vault via EVK Factory...');
  // ProxyUtils.sol reads trailing data as PACKED 20-byte addresses (no ABI-encoding):
  //   calldataload(calldatasize - 60) >> 96  → asset
  //   calldataload(calldatasize - 40) >> 96  → oracle
  //   calldataload(calldatasize - 20) >> 96  → unitOfAccount
  // GenericFactory prepends 4 zero bytes, so trailingData passed here = 60 bytes packed.
  const unitOfAccount = USDC;
  const trailingData = ethers.concat([
    ethers.zeroPadValue(AXUSD_ERC3643,     20),
    ethers.zeroPadValue(ORACLE_ADAPTER,    20),
    ethers.zeroPadValue(unitOfAccount,     20),
  ]);
  console.log('  TrailingData (asset|oracle|uoa):', trailingData);
  console.log('  Bytes:', trailingData.length - 2, 'hex chars =', (trailingData.length - 2) / 2, 'bytes');

  // Pass the explicit implementation to avoid 'desiredImplementation != _implementation' revert
  const EVK_IMPLEMENTATION = '0x832fF4011A3164ea76ceA06A313EE0B6CD72ba96';

  // Check if a correctly configured vault already exists (oracle must match).
  // NOTE: oracle is immutable in this EVK version — baked into MetaProxy trailing data.
  // The old vault at 0x984321... was deployed with the WRONG oracle (0x66461fF...);
  // we must deploy a new vault with oracle = ORACLE_ADAPTER in the trailing data.
  // eAXUSD-6: deployed with oracle=0xc894d1500... (new oracle v2) — oracle verified correct
  const CANDIDATE_VAULT = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2';
  let vaultAddress;

  const oracleViewAbi = ['function oracle() view returns (address)'];
  let candidateHasCorrectOracle = false;
  if (CANDIDATE_VAULT !== ethers.ZeroAddress) {
    const candidateCode = await provider.getCode(CANDIDATE_VAULT);
    if (candidateCode && candidateCode !== '0x') {
      const candidateContract = new ethers.Contract(CANDIDATE_VAULT, oracleViewAbi, provider);
      const candidateOracle = await candidateContract.oracle().catch(() => ethers.ZeroAddress);
      if (candidateOracle.toLowerCase() === ORACLE_ADAPTER.toLowerCase()) {
        vaultAddress = CANDIDATE_VAULT;
        candidateHasCorrectOracle = true;
        console.log('  Reusing existing vault at:', vaultAddress, '(oracle matches)');
      } else {
        console.log('  Candidate vault has wrong oracle:', candidateOracle, '≠', ORACLE_ADAPTER);
        console.log('  Deploying new vault with correct oracle...');
      }
    }
  }

  if (!candidateHasCorrectOracle) {
    const deployTx = await factory.createProxy(
      EVK_IMPLEMENTATION,
      false, // non-upgradeable MetaProxy — standard for production Euler vaults
      trailingData,
      { gasLimit: 3_000_000, nonce: useNonce() }
    );
    const deployReceipt = await deployTx.wait(1);
    console.log('  Vault deployment tx:', deployTx.hash);

    // Parse ProxyCreated event from receipt to get vault address (avoids stale RPC list)
    const proxyCreatedTopic = ethers.id('ProxyCreated(address,bool,address,bytes)');
    const proxyLog = deployReceipt.logs.find(l =>
      l.topics[0] === proxyCreatedTopic
    );
    if (proxyLog) {
      // topic[1] = indexed proxy address (left-padded to 32 bytes)
      vaultAddress = ethers.getAddress('0x' + proxyLog.topics[1].slice(26));
      console.log('  Vault deployed at:', vaultAddress, '(from event)');
    } else {
      // Fallback: query list (may be stale, add delay)
      await new Promise(r => setTimeout(r, 3000));
      const listLen = await factory.getProxyListLength();
      const vaults = await factory.getProxyListSlice(listLen - 1n, listLen);
      vaultAddress = vaults[0];
      console.log('  Vault deployed at:', vaultAddress, '(from list)');
    }
  }

  const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, deployer);

  // ── Step 4: Whitelist vault in LPM ───────────────────────────────────────
  console.log('\n[Step 4] Whitelisting vault in LendingPlatformModule...');
  await whitelistPlatform(vaultAddress, 'Vault');

  // ── Step 5: Configure vault ───────────────────────────────────────────────
  console.log('\n[Step 5] Configuring vault...');

  // 5a: IRM
  const irmSetTx = await sendTx(vault, 'setInterestRateModel', [irmAddress]);
  await irmSetTx.wait(1);
  console.log('  IRM set | tx:', irmSetTx.hash);

  // NOTE: No setOracle call — oracle is IMMUTABLE in this EVK implementation.
  // It is baked into the MetaProxy trailing data at deployment time.
  // vault.oracle() reflects the oracle from trailingData = ORACLE_ADAPTER ✓
  console.log('  Oracle: immutable from trailingData =', ORACLE_ADAPTER);

  // 5b: USDC collateral LTV
  const ltvTx = await sendTx(vault, 'setLTV', [USDC, BORROW_LTV, LIQUIDATION_LTV, 0]);
  await ltvTx.wait(1);
  console.log('  USDC LTV set (90% borrow / 95% liq) | tx:', ltvTx.hash);

  // 5c: Supply + borrow caps
  const capsTx = await sendTx(vault, 'setCaps', [SUPPLY_CAP_UINT16, BORROW_CAP_UINT16]);
  await capsTx.wait(1);
  console.log('  Caps set (1M supply / 500K borrow) | tx:', capsTx.hash);

  // ── Step 6: Confirm governor ──────────────────────────────────────────────
  const governorAddr = await vault.governorAdmin();
  console.log('\n[Step 6] Governor admin:', governorAddr);

  // ── LPM audit ─────────────────────────────────────────────────────────────
  console.log('\n[Audit] LPM platforms whitelisted for COMPLIANCE:');
  const platforms = await lpm.getPlatforms(COMPLIANCE).catch(() => []);
  for (const p of platforms) console.log('  ', p);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('DEPLOYMENT SUMMARY');
  console.log('========================================');
  console.log('Vault Address:     ', vaultAddress);
  console.log('IRM Address:       ', irmAddress);
  console.log('Oracle Adapter:    ', ORACLE_ADAPTER);
  console.log('Governor Admin:    ', governorAddr);
  console.log('Asset:             ', AXUSD_ERC3643, '(ERC-3643 AXUSD)');
  console.log('Collateral:        ', USDC, '(USDC 90%/95% LTV)');
  console.log('Supply Cap:         1,000,000 AXUSD (uint16:', SUPPLY_CAP_UINT16, ')');
  console.log('Borrow Cap:           500,000 AXUSD (uint16:', BORROW_CAP_UINT16, ')');
  console.log('');
  console.log('→ Update src/config/activeContracts.generated.ts:');
  console.log('    EVK_OPEN_MARKET_VAULT_ADDRESS:    "' + vaultAddress + '"');
  console.log('    EVK_OPEN_MARKET_IRM_ADDRESS:      "' + irmAddress + '"');
  console.log('    EVK_OPEN_MARKET_GOVERNOR_ADDRESS: "' + governorAddr + '"');
  console.log('    AXUSD_ORACLE_ADAPTER_ADDRESS:     "' + ORACLE_ADAPTER + '"');
  console.log('→ Update shared/contracts.ts with the same values.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
