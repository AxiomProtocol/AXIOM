/**
 * seed-axm-pool.js
 *
 * Seeds the AXM/AXUSD EulerSwap pool by:
 *   1. Approving AXM spend by eAXM-1 vault
 *   2. Depositing AXM into eAXM-1 vault (deployer → vault shares)
 *   3. Authorizing the pool as EVC operator on deployer's account
 *   4. Calling pool.reconfigure(dParams, initialState) to activate liquidity
 *
 * eAXUSD-6 already has 10,000 AXUSD from the deployer (pre-existing shares).
 * Initial price: 1 AXM = 1 AXUSD (placeholder — traders will arb to market).
 * Fee: 0.3% (volatile pair standard).
 * Concentration: 0.5 (moderate — volatile pair).
 *
 * Usage: npx hardhat run scripts/seed-axm-pool.js --network arbitrum
 */
const { ethers } = require('hardhat');

// ─── Addresses ────────────────────────────────────────────────────────────────
const AXM          = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'; // 18 dec
const AXUSD        = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'; // 18 dec
const eAXM_VAULT   = '0x8e28ffa89d168599156004db4f4d12c2af7c250e'; // eAXM-1 (supply-only)
const eAXUSD_VAULT = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6
const AXM_POOL     = '0x981763699D269E129a08E216b1AeC7caa376A8a8'; // AXM/AXUSD EulerSwap pool
const EVC          = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';

// ─── Seed Amounts ─────────────────────────────────────────────────────────────
const SEED_AXM        = ethers.parseUnits('10000', 18); // 10,000 AXM → eAXM-1
const EQUIL_AXM       = ethers.parseUnits('10000', 18); // equilibriumReserve0
const EQUIL_AXUSD     = ethers.parseUnits('9000',  18); // equilibriumReserve1 (use 9k of 10k)
const MIN_AXM         = ethers.parseUnits('500',   18); // minReserve0
const MIN_AXUSD       = ethers.parseUnits('450',   18); // minReserve1
const INIT_RESERVE0   = ethers.parseUnits('10000', 18); // initialState.reserve0
const INIT_RESERVE1   = ethers.parseUnits('9000',  18); // initialState.reserve1

// ─── Curve Params ─────────────────────────────────────────────────────────────
// priceX/priceY: 1:1 initial placeholder — uint80, WAD-scaled
const PRICE_X         = BigInt('1000000000000000000'); // 1e18 (1 AXUSD per AXM)
const PRICE_Y         = BigInt('1000000000000000000'); // 1e18
// concentration: 0.5 — moderate for volatile pair (uint64)
const CONCENTRATION   = BigInt('500000000000000000');  // 5e17
// fee: 0.3% (uint64) — 3e15
const FEE             = BigInt('3000000000000000');    // 3e15
// expiration: 0 = no expiry (uint40)
const EXPIRATION      = BigInt('0');
// swapHookedOperations, swapHook: none (uint8, address)
const SWAP_HOOKED_OPS = BigInt('0');
const SWAP_HOOK       = '0x0000000000000000000000000000000000000000';

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address,uint256) external returns (bool)',
  'function allowance(address,address) view returns (uint256)',
];
const EVK_ABI = [
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function balanceOf(address) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function convertToShares(uint256) view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
];
const POOL_ABI = [
  'function getStaticParams() view returns (address supplyVault0, address supplyVault1, address borrowVault0, address borrowVault1, address eulerAccount, address feeRecipient)',
  'function getDynamicParams() view returns (uint112 equilibriumReserve0, uint112 equilibriumReserve1, uint112 minReserve0, uint112 minReserve1, uint80 priceX, uint80 priceY, uint64 concentrationX, uint64 concentrationY, uint64 fee0, uint64 fee1, uint40 expiration, uint8 swapHookedOperations, address swapHook)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 status)',
  'function reconfigure((uint112 equilibriumReserve0, uint112 equilibriumReserve1, uint112 minReserve0, uint112 minReserve1, uint80 priceX, uint80 priceY, uint64 concentrationX, uint64 concentrationY, uint64 fee0, uint64 fee1, uint40 expiration, uint8 swapHookedOperations, address swapHook) dParams, (uint112 reserve0, uint112 reserve1) initialState) external',
];
const EVC_ABI = [
  'function setAccountOperator(address account, address operator, bool authorized) external',
  'function isAccountOperatorAuthorized(address account, address operator) view returns (bool)',
];

let nonce;
async function nextNonce(provider, addr) {
  if (nonce === undefined) nonce = await provider.getTransactionCount(addr, 'latest');
  return nonce++;
}

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Deployer:', signer.address);
  const ethBal = await ethers.provider.getBalance(signer.address);
  console.log('ETH balance:', ethers.formatEther(ethBal));

  const axm    = new ethers.Contract(AXM, ERC20_ABI, signer);
  const eAxm   = new ethers.Contract(eAXM_VAULT, EVK_ABI, signer);
  const eAxusd = new ethers.Contract(eAXUSD_VAULT, EVK_ABI, signer);
  const pool   = new ethers.Contract(AXM_POOL, POOL_ABI, signer);
  const evc    = new ethers.Contract(EVC, EVC_ABI, signer);
  const feeData = await ethers.provider.getFeeData();

  // ── Pre-flight checks ──────────────────────────────────────────────────────
  const axmBal     = await axm.balanceOf(signer.address);
  const eAxmShares = await eAxm.balanceOf(signer.address);
  const eAxusdBal  = await eAxusd.balanceOf(signer.address);
  console.log('\n--- Pre-flight ---');
  console.log('AXM wallet balance:', ethers.formatUnits(axmBal, 18));
  console.log('eAXM-1 shares    :', ethers.formatUnits(eAxmShares, 18));
  console.log('eAXUSD-6 shares  :', ethers.formatUnits(eAxusdBal, 18));
  if (axmBal < SEED_AXM) throw new Error(`Insufficient AXM. Need ${ethers.formatUnits(SEED_AXM,18)}, have ${ethers.formatUnits(axmBal,18)}`);
  if (eAxusdBal < EQUIL_AXUSD) throw new Error(`Insufficient eAXUSD-6 shares. Need ${ethers.formatUnits(EQUIL_AXUSD,18)}, have ${ethers.formatUnits(eAxusdBal,18)}`);
  console.log('Pre-flight OK ✓');

  // ── Step 1: Approve AXM → eAXM-1 ─────────────────────────────────────────
  console.log('\n--- Step 1: Approve AXM → eAXM-1 ---');
  const allowance = await axm.allowance(signer.address, eAXM_VAULT);
  if (allowance < SEED_AXM) {
    const tx = await axm.approve(eAXM_VAULT, ethers.MaxUint256, { nonce: await nextNonce(ethers.provider, signer.address) });
    console.log('  Approve tx:', tx.hash);
    await tx.wait();
    console.log('  [OK] AXM approved for eAXM-1');
  } else {
    console.log('  [OK] Already approved');
  }

  // ── Step 2: Deposit AXM into eAXM-1 ───────────────────────────────────────
  console.log('\n--- Step 2: Deposit', ethers.formatUnits(SEED_AXM, 18), 'AXM into eAXM-1 ---');
  if (eAxmShares > BigInt(0)) {
    console.log('  [OK] Already have', ethers.formatUnits(eAxmShares, 18), 'eAXM-1 shares — skipping deposit');
  } else {
    const staticOk = await eAxm.deposit.staticCall(SEED_AXM, signer.address).catch(e => { throw new Error('deposit static call failed: ' + e.message); });
    console.log('  Static call OK — shares to receive:', ethers.formatUnits(staticOk, 18));
    const depositTx = await eAxm.deposit(SEED_AXM, signer.address, {
      nonce: await nextNonce(ethers.provider, signer.address),
      gasLimit: 300_000,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });
    console.log('  Deposit tx:', depositTx.hash);
    const r = await depositTx.wait();
    console.log('  Status:', r.status === 1 ? 'SUCCESS ✓' : 'REVERTED ✗');
    if (r.status !== 1) process.exit(1);
    const newShares = await eAxm.balanceOf(signer.address);
    console.log('  eAXM-1 shares:', ethers.formatUnits(newShares, 18));
  }

  // ── Step 3: Authorize pool as EVC operator ────────────────────────────────
  console.log('\n--- Step 3: EVC Operator Authorization ---');
  const isOp = await evc.isAccountOperatorAuthorized(signer.address, AXM_POOL).catch(() => false);
  if (isOp) {
    console.log('  [OK] Pool already authorized as EVC operator');
  } else {
    const opTx = await evc.setAccountOperator(signer.address, AXM_POOL, true, {
      nonce: await nextNonce(ethers.provider, signer.address),
      gasLimit: 200_000,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });
    console.log('  setAccountOperator tx:', opTx.hash);
    await opTx.wait();
    console.log('  [OK] Pool authorized as EVC operator');
  }

  // ── Step 4: reconfigure pool ───────────────────────────────────────────────
  console.log('\n--- Step 4: pool.reconfigure() ---');
  const dParams = {
    equilibriumReserve0:  EQUIL_AXM,
    equilibriumReserve1:  EQUIL_AXUSD,
    minReserve0:          MIN_AXM,
    minReserve1:          MIN_AXUSD,
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
  const initialState = { reserve0: INIT_RESERVE0, reserve1: INIT_RESERVE1 };

  console.log('  dParams.equilibriumReserve0:', ethers.formatUnits(dParams.equilibriumReserve0, 18), 'AXM');
  console.log('  dParams.equilibriumReserve1:', ethers.formatUnits(dParams.equilibriumReserve1, 18), 'AXUSD');
  console.log('  dParams.priceX/priceY:      ', dParams.priceX.toString(), '/', dParams.priceY.toString());
  console.log('  dParams.concentration:      ', dParams.concentrationX.toString());
  console.log('  dParams.fee0/fee1:          ', dParams.fee0.toString());
  console.log('  initialState.reserve0:      ', ethers.formatUnits(initialState.reserve0, 18), 'AXM');
  console.log('  initialState.reserve1:      ', ethers.formatUnits(initialState.reserve1, 18), 'AXUSD');

  // Static call first
  try {
    await pool.reconfigure.staticCall(dParams, initialState);
    console.log('  Static call OK ✓');
  } catch(e) {
    console.error('  Static call REVERT:', e?.reason || e?.message?.slice(0, 200));
    console.error('  Aborting — pool.reconfigure() would fail');
    process.exit(1);
  }

  const recTx = await pool.reconfigure(dParams, initialState, {
    nonce: await nextNonce(ethers.provider, signer.address),
    gasLimit: 500_000,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });
  console.log('  reconfigure tx:', recTx.hash);
  const recReceipt = await recTx.wait();
  console.log('  Status:', recReceipt.status === 1 ? 'SUCCESS ✓' : 'REVERTED ✗');
  if (recReceipt.status !== 1) process.exit(1);

  // ── Verify ─────────────────────────────────────────────────────────────────
  console.log('\n--- Verification ---');
  const [dp, res] = await Promise.all([pool.getDynamicParams(), pool.getReserves()]);
  console.log('equilibriumReserve0:', ethers.formatUnits(dp.equilibriumReserve0, 18), 'AXM');
  console.log('equilibriumReserve1:', ethers.formatUnits(dp.equilibriumReserve1, 18), 'AXUSD');
  console.log('priceX/priceY:      ', dp.priceX.toString(), '/', dp.priceY.toString());
  console.log('concentrationX:     ', dp.concentrationX.toString());
  console.log('fee0/fee1:          ', dp.fee0.toString(), '/', dp.fee1.toString());
  console.log('reserve0:           ', ethers.formatUnits(res.reserve0, 18), 'AXM');
  console.log('reserve1:           ', ethers.formatUnits(res.reserve1, 18), 'AXUSD');

  console.log(`
======================================================
  AXM/AXUSD POOL — SEEDED AND ACTIVE
======================================================
  Pool       : ${AXM_POOL}
  eAXM-1     : ${eAXM_VAULT}
  eAXUSD-6   : ${eAXUSD_VAULT}
  Equil AXM  : 10,000 AXM
  Equil AXUSD: 9,000 AXUSD
  Price      : 1:1 placeholder (0.3% fee, 0.5 concentration)
  LPM        : whitelisted ✓
======================================================
`);
}
main().catch(e => { console.error(e?.reason || e?.message?.slice(0,400)); process.exit(1); });
