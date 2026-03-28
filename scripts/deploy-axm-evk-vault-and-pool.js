/**
 * deploy-axm-evk-vault-and-pool.js
 *
 * Two-phase deployment for AXM/AXUSD EulerSwap pool:
 *
 * Phase 1 — Deploy Euler EVK AXM Vault
 *   Creates a non-upgradeable Euler V2 EVK vault for AXM using the official
 *   eVaultFactory (0x78Df...) on Arbitrum One. Oracle left as address(0) because
 *   this is a supply-only vault — no borrowing occurs (borrowVault0/1 = ZERO).
 *   After deployment, setHookConfig(0, 0) enables deposits and withdrawals.
 *
 * Phase 2 — Mine Salt & Deploy AXM/AXUSD EulerSwap Pool
 *   EulerSwap V2 pools are Uniswap V4 hooks. The pool address must have the
 *   correct hook permission flags in its lower 14 bits (0x28A8 = BEFORE_INITIALIZE
 *   + BEFORE_ADD_LIQUIDITY + BEFORE_SWAP + BEFORE_DONATE + BEFORE_SWAP_RETURNS_DELTA).
 *   Salt is mined locally by iterating keccak256 until the flag constraint is met.
 *
 * Token ordering (EulerSwap requires asset0 < asset1 by address):
 *   AXM   (0x864F...) < AXUSD (0xD611...) → token0=AXM, token1=AXUSD
 *
 * Both tokens are 18 decimals.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-axm-evk-vault-and-pool.js --network arbitrum
 */
const { ethers } = require('hardhat');
const crypto = require('crypto');

// ─── Addresses (Arbitrum One) ─────────────────────────────────────────────────
const ZERO             = '0x0000000000000000000000000000000000000000';
const AXM              = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'; // 18 dec
const AXUSD            = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'; // 18 dec (AXUSD ERC-3643)
const USDC             = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // unit of account for vault

const EVK_FACTORY      = '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50';
const EVK_IMPL         = '0x832fF4011A3164ea76ceA06A313EE0B6CD72ba96';

const EVK_AXUSD_VAULT  = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6 (token1 vault)
const EULERSWAP_FACTORY = '0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4'; // V2
const EULERSWAP_IMPL   = '0xaf6412d58024874b0ffc4138fff95fc73b372977'; // MetaProxy implementation
const LPM_ADDRESS      = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922';
const COMPLIANCE_ADDR  = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';
const EVC_ADDRESS      = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';
const AXIOM_FEE_BURNER = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94';

// ─── Uniswap V4 Hook Flags ────────────────────────────────────────────────────
// Required hook flag mask derived from the working USDC/AXUSD pool (0x0101D5...a8A8):
//   0xa8A8 & 0x3FFF = 0x28A8
//   BEFORE_INITIALIZE (1<<13) + BEFORE_ADD_LIQUIDITY (1<<11) + BEFORE_SWAP (1<<7)
//   + BEFORE_DONATE (1<<5) + BEFORE_SWAP_RETURNS_DELTA (1<<3)
const HOOK_MASK        = BigInt('0x3FFF'); // lower 14 bits
const REQUIRED_FLAGS   = BigInt('0x28A8'); // must match exactly

// ─── MetaProxy Bytecode ───────────────────────────────────────────────────────
// initcode = BYTECODE_HEAD(32B) + IMPL(20B) + BYTECODE_TAIL(13B) + abi.encode(sParams)(192B)
const BYTECODE_HEAD    = '600b380380600b3d393df3363d3d373d3d3d3d60368038038091363936013d73';
const BYTECODE_TAIL    = '5af43d3d93803e603457fd5bf3';

// ─── Pool Parameters ─────────────────────────────────────────────────────────
// Deploy empty — both tokens 18 dec, volatile pair. reconfigure() after seeding.
const ZERO_RESERVE     = BigInt('0');
const PRICE_X          = BigInt('1000000000000000000'); // 1e18 placeholder (reconfigure with real AXM price)
const PRICE_Y          = BigInt('1000000000000000000'); // 1e18 placeholder
const CONCENTRATION    = BigInt('500000000000000000'); // 0.5e18 — volatile pair (reconfigure to tighter)
const FEE              = BigInt('3000000000000000');   // 0.3% = 3e15 (WAD scale)

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const EVK_FACTORY_ABI = [
  'function createProxy(address desiredImplementation, bool upgradeable, bytes trailingData) external returns (address)',
  'event ProxyCreated(address indexed proxy, bool upgradeable, address implementation, bytes trailingData)',
];

const EVK_VAULT_ABI = [
  'function asset() view returns (address)',
  'function symbol() view returns (string)',
  'function permit2Address() view returns (address)',
  'function hookConfig() view returns (address hookTarget, uint32 hookedOps)',
  'function setHookConfig(address newHookTarget, uint32 newHookedOps) external',
];

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
  },
  {
    type: 'function', name: 'computePoolAddress',
    stateMutability: 'view',
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
  },
  {
    type: 'function', name: 'deployedPools',
    stateMutability: 'view',
    inputs: [{ name: 'pool', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
];

const POOL_ABI = [
  'function getStaticParams() view returns (address supplyVault0, address supplyVault1, address borrowVault0, address borrowVault1, address eulerAccount, address feeRecipient)',
  'function getDynamicParams() view returns (uint112 equilibriumReserve0, uint112 equilibriumReserve1, uint112 minReserve0, uint112 minReserve1, uint80 priceX, uint80 priceY, uint64 concentrationX, uint64 concentrationY, uint64 fee0, uint64 fee1, uint40 expiration, uint8 swapHookedOperations, address swapHook)',
  'function getAssets() view returns (address asset0, address asset1)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 status)',
];

const EVC_ABI = [
  'function setAccountOperator(address account, address operator, bool authorized)',
  'function isAccountOperatorAuthorized(address account, address operator) view returns (bool)',
];

const LPM_ABI = [
  'function addPlatform(address compliance, address platform) external',
  'function isPlatformWhitelisted(address compliance, address platform) view returns (bool)',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitcodeHash(supplyVault0, eulerAccount) {
  const implBytes    = Buffer.from(EULERSWAP_IMPL.slice(2), 'hex');
  const headBytes    = Buffer.from(BYTECODE_HEAD, 'hex');
  const tailBytes    = Buffer.from(BYTECODE_TAIL, 'hex');

  // abi.encode(sParams) = 6 addresses each padded to 32 bytes
  const encodeSParams = (sv0, eulerAcct) => {
    const pad = (addr) => {
      const stripped = addr.toLowerCase().replace('0x', '');
      return Buffer.from('000000000000000000000000' + stripped, 'hex');
    };
    return Buffer.concat([
      pad(sv0),           // supplyVault0
      pad(EVK_AXUSD_VAULT),  // supplyVault1
      pad(ZERO),          // borrowVault0
      pad(ZERO),          // borrowVault1
      pad(eulerAcct),     // eulerAccount
      pad(AXIOM_FEE_BURNER), // feeRecipient
    ]);
  };

  const sParamsEncoded = encodeSParams(supplyVault0, eulerAccount);
  const initcode = Buffer.concat([headBytes, implBytes, tailBytes, sParamsEncoded]);

  const hash = crypto.createHash('sha3-256'); // keccak256
  // Node.js doesn't have keccak256 natively; use ethers
  return ethers.keccak256(initcode);
}

function mineSalt(initcodeHash, factoryAddress) {
  const factoryBuf = Buffer.from(factoryAddress.toLowerCase().slice(2), 'hex');
  const hashBuf    = Buffer.from(initcodeHash.slice(2), 'hex');
  const prefix     = Buffer.from('ff', 'hex');

  const preimage   = Buffer.concat([prefix, factoryBuf, Buffer.alloc(32), hashBuf]); // salt placeholder at [1+20:1+20+32]
  const saltOffset = 1 + 20; // byte offset of salt in preimage

  let nonce = 0;
  const start = Date.now();

  while (true) {
    // Write nonce into salt position (last 4 bytes of 32-byte salt)
    const saltBuf = Buffer.alloc(32);
    saltBuf.writeUInt32BE(nonce, 28);
    saltBuf.copy(preimage, saltOffset);

    const digest = ethers.keccak256(preimage);
    const addrBig = BigInt('0x' + digest.slice(-40));
    const lowerBits = addrBig & HOOK_MASK;

    if (lowerBits === REQUIRED_FLAGS) {
      const elapsed = Date.now() - start;
      const saltHex = '0x' + saltBuf.toString('hex');
      const poolAddr = '0x' + digest.slice(-40);
      console.log(`  Salt mined in ${elapsed}ms after ${nonce} attempts`);
      console.log(`  Salt:        ${saltHex}`);
      console.log(`  Pool addr:   0x${poolAddr}`);
      return { salt: saltHex, poolAddress: '0x' + digest.slice(-40) };
    }

    nonce++;
    if (nonce % 100000 === 0) {
      process.stdout.write(`  Mining... ${nonce} attempts\r`);
    }
    if (nonce > 20_000_000) {
      throw new Error('Salt mining exceeded 20M attempts — check hook flags');
    }
  }
}

async function whitelistPool(signer, poolAddress) {
  try {
    const lpm = new ethers.Contract(LPM_ADDRESS, LPM_ABI, signer);
    const isWhitelisted = await lpm.isPlatformWhitelisted(COMPLIANCE_ADDR, poolAddress).catch(() => false);
    if (isWhitelisted) { console.log('  [OK] Already whitelisted in LPM'); return; }
    const n = freshNonce();
    const tx = await lpm.addPlatform(COMPLIANCE_ADDR, poolAddress, { gasLimit: 300_000, nonce: n });
    await tx.wait();
    console.log('  [OK] Whitelisted in LPM:', tx.hash);
  } catch (err) {
    console.warn('  [WARN] LPM whitelist failed:', err?.reason || err?.message?.slice(0, 100));
    console.warn(`         Manual: LPM.addPlatform(${COMPLIANCE_ADDR}, ${poolAddress})`);
  }
}

async function authorizePool(signer, poolAddress) {
  const evc = new ethers.Contract(EVC_ADDRESS, EVC_ABI, signer);
  const already = await evc.isAccountOperatorAuthorized(signer.address, poolAddress).catch(() => false);
  if (already) { console.log('  [OK] Already authorized as EVC operator'); return; }
  const n = freshNonce();
  const tx = await evc.setAccountOperator(signer.address, poolAddress, true, { gasLimit: 300_000, nonce: n });
  await tx.wait();
  console.log('  [OK] Authorized as EVC operator:', tx.hash);
}

// ─── Nonce Manager ────────────────────────────────────────────────────────────
// Hardhat-ethers caches stale nonces. Fetch once at startup, then increment manually.
let _nonce = null;
async function initNonce(provider, address) {
  _nonce = await provider.getTransactionCount(address, 'latest');
  console.log(`  [Nonce] Starting nonce: ${_nonce}`);
}
function freshNonce() {
  return _nonce++;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// AXM EVK Vault already deployed (Phase 1 completed on 2026-03-28, tx 0x984d86...)
// vault.asset() = AXM ✓, symbol = eAXM-1 ✓, hookTarget=0x00 (no hook blocking ops)
const AXM_EVK_VAULT_PREDEPLOYED = '0x8e28ffa89d168599156004db4f4d12c2af7c250e';

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Deployer:  ', deployer.address);
  console.log('Balance:   ', ethers.formatEther(balance), 'ETH');
  await initNonce(ethers.provider, deployer.address);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — AXM EVK Vault (already deployed, skip re-deployment)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log(' PHASE 1: AXM EVK Vault (pre-deployed)');
  console.log('══════════════════════════════════════════════');

  const AXM_EVK_VAULT = AXM_EVK_VAULT_PREDEPLOYED;
  const axmVault = new ethers.Contract(AXM_EVK_VAULT, EVK_VAULT_ABI, deployer);

  const [vaultAsset, vaultSymbol, hookCfg] = await Promise.all([
    axmVault.asset().catch(() => 'ERROR'),
    axmVault.symbol().catch(() => 'ERROR'),
    axmVault.hookConfig().catch(() => ['ERROR', 0]),
  ]);
  console.log('  AXM EVK Vault:  ', AXM_EVK_VAULT);
  console.log('  vault.asset():  ', vaultAsset, vaultAsset.toLowerCase() === AXM.toLowerCase() ? '✓' : '✗ MISMATCH');
  console.log('  vault.symbol(): ', vaultSymbol);
  console.log('  hookConfig:     ', hookCfg[0], hookCfg[1]?.toString(),
    '(hookTarget=0 → no hook blocks ops)');

  // Only call setHookConfig if hookTarget is non-zero (currently 0x00 = no blocking)
  // hookedOps=32767 with hookTarget=0x00 means hook is not called → ops proceed freely
  if (hookCfg[0] && hookCfg[0] !== ZERO && hookCfg[0] !== '0x0000000000000000000000000000000000000000') {
    console.log('  [INFO] hookTarget non-zero — clearing hook config...');
    const n = freshNonce();
    const tx = await axmVault.setHookConfig(ZERO, 0, { gasLimit: 300_000, nonce: n });
    await tx.wait();
    console.log('  [OK] setHookConfig cleared:', tx.hash);
  } else {
    console.log('  [OK] hookTarget=0x00 — operations proceed freely (no blocking)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Mine Salt & Deploy AXM/AXUSD EulerSwap Pool
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log(' PHASE 2: Mine Salt & Deploy AXM/AXUSD Pool');
  console.log('══════════════════════════════════════════════');

  const sParams = {
    supplyVault0:  AXM_EVK_VAULT,   // AXM vault (just deployed)
    supplyVault1:  EVK_AXUSD_VAULT, // existing eAXUSD-6
    borrowVault0:  ZERO,            // no AXM borrowing
    borrowVault1:  ZERO,            // no AXUSD borrowing
    eulerAccount:  deployer.address,
    feeRecipient:  AXIOM_FEE_BURNER,
  };

  const dParams = {
    equilibriumReserve0:  ZERO_RESERVE,
    equilibriumReserve1:  ZERO_RESERVE,
    minReserve0:          ZERO_RESERVE,
    minReserve1:          ZERO_RESERVE,
    priceX:               PRICE_X,
    priceY:               PRICE_Y,
    concentrationX:       CONCENTRATION,
    concentrationY:       CONCENTRATION,
    fee0:                 FEE,
    fee1:                 FEE,
    expiration:           BigInt('0'),
    swapHookedOperations: 0,
    swapHook:             ZERO,
  };

  const initialState = { reserve0: ZERO_RESERVE, reserve1: ZERO_RESERVE };

  // ─── Mine Salt ────────────────────────────────────────────────────────────
  console.log('\n--- Mining Salt (Uniswap V4 hook flags: 0x28A8) ---');
  const initcodeHash = buildInitcodeHash(AXM_EVK_VAULT, deployer.address);
  console.log('  initcodeHash:', initcodeHash);
  const { salt, poolAddress: minedPoolAddr } = mineSalt(initcodeHash, EULERSWAP_FACTORY);

  // Verify with on-chain factory
  const factory = new ethers.Contract(EULERSWAP_FACTORY, FACTORY_ABI, deployer);
  const onChainAddr = await factory.computePoolAddress(sParams, salt).catch(() => null);
  console.log('  factory.computePoolAddress:', onChainAddr);

  const lowerBits = BigInt(onChainAddr) & HOOK_MASK;
  console.log('  Hook flags check:', '0x' + lowerBits.toString(16), lowerBits === REQUIRED_FLAGS ? '✓' : '✗ MISMATCH');

  if (!onChainAddr || onChainAddr.toLowerCase() !== minedPoolAddr.toLowerCase()) {
    console.error('[ERROR] Pool address mismatch — sParams encoding may differ from mining!');
    console.error('  Mined:    ', minedPoolAddr);
    console.error('  On-chain: ', onChainAddr);
    process.exit(1);
  }

  const POOL_ADDRESS = onChainAddr;
  console.log('  Pool address verified:', POOL_ADDRESS, '✓');

  // ─── Pre-authorize Pool as EVC Operator ──────────────────────────────────
  console.log('\n--- Pre-authorize Pool as EVC Operator ---');
  await authorizePool(deployer, POOL_ADDRESS);

  // ─── Deploy Pool ──────────────────────────────────────────────────────────
  console.log('\n--- Deploy EulerSwap AXM/AXUSD Pool ---');
  const alreadyDeployed = await factory.deployedPools(POOL_ADDRESS).catch(() => false);
  if (alreadyDeployed) {
    console.log('  [OK] Pool already deployed at:', POOL_ADDRESS);
  } else {
    let deployTx;
    try {
      const deployNonce = freshNonce();
      deployTx = await factory.deployPool(sParams, dParams, initialState, salt, { gasLimit: 6_000_000, nonce: deployNonce });
      console.log('  deployPool tx:', deployTx.hash);
      const deployReceipt = await deployTx.wait();
      console.log('  [OK] Pool deployed, block:', deployReceipt.blockNumber);
    } catch (err) {
      console.error('[FATAL] deployPool failed:', err?.reason || err?.message?.slice(0, 300));
      if (err?.data) console.error('  revert data:', err.data);
      process.exit(1);
    }
  }

  // ─── Whitelist in LPM ────────────────────────────────────────────────────
  console.log('\n--- ERC-3643 LPM Whitelist ---');
  await whitelistPool(deployer, POOL_ADDRESS);

  // ─── Verify ───────────────────────────────────────────────────────────────
  console.log('\n--- Post-Deployment Verification ---');
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, deployer);
  try {
    const [assets, reserves] = await Promise.all([pool.getAssets(), pool.getReserves()]);
    console.log('  asset0 (AXM):   ', assets.asset0);
    console.log('  asset1 (AXUSD): ', assets.asset1);
    console.log('  reserve0 (AXM):  ', reserves.reserve0.toString());
    console.log('  reserve1 (AXUSD):', reserves.reserve1.toString());
    console.log('  status:          ', reserves[2].toString(), '(1=unlocked)');
  } catch (err) {
    console.warn('  [WARN] Verification call failed:', err?.message?.slice(0, 80));
  }

  const isDeployed = await factory.deployedPools(POOL_ADDRESS).catch(() => false);
  console.log('  factory.deployedPools:', isDeployed);

  console.log(`
═══════════════════════════════════════════════════════════
  AXM/AXUSD EULERSWAP POOL — DEPLOYMENT COMPLETE
═══════════════════════════════════════════════════════════

  AXM EVK Vault (new)     : ${AXM_EVK_VAULT}
  AXM/AXUSD Pool          : ${POOL_ADDRESS}
  AXUSD EVK Vault (token1): ${EVK_AXUSD_VAULT}

  NEXT STEPS:
  1. Update src/config/activeContracts.generated.ts:
       AXM_EVK_VAULT_ADDRESS = '${AXM_EVK_VAULT}'
       EULER_SWAP_AXUSD_AXM_POOL_ADDRESS = '${POOL_ADDRESS}'

  2. Update shared/contracts.ts with both addresses.

  3. Seed liquidity:
       Deposit AXM into AXM vault, AXUSD into eAXUSD-6 vault,
       then call pool.reconfigure() with real AXM price dParams.

  4. View on Arbiscan:
       Vault: https://arbiscan.io/address/${AXM_EVK_VAULT}
       Pool:  https://arbiscan.io/address/${POOL_ADDRESS}

═══════════════════════════════════════════════════════════
`);
}

main().catch(e => { console.error(e); process.exit(1); });
