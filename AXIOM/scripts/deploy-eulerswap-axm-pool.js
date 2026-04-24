/**
 * Deploy EulerSwap AXUSD/AXM Pool (Task #41)
 *
 * Deploys one EulerSwap V2 pool on Arbitrum One:
 *   AXM/AXUSD — protocol governance token liquidity venue
 *
 * Token ordering (EulerSwap sorts by address):
 *   AXM   (0x864F...) < AXUSD (0xD611...) → token0=AXM (18 dec), token1=AXUSD (6 dec)
 *
 * Supply vaults:
 *   supplyVault0 (AXM):   ZERO_ADDR  — no Euler AXM vault exists yet; no lending yield on AXM side
 *   supplyVault1 (AXUSD): EVK eAXUSD-6 vault — earns lending yield on AXUSD reserves
 *
 * Deployment strategy (empty pool, reconfigure after seeding):
 *   Deploy with equilibriumReserve=(0,0) and minReserve=(0,0), placeholder price params.
 *   Call reconfigure() with real AXM price after seeding via Euler UI.
 *
 * Fee / Concentration: 0.3% fee, concentration 0.5 (volatile governance token pair).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-eulerswap-axm-pool.js --network arbitrumOne
 */
const { ethers } = require('hardhat');

// ─── Addresses (Arbitrum One) ────────────────────────────────────────────────
const ZERO_ADDR          = '0x0000000000000000000000000000000000000000';
const AXM                = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'; // 18 decimals — token0
const AXUSD_ERC3643      = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'; // 6 decimals  — token1
const EVK_AXUSD_VAULT    = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6 (Task #38)
const AXIOM_FEE_BURNER   = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94';
const EULERSWAP_FACTORY  = '0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4'; // V2
const LPM_ADDRESS        = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F'; // LendingPlatformModule
const COMPLIANCE_ADDRESS = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD'; // ModularCompliance (1st param to addPlatform)
const EVC_ADDRESS        = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';

// ─── Pool Parameters ─────────────────────────────────────────────────────────
// Deploy empty — reconfigure() after seeding AXM + AXUSD via Euler UI
const ZERO = BigInt('0');

// Placeholder price: 1:1 raw-unit ratio (reconfigure with real price post-deployment)
// These don't matter when deploying with zero reserves; CurveLib.verify(0,0) passes always.
const PRICE_X       = BigInt('1000000'); // placeholder
const PRICE_Y       = BigInt('1000000'); // placeholder

// Volatile governance token pair: 0.3% fee, 0.5 concentration (much looser than stablecoin)
const CONCENTRATION = BigInt('500000000000000000'); // 0.5 × 1e18
const FEE           = BigInt('3000000000000000');   // 0.3% × 1e18 (WAD)

const EXPIRATION         = BigInt('0');
const SWAP_HOOKED_OPS    = 0;
const SWAP_HOOK          = ZERO_ADDR;

// ─── ABIs ────────────────────────────────────────────────────────────────────
const FACTORY_ABI = [
  {
    type: 'function', name: 'deployPool',
    inputs: [
      { name: 'sParams', type: 'tuple', components: [
        { name: 'supplyVault0',  type: 'address' },
        { name: 'supplyVault1',  type: 'address' },
        { name: 'borrowVault0',  type: 'address' },
        { name: 'borrowVault1',  type: 'address' },
        { name: 'eulerAccount',  type: 'address' },
        { name: 'feeRecipient',  type: 'address' },
      ]},
      { name: 'dParams', type: 'tuple', components: [
        { name: 'equilibriumReserve0',  type: 'uint112' },
        { name: 'equilibriumReserve1',  type: 'uint112' },
        { name: 'minReserve0',          type: 'uint112' },
        { name: 'minReserve1',          type: 'uint112' },
        { name: 'priceX',               type: 'uint80'  },
        { name: 'priceY',               type: 'uint80'  },
        { name: 'concentrationX',       type: 'uint64'  },
        { name: 'concentrationY',       type: 'uint64'  },
        { name: 'fee0',                 type: 'uint64'  },
        { name: 'fee1',                 type: 'uint64'  },
        { name: 'expiration',           type: 'uint40'  },
        { name: 'swapHookedOperations', type: 'uint8'   },
        { name: 'swapHook',             type: 'address' },
      ]},
      { name: 'initialState', type: 'tuple', components: [
        { name: 'reserve0', type: 'uint112' },
        { name: 'reserve1', type: 'uint112' },
      ]},
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'computePoolAddress',
    inputs: [
      { name: 'sParams', type: 'tuple', components: [
        { name: 'supplyVault0',  type: 'address' },
        { name: 'supplyVault1',  type: 'address' },
        { name: 'borrowVault0',  type: 'address' },
        { name: 'borrowVault1',  type: 'address' },
        { name: 'eulerAccount',  type: 'address' },
        { name: 'feeRecipient',  type: 'address' },
      ]},
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'deployedPools',
    inputs:  [{ name: 'pool', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event', name: 'PoolDeployed',
    inputs: [
      { name: 'asset0',       type: 'address', indexed: true  },
      { name: 'asset1',       type: 'address', indexed: true  },
      { name: 'eulerAccount', type: 'address', indexed: false },
      { name: 'pool',         type: 'address', indexed: false },
      { name: 'sParams',      type: 'tuple',   indexed: false, components: [
        { name: 'supplyVault0',  type: 'address' },
        { name: 'supplyVault1',  type: 'address' },
        { name: 'borrowVault0',  type: 'address' },
        { name: 'borrowVault1',  type: 'address' },
        { name: 'eulerAccount',  type: 'address' },
        { name: 'feeRecipient',  type: 'address' },
      ]},
    ],
  },
];

const POOL_ABI = [
  'function getAssets() view returns (address asset0, address asset1)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function isInstalled() view returns (bool)',
];

const EVC_ABI = [
  'function setAccountOperator(address account, address operator, bool authorized)',
  'function isAccountOperatorAuthorized(address account, address operator) view returns (bool)',
];

const LPM_ABI = [
  'function addPlatform(address compliance, address platform) external',
  'function isPlatformWhitelisted(address compliance, address platform) view returns (bool)',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function authorizePoolOnEVC(signer, poolAddress) {
  try {
    const evc = new ethers.Contract(EVC_ADDRESS, EVC_ABI, signer);
    const already = await evc.isAccountOperatorAuthorized(signer.address, poolAddress).catch(() => false);
    if (already) { console.log('  [OK] Pool already authorized as EVC operator'); return; }
    const tx = await evc.setAccountOperator(signer.address, poolAddress, true, { gasLimit: 200_000 });
    await tx.wait();
    console.log('  [OK] Pool authorized as EVC operator:', tx.hash);
  } catch (err) {
    console.warn('  [WARN] EVC authorization failed:', err?.reason || err?.message?.slice(0, 120));
    console.warn(`         Manual: EVC.setAccountOperator(${signer.address}, ${poolAddress}, true)`);
  }
}

async function whitelistPool(signer, poolAddress) {
  try {
    const lpm = new ethers.Contract(LPM_ADDRESS, LPM_ABI, signer);
    const isListed = await lpm.isPlatformWhitelisted(COMPLIANCE_ADDRESS, poolAddress).catch(() => false);
    if (isListed) { console.log('  [OK] Pool already whitelisted in LPM'); return; }
    const tx = await lpm.addPlatform(COMPLIANCE_ADDRESS, poolAddress, { gasLimit: 300_000 });
    await tx.wait();
    console.log('  [OK] Pool whitelisted in LPM:', tx.hash);
  } catch (err) {
    console.warn('  [WARN] LPM whitelist failed:', err?.reason || err?.message?.slice(0, 120));
    console.warn(`         Manual: LPM.addPlatform(${COMPLIANCE_ADDRESS}, ${poolAddress})`);
  }
}

// ─── Pre-mined Salt ──────────────────────────────────────────────────────────
// Salt mined locally using MetaProxy initcode reconstruction for AXM sParams.
// Satisfies Uniswap V4 hook constraint: (uint256(poolAddress) & 0x3FFF) == 0x28A8
//
// Derivation:
//   sParams = {supplyV0:ZERO, supplyV1:EVK_AXUSD, borrowV0:ZERO, borrowV1:EVK_AXUSD, eulerAccount:DEPLOYER, feeRecipient:FEE_BURNER}
//   initcode = MetaProxy(0xaf6412d58024874b0ffc4138fff95fc73b372977) + sParams_abi
//   initcodeHash = 0x06fcb96b9b36db1e70426a17e0a4b1a7447cc9dfca35b1a65b02ea3feb214978
//   salt = keccak256("axiom-axusd-axm-v1-3253")
//   pool = 0xe0616f3F49E547f71A63190B9580815775cB68A8  (bits & 0x3FFF = 0x28A8 ✓)
//
// Verified: factory.computePoolAddress(sParams, salt) == pool ✓
const PRE_MINED_SALT        = '0xe136c42498b9242f026f08b01daa3020dfcf1cefd6bf7ce6550a12d0db1ae088';
const PRE_MINED_POOL        = '0xe0616f3F49E547f71A63190B9580815775cB68A8';

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Deployer:      ', deployer.address);
  console.log('Balance:       ', ethers.formatEther(balance), 'ETH');
  console.log('Factory:       ', EULERSWAP_FACTORY);
  console.log('token0 (AXM):  ', AXM, '— 18 decimals');
  console.log('token1 (AXUSD):', AXUSD_ERC3643, '— 6 decimals');
  console.log('');

  const factory = new ethers.Contract(EULERSWAP_FACTORY, FACTORY_ABI, deployer);

  // sParams — static pool configuration
  // AXM (0x864F) < AXUSD (0xD611) → token0=AXM, token1=AXUSD
  const sParams = {
    supplyVault0: ZERO_ADDR,          // No Euler AXM vault — pool holds AXM directly
    supplyVault1: EVK_AXUSD_VAULT,    // eAXUSD-6 — earns lending yield on AXUSD reserves
    borrowVault0: ZERO_ADDR,
    borrowVault1: EVK_AXUSD_VAULT,
    eulerAccount: deployer.address,
    feeRecipient: AXIOM_FEE_BURNER,
  };

  // dParams — deploy with zero reserves; reconfigure with real AXM price after seeding
  const dParams = {
    equilibriumReserve0:  ZERO,
    equilibriumReserve1:  ZERO,
    minReserve0:          ZERO,
    minReserve1:          ZERO,
    priceX:               PRICE_X,
    priceY:               PRICE_Y,
    concentrationX:       CONCENTRATION,
    concentrationY:       CONCENTRATION,
    fee0:                 FEE,
    fee1:                 FEE,
    expiration:           EXPIRATION,
    swapHookedOperations: SWAP_HOOKED_OPS,
    swapHook:             SWAP_HOOK,
  };

  const initialState = { reserve0: ZERO, reserve1: ZERO };

  // ── Use pre-mined salt ────────────────────────────────────────────────────
  console.log('--- Salt (pre-mined) ---');
  const salt = PRE_MINED_SALT;
  const expectedAddress = PRE_MINED_POOL;
  console.log('Salt:         ', salt);
  console.log('Pool address: ', expectedAddress);
  const verifiedAddr = await factory.computePoolAddress(sParams, salt).catch(() => null);
  if (verifiedAddr && verifiedAddr.toLowerCase() !== expectedAddress.toLowerCase()) {
    console.error('[ERROR] factory.computePoolAddress mismatch — sParams may differ from what was mined!');
    console.error('  Expected:', expectedAddress);
    console.error('  Got:     ', verifiedAddr);
    process.exit(1);
  }
  console.log('  [OK] Factory verified:', verifiedAddr || 'could not verify (proceeding)');

  // ── Check if already deployed ─────────────────────────────────────────────
  const alreadyDeployed = await factory.deployedPools(expectedAddress).catch(() => false);
  if (alreadyDeployed) {
    console.log('[OK] Pool already deployed — skipping deployment.');
    await postDeploymentSteps(deployer, factory, expectedAddress);
    return;
  }

  // ── EVC pre-authorization (required before deployPool) ────────────────────
  console.log('\n--- EVC Pre-Authorization ---');
  await authorizePoolOnEVC(deployer, expectedAddress);

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log('\n--- Deploying AXM/AXUSD EulerSwap Pool ---');
  console.log('  supplyVault0 (AXM):  ', sParams.supplyVault0, '(no AXM vault — holds AXM directly)');
  console.log('  supplyVault1 (AXUSD):', sParams.supplyVault1);
  console.log('  eulerAccount:        ', sParams.eulerAccount);
  console.log('  feeRecipient:        ', sParams.feeRecipient);
  console.log('  fee:                  0.3% (volatile governance token pair)');
  console.log('  concentration:        0.5 (wide spread, non-stablecoin)');
  console.log('  salt:                ', salt);

  let tx;
  try {
    tx = await factory.deployPool(sParams, dParams, initialState, salt, { gasLimit: 5_000_000 });
    console.log('  tx hash:', tx.hash);
    console.log('  Waiting for confirmation...');
  } catch (err) {
    console.error('\n[ERROR] deployPool reverted:', err?.reason || err?.message);
    if (err?.data) console.error('  revert data:', err.data);
    process.exit(1);
  }

  const receipt = await tx.wait();
  console.log('  Confirmed in block:', receipt.blockNumber, '— gas used:', receipt.gasUsed.toString());

  // ── Parse pool address from PoolDeployed event ────────────────────────────
  let poolAddress = expectedAddress;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === 'PoolDeployed') {
        poolAddress = parsed.args.pool;
        console.log('  Pool address (event):', poolAddress);
        break;
      }
    } catch {}
  }

  console.log('\n  AXM/AXUSD Pool deployed:', poolAddress);
  await postDeploymentSteps(deployer, factory, poolAddress);
}

async function postDeploymentSteps(deployer, factory, poolAddress) {
  console.log('\n--- EVC Operator Authorization ---');
  await authorizePoolOnEVC(deployer, poolAddress);

  console.log('\n--- ERC-3643 LPM Whitelist ---');
  await whitelistPool(deployer, poolAddress);

  console.log('\n--- Post-Deployment Verification ---');
  const pool = new ethers.Contract(poolAddress, POOL_ABI, deployer);
  try {
    const [assets, reserves] = await Promise.all([pool.getAssets(), pool.getReserves()]);
    console.log('  asset0 (AXM):  ', assets.asset0);
    console.log('  asset1 (AXUSD):', assets.asset1);
    console.log('  reserve0 (AXM):  ', reserves.reserve0.toString());
    console.log('  reserve1 (AXUSD):', reserves.reserve1.toString());
  } catch (err) {
    console.warn('  [WARN] Verification call failed:', err?.message?.slice(0, 80));
  }

  const isDeployed = await factory.deployedPools(poolAddress).catch(() => false);
  console.log('  factory.deployedPools:', isDeployed);

  console.log(`
=======================================================
  AXUSD/AXM EULERSWAP POOL — DEPLOYMENT COMPLETE
=======================================================

  AXM/AXUSD Pool            : ${poolAddress}
  EulerSwap V2 Factory      : ${EULERSWAP_FACTORY}
  AXUSD EVK vault (token1)  : ${EVK_AXUSD_VAULT}
  AXM supply vault (token0) : ZERO_ADDR (no lending yield on AXM side)
  Fee recipient             : ${AXIOM_FEE_BURNER}

  NEXT STEPS:
  1. Update src/config/activeContracts.generated.ts:
       EULER_SWAP_AXUSD_AXM_POOL_ADDRESS = '${poolAddress}'

  2. Update shared/contracts.ts:
       AXUSD_AXM_POOL: '${poolAddress}',

  3. Seed liquidity via Euler UI:
       https://app.euler.finance/swap?network=arbitrumone

  4. Call pool.reconfigure() with real AXM price once liquidity is seeded.

  5. View on Arbiscan:
       https://arbiscan.io/address/${poolAddress}

=======================================================
`);
}

main().catch(e => { console.error(e); process.exit(1); });
