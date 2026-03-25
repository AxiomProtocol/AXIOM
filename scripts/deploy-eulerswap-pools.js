/**
 * Deploy EulerSwap AXUSD Liquidity Layer (Task #40)
 *
 * Creates two EulerSwap AMM pools:
 *   1. AXUSD/USDC  — primary peg stability venue
 *   2. AXUSD/AXM   — protocol token liquidity
 *
 * Both pools are connected to the EVK AXUSD vault (Task #38) so that
 * idle LP capital earns lending yield in addition to swap fees.
 *
 * ERC-3643 prerequisite:
 *   All pool addresses must be registered in the LendingPlatformModule
 *   before any LP operations. This script handles registration automatically
 *   when ADMIN_SOLVENCY_KEY is set in the environment.
 *
 * Usage:
 *   EULER_SWAP_FACTORY=0x... \
 *   EVK_VAULT_ADDR=0x...     \
 *   DEPLOYER_PRIVATE_KEY=0x... \
 *   npx hardhat run scripts/deploy-eulerswap-pools.js --network arbitrumOne
 *
 * Optional:
 *   AXUSD_SEED_AMOUNT — AXUSD to seed each pool (default: 0, seed manually post-deploy)
 *   USDC_SEED_AMOUNT  — USDC to seed AXUSD/USDC pool  (default: 0)
 *   AXM_SEED_AMOUNT   — AXM  to seed AXUSD/AXM pool   (default: 0)
 *
 * After deployment, update:
 *   shared/contracts.ts        → EULER_SWAP.AXUSD_USDC_POOL, EULER_SWAP.AXUSD_AXM_POOL
 *   src/config/activeContracts.generated.ts → EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS
 */
const { ethers } = require('hardhat');

const ZERO_ADDR  = '0x0000000000000000000000000000000000000000';
const AXUSD_ERC3643 = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXM           = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const LPM_ADDRESS   = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922';

const EULER_SWAP_FACTORY = process.env.EULER_SWAP_FACTORY ?? ZERO_ADDR;
const EVK_VAULT_ADDR     = process.env.EVK_VAULT_ADDR     ?? ZERO_ADDR;

// Swap fee: 30 bps (0.30%)
const SWAP_FEE_BPS = 30;

const EULERSWAP_FACTORY_ABI = [
  'function createPool(address tokenA, address tokenB, uint256 fee, address vault) returns (address pool)',
  'function getPool(address tokenA, address tokenB, uint256 fee) view returns (address pool)',
  'event PoolCreated(address indexed token0, address indexed token1, uint256 fee, address pool)',
];

const EULERSWAP_POOL_ABI = [
  'function initialize(uint256 reserve0, uint256 reserve1) external',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint256)',
  'function getReserves() view returns (uint256, uint256)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const LPM_ABI = [
  'function addPlatform(address token, address platform) external',
  'function isPlatformWhitelisted(address token, address platform) view returns (bool)',
];

async function whitelistPool(signer, poolAddress, label) {
  if (poolAddress === ZERO_ADDR) return;
  try {
    const lpm = new ethers.Contract(LPM_ADDRESS, LPM_ABI, signer);
    const isWhitelisted = await lpm.isPlatformWhitelisted(AXUSD_ERC3643, poolAddress).catch(() => false);
    if (isWhitelisted) {
      console.log(`  [OK] ${label} already whitelisted in LPM`);
      return;
    }
    const tx = await lpm.addPlatform(AXUSD_ERC3643, poolAddress);
    await tx.wait();
    console.log(`  [OK] ${label} whitelisted in LPM: ${tx.hash}`);
  } catch (err) {
    console.warn(`  [WARN] Could not whitelist ${label} in LPM (may require identity registry admin):`, err?.message);
    console.warn('  → Manual step: POST /api/erc3643/whitelist/add-platform with {"platform":"' + poolAddress + '"}');
  }
}

async function deployPool(factory, signer, tokenA, tokenB, label) {
  console.log(`\n--- Deploying ${label} pool ---`);

  const existing = await factory.getPool(tokenA, tokenB, SWAP_FEE_BPS).catch(() => ZERO_ADDR);
  if (existing && existing !== ZERO_ADDR) {
    console.log(`  Pool already exists at: ${existing}`);
    return existing;
  }

  const vaultArg = EVK_VAULT_ADDR !== ZERO_ADDR ? EVK_VAULT_ADDR : ZERO_ADDR;
  const tx = await factory.createPool(tokenA, tokenB, SWAP_FEE_BPS, vaultArg);
  const receipt = await tx.wait();

  let poolAddress = ZERO_ADDR;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === 'PoolCreated') {
        poolAddress = parsed.args[3] ?? parsed.args.pool;
        break;
      }
    } catch {}
    if (!poolAddress || poolAddress === ZERO_ADDR) {
      poolAddress = log.address;
    }
  }

  if (poolAddress === ZERO_ADDR) {
    throw new Error(`[${label}] Could not determine pool address from transaction receipt`);
  }

  console.log(`  Pool deployed at: ${poolAddress}`);
  return poolAddress;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  if (EULER_SWAP_FACTORY === ZERO_ADDR) {
    console.error('\n[ERROR] EULER_SWAP_FACTORY is not set.');
    console.error('  Check the official factory address at https://euler.finance/swap (Arbitrum One)');
    console.error('  Then re-run with: EULER_SWAP_FACTORY=0x<factory_address> ...');
    process.exit(1);
  }

  console.log('EulerSwap Factory:', EULER_SWAP_FACTORY);
  if (EVK_VAULT_ADDR !== ZERO_ADDR) {
    console.log('EVK Vault (backing):', EVK_VAULT_ADDR);
  } else {
    console.log('[INFO] EVK_VAULT_ADDR not set — pools will be created without vault backing.');
    console.log('       Set EVK_VAULT_ADDR and re-run to connect vault after Task #38 deployment.');
  }

  const factory = new ethers.Contract(EULER_SWAP_FACTORY, EULERSWAP_FACTORY_ABI, deployer);

  const axusdUsdcPool = await deployPool(factory, deployer, AXUSD_ERC3643, USDC, 'AXUSD/USDC');
  const axusdAxmPool  = await deployPool(factory, deployer, AXUSD_ERC3643, AXM,  'AXUSD/AXM');

  console.log('\n--- ERC-3643 LPM Whitelist ---');
  await whitelistPool(deployer, axusdUsdcPool, 'AXUSD/USDC pool');
  await whitelistPool(deployer, axusdAxmPool,  'AXUSD/AXM pool');

  console.log('\n--- Post-Deployment Verification ---');
  for (const [addr, label] of [[axusdUsdcPool, 'AXUSD/USDC'], [axusdAxmPool, 'AXUSD/AXM']]) {
    if (addr === ZERO_ADDR) continue;
    try {
      const pool = new ethers.Contract(addr, EULERSWAP_POOL_ABI, deployer);
      const [token0, token1, fee, reserves] = await Promise.all([
        pool.token0(), pool.token1(), pool.fee(), pool.getReserves(),
      ]);
      console.log(`${label}:`);
      console.log(`  token0:   ${token0}`);
      console.log(`  token1:   ${token1}`);
      console.log(`  fee:      ${fee} bps`);
      console.log(`  reserve0: ${reserves[0].toString()}`);
      console.log(`  reserve1: ${reserves[1].toString()}`);
    } catch (e) {
      console.warn(`  [WARN] Could not verify ${label}: ${e?.message}`);
    }
  }

  console.log(`
=======================================================
  DEPLOYMENT COMPLETE — ACTION REQUIRED
=======================================================

  AXUSD/USDC Pool: ${axusdUsdcPool}
  AXUSD/AXM  Pool: ${axusdAxmPool}
  Factory:         ${EULER_SWAP_FACTORY}
  EVK Vault:       ${EVK_VAULT_ADDR !== ZERO_ADDR ? EVK_VAULT_ADDR : 'NOT CONNECTED — re-run with EVK_VAULT_ADDR'}

  NEXT STEPS:
  1. Update shared/contracts.ts:
       AXUSD_USDC_POOL: '${axusdUsdcPool}',
       AXUSD_AXM_POOL:  '${axusdAxmPool}',

  2. Update src/config/activeContracts.generated.ts:
       EULER_SWAP_AXUSD_USDC_POOL_ADDRESS = '${axusdUsdcPool}'
       EULER_SWAP_AXUSD_AXM_POOL_ADDRESS  = '${axusdAxmPool}'

  3. If LPM whitelist failed above, whitelist manually:
       POST /api/erc3643/whitelist/add-platform  { "platform": "${axusdUsdcPool}" }
       POST /api/erc3643/whitelist/add-platform  { "platform": "${axusdAxmPool}" }

  4. Seed initial liquidity (optional — can be done via EulerSwap UI):
       Use app.euler.finance/swap to add liquidity to both pools.

  5. View on Euler:
       https://app.euler.finance/swap?network=arbitrumone&pool=${axusdUsdcPool}

=======================================================
`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
