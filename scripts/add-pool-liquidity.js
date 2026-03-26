/**
 * Add USDC liquidity to the EulerSwap AXUSD/USDC pool
 *
 * Usage:
 *   USDC_AMOUNT=500 node scripts/add-pool-liquidity.js --network arbitrumOne
 *
 * What it does:
 *   1. Checks current pool state and eulerAccount vault positions
 *   2. Approves USDC to the EUSDC vault (if needed)
 *   3. Deposits the specified USDC amount into the EUSDC vault under the eulerAccount
 *   4. Calls pool.reconfigure() via EVC to update equilibrium reserves proportionally
 *
 * The AXUSD side already has 10,000 AXUSD in eAXUSD-6 — no AXUSD deposit needed.
 * After this script, USDC→AXUSD and AXUSD→USDC swaps will both work at the new depth.
 */

const { ethers } = require('ethers');

const POOL       = '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8';
const EVC        = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';
const EUSDC      = '0x44C10DA836d2aBe881b77bbB0b3DCE5f85C0C1Cc'; // USDC supply vault
const EVK_VAULT  = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6 (AXUSD supply vault)
const USDC_TOKEN = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_TOKEN= '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const USDC_DEPOSIT_AMOUNT = process.env.USDC_AMOUNT
  ? ethers.parseUnits(process.env.USDC_AMOUNT, 6)
  : ethers.parseUnits('500', 6); // default: 500 USDC

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const VAULT_ABI = [
  'function asset() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
  'function totalAssets() view returns (uint256)',
];

const POOL_ABI = [
  {
    type: 'function',
    name: 'getReserves',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'status',   type: 'uint32'  },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDynamicParams',
    inputs: [],
    outputs: [
      { name: 'equilibriumReserve0',   type: 'uint112' },
      { name: 'equilibriumReserve1',   type: 'uint112' },
      { name: 'minReserve0',           type: 'uint112' },
      { name: 'minReserve1',           type: 'uint112' },
      { name: 'priceX',                type: 'uint80'  },
      { name: 'priceY',                type: 'uint80'  },
      { name: 'concentrationX',        type: 'uint64'  },
      { name: 'concentrationY',        type: 'uint64'  },
      { name: 'fee0',                  type: 'uint64'  },
      { name: 'fee1',                  type: 'uint64'  },
      { name: 'expiration',            type: 'uint40'  },
      { name: 'swapHookedOperations',  type: 'uint8'   },
      { name: 'swapHook',              type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reconfigure',
    inputs: [
      {
        type: 'tuple', name: 'dParams', components: [
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
        ],
      },
      {
        type: 'tuple', name: 'initialState', components: [
          { name: 'reserve0', type: 'uint112' },
          { name: 'reserve1', type: 'uint112' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

const EVC_ABI = [
  'function call(address targetContract, address onBehalfOfAccount, uint256 value, bytes calldata data) payable returns (bytes memory result)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const signer   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('=== EulerSwap Pool Liquidity Addition ===');
  console.log('Deployer (eulerAccount):', signer.address);
  console.log('Depositing:', ethers.formatUnits(USDC_DEPOSIT_AMOUNT, 6), 'USDC\n');

  // ── 1. Pre-flight checks ─────────────────────────────────────────────────
  const usdc     = new ethers.Contract(USDC_TOKEN, ERC20_ABI, provider);
  const eusdcV   = new ethers.Contract(EUSDC, VAULT_ABI, provider);
  const evkV     = new ethers.Contract(EVK_VAULT, VAULT_ABI, provider);
  const pool     = new ethers.Contract(POOL, POOL_ABI, provider);

  const [usdcBalance, eusdcShares, evkShares, reserves, dynParams] = await Promise.all([
    usdc.balanceOf(signer.address),
    eusdcV.balanceOf(signer.address),
    evkV.balanceOf(signer.address),
    pool.getReserves(),
    pool.getDynamicParams(),
  ]);

  const usdcInVault  = eusdcShares > 0n ? await eusdcV.convertToAssets(eusdcShares) : 0n;
  const axusdInVault = evkShares   > 0n ? await evkV.convertToAssets(evkShares)     : 0n;

  console.log('Current state:');
  console.log('  Wallet USDC balance:  ', ethers.formatUnits(usdcBalance, 6), 'USDC');
  console.log('  EUSDC vault position: ', ethers.formatUnits(usdcInVault, 6), 'USDC');
  console.log('  eAXUSD-6 position:    ', ethers.formatUnits(axusdInVault, 18), 'AXUSD');
  console.log('  Pool reserve0 (USDC): ', ethers.formatUnits(reserves[0], 6));
  console.log('  Pool reserve1 (AXUSD):', ethers.formatUnits(reserves[1], 18));

  if (usdcBalance < USDC_DEPOSIT_AMOUNT) {
    console.error(`\nInsufficient USDC: have ${ethers.formatUnits(usdcBalance, 6)}, need ${ethers.formatUnits(USDC_DEPOSIT_AMOUNT, 6)}`);
    process.exit(1);
  }

  // ── 2. Approve USDC to EUSDC vault (if needed) ──────────────────────────
  const allowance = await usdc.allowance(signer.address, EUSDC);
  if (allowance < USDC_DEPOSIT_AMOUNT) {
    console.log('\nApproving USDC to EUSDC vault...');
    const approveTx = await usdc.connect(signer).approve(EUSDC, ethers.MaxUint256);
    await approveTx.wait();
    console.log('  USDC approved ✓');
  } else {
    console.log('\nUSDC already approved ✓');
  }

  // ── 3. Deposit USDC into EUSDC vault ────────────────────────────────────
  console.log(`\nDepositing ${ethers.formatUnits(USDC_DEPOSIT_AMOUNT, 6)} USDC into EUSDC vault...`);
  const depositTx = await eusdcV.connect(signer).deposit(USDC_DEPOSIT_AMOUNT, signer.address);
  const depositReceipt = await depositTx.wait();
  console.log('  TX:', depositTx.hash);
  console.log('  Status:', depositReceipt.status === 1 ? 'SUCCESS ✓' : 'FAILED ✗');

  // Verify new vault balance
  const newEusdcShares = await eusdcV.balanceOf(signer.address);
  const newUsdcInVault = await eusdcV.convertToAssets(newEusdcShares);
  console.log('  EUSDC vault position after:', ethers.formatUnits(newUsdcInVault, 6), 'USDC');

  // ── 4. Reconfigure pool with updated equilibrium reserves ────────────────
  // New equilibrium = current vault balance (capped sensibly)
  // USDC side: full new vault balance as equilibrium
  // AXUSD side: match USDC value at 1:1 (same USD amount), up to available AXUSD
  const newEq0 = newUsdcInVault;                          // USDC (6 dec)
  const newEq1 = newEq0 * BigInt(1e12);                  // AXUSD (18 dec) at 1:1 parity

  // Cap AXUSD equilibrium at actual vault balance
  const cappedEq1 = newEq1 < axusdInVault ? newEq1 : axusdInVault;

  console.log(`\nReconfiguring pool:`);
  console.log('  New equilibriumReserve0 (USDC): ', ethers.formatUnits(newEq0, 6));
  console.log('  New equilibriumReserve1 (AXUSD):', ethers.formatUnits(cappedEq1, 18));

  const newDParams = {
    equilibriumReserve0:  newEq0,
    equilibriumReserve1:  cappedEq1,
    minReserve0:          0n,
    minReserve1:          0n,
    priceX:               dynParams.priceX,
    priceY:               dynParams.priceY,
    concentrationX:       dynParams.concentrationX,
    concentrationY:       dynParams.concentrationY,
    fee0:                 dynParams.fee0,
    fee1:                 dynParams.fee1,
    expiration:           dynParams.expiration,
    swapHookedOperations: dynParams.swapHookedOperations,
    swapHook:             dynParams.swapHook,
  };

  const newInitialState = {
    reserve0: newEq0,    // start reserves at equilibrium
    reserve1: cappedEq1,
  };

  const poolIface  = new ethers.Interface(POOL_ABI);
  const evcIface   = new ethers.Interface(EVC_ABI);
  const calldata   = poolIface.encodeFunctionData('reconfigure', [newDParams, newInitialState]);
  const evcCalldata = evcIface.encodeFunctionData('call', [POOL, signer.address, 0, calldata]);

  console.log('\nSending reconfigure via EVC...');
  const reconfTx = await signer.sendTransaction({ to: EVC, data: evcCalldata, gasLimit: 600_000 });
  const reconfReceipt = await reconfTx.wait();
  console.log('  TX:', reconfTx.hash);
  console.log('  Status:', reconfReceipt.status === 1 ? 'SUCCESS ✓' : 'FAILED ✗');

  // ── 5. Verify final state ────────────────────────────────────────────────
  const finalReserves = await pool.getReserves();
  const finalDyn      = await pool.getDynamicParams();

  console.log('\n=== Final Pool State ===');
  console.log('  reserve0:             ', ethers.formatUnits(finalReserves[0], 6), 'USDC');
  console.log('  reserve1:             ', ethers.formatUnits(finalReserves[1], 18), 'AXUSD');
  console.log('  equilibriumReserve0:  ', ethers.formatUnits(finalDyn[0], 6), 'USDC');
  console.log('  equilibriumReserve1:  ', ethers.formatUnits(finalDyn[1], 18), 'AXUSD');
  console.log('  fee:                  ', (Number(finalDyn[8]) / 1e14).toFixed(3), 'bps');
  console.log('\nPool is ready for trading at new depth ✓');
}

main().catch(e => {
  console.error('ERROR:', e.reason || e.message?.slice(0, 300));
  process.exit(1);
});
