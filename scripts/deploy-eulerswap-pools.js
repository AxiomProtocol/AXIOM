/**
 * Deploy EulerSwap AXUSD Liquidity Layer (Task #40)
 *
 * Deploys one EulerSwap V2 pool on Arbitrum One:
 *   USDC/AXUSD — primary AXUSD peg stability venue
 *
 * Architecture:
 *   EulerSwap is a single-LP AMM built as a Uniswap V4 hook.
 *   The deployer acts as the sole market maker (eulerAccount).
 *   Pool reserves are backed by EVK vaults (eAXUSD-6 + Euler USDC vault),
 *   so idle capital earns lending yield in addition to swap fees.
 *
 * Token ordering (EulerSwap sorts by address):
 *   USDC  (0xaf88...) < AXUSD (0xD611...) → token0=USDC, token1=AXUSD
 *
 * Deployment strategy (empty pool):
 *   The pool is deployed with equilibriumReserve = (0, 0) and minReserve = (0, 0)
 *   to satisfy CurveLib.verify() at reserve (0, 0). This avoids requiring AXUSD
 *   at deployment time. After deployment, call pool.reconfigure() with real params
 *   once USDC + AXUSD are seeded via Euler UI.
 *
 *   Root cause of original BadDynamicParam() error:
 *   EulerSwapManagement.activate() requires: minReserve <= initialState.reserve.
 *   With initialState=(0,0), minReserve must also be 0.
 *   CurveLib.verify() returns true for (0,0) only when equilibriumReserve=(0,0).
 *
 * Post-deployment:
 *   1. Authorize pool as EVC operator on deployer's account (done pre-deploy)
 *   2. Whitelist pool in LPM (ERC-3643 compliance) — requires admin key
 *   3. Seed liquidity via Euler UI: https://app.euler.finance/swap?network=arbitrumone
 *   4. Call pool.reconfigure() with real dParams (equil=10K, minReserve=1K)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-eulerswap-pools.js --network arbitrumOne
 */
const { ethers } = require('hardhat');

// ─── Addresses (Arbitrum One) ────────────────────────────────────────────────
const ZERO_ADDR           = '0x0000000000000000000000000000000000000000';
const AXUSD_ERC3643       = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC                = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const EVK_AXUSD_VAULT     = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6 (Task #38)
const EULER_USDC_VAULT    = '0x44C10DA836d2aBe881b77bbB0b3DCE5f85C0C1Cc'; // Euler USDC supply vault, Arbitrum
const AXIOM_FEE_BURNER    = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94';
const EULERSWAP_FACTORY   = '0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4'; // EulerSwap V2, Arbitrum
const LPM_ADDRESS         = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922'; // LendingPlatformModule
const COMPLIANCE_ADDRESS  = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD'; // compliance contract for LPM
// EVC (Euler Vault Controller) on Arbitrum One (verified from live EulerSwap pool.EVC()):
const EVC_ADDRESS         = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';

// ─── Pool Parameters ─────────────────────────────────────────────────────────
// Derived by reading live USDC/USDM and USDC/USDT EulerSwap pools on Arbitrum.
// Both USDC and AXUSD are 6-decimal tokens targeting a 1:1 USD peg.

// Deploy with zero equilibrium to pass CurveLib.verify(0,0).
// The pool is activated empty; call reconfigure() after seeding USDC + AXUSD.
// Target params for reconfigure: equil=10K, minReserve=1K (both 6-decimal).
const EQUILIBRIUM_RESERVE_USDC  = BigInt('0');   // 0 at deploy; reconfigure to 10,000 USDC after seeding
const EQUILIBRIUM_RESERVE_AXUSD = BigInt('0');   // 0 at deploy; reconfigure to 10,000 AXUSD after seeding
const MIN_RESERVE_USDC          = BigInt('0');   // 0 required when initialState.reserve0 = 0
const MIN_RESERVE_AXUSD         = BigInt('0');   // 0 required when initialState.reserve1 = 0

// 1e6 = base unit for 1:1 price between two 6-decimal tokens
const PRICE_X            = BigInt('1000000');    // 1.000000 (USDC per AXUSD at equilibrium)
const PRICE_Y            = BigInt('1000000');    // 1.000000 (AXUSD per USDC at equilibrium)

// ≈0.999 × 1e18 — tight stablecoin concentration (derived from live pools)
const CONCENTRATION      = BigInt('998999999999999999');

// 3e13 WAD ≈ 0.003% — tight stablecoin swap fee (from live USDC/USDT pool)
const FEE                = BigInt('30000000000000');

const EXPIRATION         = BigInt('0');          // no expiry
const SWAP_HOOKED_OPS    = 0;                    // no custom hook operations
const SWAP_HOOK          = ZERO_ADDR;            // no swap hook

// ─── ABIs ────────────────────────────────────────────────────────────────────
const FACTORY_ABI = [
  {
    type: 'function',
    name: 'deployPool',
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
        { name: 'equilibriumReserve0',     type: 'uint112' },
        { name: 'equilibriumReserve1',     type: 'uint112' },
        { name: 'minReserve0',             type: 'uint112' },
        { name: 'minReserve1',             type: 'uint112' },
        { name: 'priceX',                  type: 'uint80'  },
        { name: 'priceY',                  type: 'uint80'  },
        { name: 'concentrationX',          type: 'uint64'  },
        { name: 'concentrationY',          type: 'uint64'  },
        { name: 'fee0',                    type: 'uint64'  },
        { name: 'fee1',                    type: 'uint64'  },
        { name: 'expiration',              type: 'uint40'  },
        { name: 'swapHookedOperations',    type: 'uint8'   },
        { name: 'swapHook',                type: 'address' },
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
    type: 'function',
    name: 'computePoolAddress',
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
    type: 'function',
    name: 'deployedPools',
    inputs: [{ name: 'pool', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PoolDeployed',
    inputs: [
      { name: 'asset0',      type: 'address', indexed: true  },
      { name: 'asset1',      type: 'address', indexed: true  },
      { name: 'eulerAccount',type: 'address', indexed: false },
      { name: 'pool',        type: 'address', indexed: false },
      { name: 'sParams',     type: 'tuple',   indexed: false, components: [
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
  'function getStaticParams() view returns (address supplyVault0, address supplyVault1, address borrowVault0, address borrowVault1, address eulerAccount, address feeRecipient)',
  'function getDynamicParams() view returns (uint112 equilibriumReserve0, uint112 equilibriumReserve1, uint112 minReserve0, uint112 minReserve1, uint80 priceX, uint80 priceY, uint64 concentrationX, uint64 concentrationY, uint64 fee0, uint64 fee1, uint40 expiration, uint8 swapHookedOperations, address swapHook)',
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
async function whitelistPool(signer, poolAddress, label) {
  if (!poolAddress || poolAddress === ZERO_ADDR) return;
  try {
    const lpm = new ethers.Contract(LPM_ADDRESS, LPM_ABI, signer);
    const isWhitelisted = await lpm.isPlatformWhitelisted(COMPLIANCE_ADDRESS, poolAddress).catch(() => false);
    if (isWhitelisted) {
      console.log(`  [OK] ${label} already whitelisted in LPM`);
      return;
    }
    const tx = await lpm.addPlatform(COMPLIANCE_ADDRESS, poolAddress, { gasLimit: 300_000 });
    await tx.wait();
    console.log(`  [OK] ${label} whitelisted in LPM: ${tx.hash}`);
  } catch (err) {
    console.warn(`  [WARN] Could not whitelist ${label} in LPM:`, err?.reason || err?.message?.slice(0, 80));
    console.warn(`         Manual step: call LPM.addPlatform(${COMPLIANCE_ADDRESS}, ${poolAddress})`);
  }
}

async function authorizePoolOnEVC(signer, poolAddress) {
  try {
    const evc = new ethers.Contract(EVC_ADDRESS, EVC_ABI, signer);
    const already = await evc.isAccountOperatorAuthorized(signer.address, poolAddress).catch(() => false);
    if (already) {
      console.log('  [OK] Pool already authorized as EVC operator');
      return;
    }
    const tx = await evc.setAccountOperator(signer.address, poolAddress, true, { gasLimit: 200_000 });
    await tx.wait();
    console.log('  [OK] Pool authorized as EVC operator:', tx.hash);
  } catch (err) {
    console.warn('  [WARN] Could not authorize pool on EVC:', err?.reason || err?.message?.slice(0, 80));
    console.warn('         Manual step: call EVC.setAccountOperator(deployer, pool, true)');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Deployer:  ', deployer.address);
  console.log('Balance:   ', ethers.formatEther(balance), 'ETH');
  console.log('Factory:   ', EULERSWAP_FACTORY);
  console.log('');

  const factory = new ethers.Contract(EULERSWAP_FACTORY, FACTORY_ABI, deployer);

  // sParams — static pool configuration
  // Token ordering: USDC (0xaf88) < AXUSD (0xD611) → token0=USDC, token1=AXUSD
  const sParams = {
    supplyVault0: EULER_USDC_VAULT,    // Euler USDC supply vault — earns yield on USDC reserves
    supplyVault1: EVK_AXUSD_VAULT,     // eAXUSD-6 EVK vault (Task #38) — earns yield on AXUSD reserves
    borrowVault0: EULER_USDC_VAULT,    // same vault for borrow
    borrowVault1: EVK_AXUSD_VAULT,     // same vault for borrow
    eulerAccount: deployer.address,    // single LP operator (deployer as market maker)
    feeRecipient: AXIOM_FEE_BURNER,    // swap fees → AxiomFeeBurner
  };

  // dParams — price curve parameters
  const dParams = {
    equilibriumReserve0:  EQUILIBRIUM_RESERVE_USDC,
    equilibriumReserve1:  EQUILIBRIUM_RESERVE_AXUSD,
    minReserve0:          MIN_RESERVE_USDC,
    minReserve1:          MIN_RESERVE_AXUSD,
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

  // Deploy with zero initial reserves — seed liquidity via Euler UI post-deployment
  const initialState = { reserve0: BigInt('0'), reserve1: BigInt('0') };

  // Salt mined to satisfy Uniswap V4 hook address requirement:
  // lower 14 bits of pool address MUST equal 0x28A8 (EulerSwap hook mask).
  // Mined by iterating over 'axiom-axusd-usdc-v1-{i}' until address has correct bits.
  // Produces pool address: 0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8 (verified lower14=0x28a8)
  const salt = '0x2cfcc0c5a9728cb5d7fc87de34968a2b7c5f76792a23a6170e7b317fa4a2ac5a';

  // ── Pre-flight: compute expected address ─────────────────────────────────
  console.log('--- Pre-flight ---');
  let expectedAddress;
  try {
    expectedAddress = await factory.computePoolAddress(sParams, salt);
    console.log('Expected pool address:', expectedAddress);
    const alreadyDeployed = await factory.deployedPools(expectedAddress);
    if (alreadyDeployed) {
      console.log('[OK] Pool already deployed at this address — skipping deployment.');
      console.log('\n=== EXISTING POOL ===');
      console.log('USDC/AXUSD Pool:', expectedAddress);
      await postDeploymentSteps(deployer, factory, expectedAddress);
      return;
    }
  } catch (err) {
    console.warn('  [WARN] computePoolAddress failed:', err?.message?.slice(0, 80));
  }

  // ── EVC pre-authorization (REQUIRED before deployPool) ───────────────────
  // EulerSwap requires the pool address to be authorized as an EVC operator
  // on the eulerAccount BEFORE calling deployPool (OperatorNotInstalled guard).
  // The pool address is deterministic, so we can pre-authorize it.
  if (expectedAddress) {
    console.log('\n--- EVC Pre-Authorization (required before deployPool) ---');
    await authorizePoolOnEVC(deployer, expectedAddress);
  } else {
    console.warn('[WARN] Could not pre-authorize pool on EVC (no expected address).');
    console.warn('       deployPool will likely revert with OperatorNotInstalled().');
  }

  // ── Deploy ───────────────────────────────────────────────────────────────
  console.log('\n--- Deploying USDC/AXUSD EulerSwap Pool ---');
  console.log('  supplyVault0 (USDC):', sParams.supplyVault0);
  console.log('  supplyVault1 (AXUSD):', sParams.supplyVault1);
  console.log('  eulerAccount:', sParams.eulerAccount);
  console.log('  feeRecipient:', sParams.feeRecipient);
  console.log('  equilibriumReserve0:', EQUILIBRIUM_RESERVE_USDC.toString(), '(USDC)');
  console.log('  equilibriumReserve1:', EQUILIBRIUM_RESERVE_AXUSD.toString(), '(AXUSD)');
  console.log('  priceX / priceY:', PRICE_X.toString(), '/', PRICE_Y.toString(), '(1:1 peg)');
  console.log('  fee:', FEE.toString(), '(0.003% WAD)');
  console.log('  salt:', salt);

  let tx;
  try {
    tx = await factory.deployPool(sParams, dParams, initialState, salt, {
      gasLimit: 5_000_000,
    });
    console.log('  tx hash:', tx.hash);
    console.log('  Waiting for confirmation...');
  } catch (err) {
    console.error('\n[ERROR] deployPool reverted:', err?.reason || err?.message);
    if (err?.data) console.error('  revert data:', err.data);
    process.exit(1);
  }

  const receipt = await tx.wait();
  console.log('  Confirmed in block:', receipt.blockNumber, '— gas used:', receipt.gasUsed.toString());

  // ── Parse pool address from event ────────────────────────────────────────
  let poolAddress = expectedAddress ?? ZERO_ADDR;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === 'PoolDeployed') {
        poolAddress = parsed.args.pool;
        console.log('  Pool address (from event):', poolAddress);
        break;
      }
    } catch {}
  }

  if (!poolAddress || poolAddress === ZERO_ADDR) {
    // Fallback: use last non-factory log address (newly deployed contract)
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== EULERSWAP_FACTORY.toLowerCase()) {
        poolAddress = log.address;
      }
    }
  }

  if (!poolAddress || poolAddress === ZERO_ADDR) {
    throw new Error('Could not determine pool address from transaction receipt.');
  }

  console.log('\n  USDC/AXUSD Pool deployed:', poolAddress);

  await postDeploymentSteps(deployer, factory, poolAddress);
}

async function postDeploymentSteps(deployer, factory, poolAddress) {
  // ── Authorize pool as EVC operator ───────────────────────────────────────
  console.log('\n--- EVC Operator Authorization ---');
  await authorizePoolOnEVC(deployer, poolAddress);

  // ── LPM Whitelist ─────────────────────────────────────────────────────────
  console.log('\n--- ERC-3643 LPM Whitelist ---');
  await whitelistPool(deployer, poolAddress, 'USDC/AXUSD Pool');

  // ── Verification ─────────────────────────────────────────────────────────
  console.log('\n--- Post-Deployment Verification ---');
  const pool = new ethers.Contract(poolAddress, POOL_ABI, deployer);
  try {
    const [assets, reserves, installed] = await Promise.all([
      pool.getAssets(),
      pool.getReserves(),
      pool.isInstalled().catch(() => 'n/a'),
    ]);
    console.log('  asset0:', assets.asset0);
    console.log('  asset1:', assets.asset1);
    console.log('  reserve0:', reserves.reserve0.toString(), '(USDC)');
    console.log('  reserve1:', reserves.reserve1.toString(), '(AXUSD)');
    console.log('  isInstalled:', installed);
  } catch (err) {
    console.warn('  [WARN] Verification failed:', err?.message?.slice(0, 80));
  }

  const isDeployed = await factory.deployedPools(poolAddress).catch(() => false);
  console.log('  factory.deployedPools:', isDeployed);

  console.log(`
=======================================================
  TASK #40 — DEPLOYMENT COMPLETE
=======================================================

  USDC/AXUSD EulerSwap Pool : ${poolAddress}
  EulerSwap V2 Factory      : ${EULERSWAP_FACTORY}
  AXUSD EVK vault (token1)  : ${EVK_AXUSD_VAULT}
  USDC Euler vault (token0) : ${EULER_USDC_VAULT}
  Fee recipient             : ${AXIOM_FEE_BURNER}

  NEXT STEPS:
  1. Update shared/contracts.ts:
       AXUSD_USDC_POOL: '${poolAddress}',

  2. Update src/config/activeContracts.generated.ts:
       EULER_SWAP_AXUSD_USDC_POOL_ADDRESS = '${poolAddress}'

  3. Seed liquidity via Euler UI:
       https://app.euler.finance/swap?network=arbitrumone

  4. View pool:
       https://arbiscan.io/address/${poolAddress}

=======================================================
`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
