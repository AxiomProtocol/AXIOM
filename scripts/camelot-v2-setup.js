const { ethers } = require('ethers');

const AXM   = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ROUTER  = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';
const FACTORY = '0x6EcCab422D763aC031210895C81787E87B43A652';

const REQUIRED_CHAIN_ID = 42161n;
const AXM_DECIMALS  = 18;
const USDC_DECIMALS = 6;
const SLIPPAGE_BPS  = 500;

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function createPair(address tokenA, address tokenB) external returns (address pair)',
];

const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint16 token0FeePercent, uint16 token1FeePercent)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

const ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
];

function getRpcUrl() {
  if (process.env.ARBITRUM_RPC) return process.env.ARBITRUM_RPC;
  if (process.env.RPC_URL) return process.env.RPC_URL;
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (alchemyKey) return `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  console.error('ERROR: No RPC URL available. Set ARBITRUM_RPC, RPC_URL, or ALCHEMY_API_KEY');
  process.exit(1);
}

function getArgs() {
  const priceArg = process.env.AXM_PRICE_USDC;
  const seedArg  = process.env.SEED_AXM;

  if (!priceArg || !seedArg) {
    console.error('ERROR: Set environment variables before running:');
    console.error('  AXM_PRICE_USDC  – price of 1 AXM in USDC (e.g. 0.01)');
    console.error('  SEED_AXM        – number of AXM tokens to seed (e.g. 1000)');
    process.exit(1);
  }

  const price = parseFloat(priceArg);
  const seed  = parseFloat(seedArg);

  if (isNaN(price) || price <= 0) { console.error('AXM_PRICE_USDC must be a positive number'); process.exit(1); }
  if (isNaN(seed)  || seed  <= 0) { console.error('SEED_AXM must be a positive number'); process.exit(1); }

  return { price, seed };
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) { console.error('ERROR: DEPLOYER_PRIVATE_KEY not set'); process.exit(1); }

  const rpcUrl = getRpcUrl();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const net = await provider.getNetwork();
  if (net.chainId !== REQUIRED_CHAIN_ID) {
    console.error(`ERROR: Wrong chain. Expected ${REQUIRED_CHAIN_ID}, got ${net.chainId}`);
    process.exit(1);
  }
  console.log(`Chain ID: ${net.chainId} ✓`);
  console.log(`Deployer: ${wallet.address}`);

  const { price, seed } = getArgs();
  const axmAmount  = ethers.parseUnits(seed.toString(), AXM_DECIMALS);
  const usdcNeeded = seed * price;
  const usdcAmount = ethers.parseUnits(usdcNeeded.toFixed(USDC_DECIMALS), USDC_DECIMALS);

  console.log(`\nSeed plan:`);
  console.log(`  AXM amount:  ${seed} AXM`);
  console.log(`  Price ratio: 1 AXM = ${price} USDC`);
  console.log(`  USDC amount: ${usdcNeeded} USDC`);
  console.log(`  Slippage:    ${SLIPPAGE_BPS / 100}%`);

  const axmToken  = new ethers.Contract(AXM,  ERC20_ABI, wallet);
  const usdcToken = new ethers.Contract(USDC, ERC20_ABI, wallet);

  const [axmBal, usdcBal] = await Promise.all([
    axmToken.balanceOf(wallet.address),
    usdcToken.balanceOf(wallet.address),
  ]);
  console.log(`\nWallet balances:`);
  console.log(`  AXM:  ${ethers.formatUnits(axmBal, AXM_DECIMALS)}`);
  console.log(`  USDC: ${ethers.formatUnits(usdcBal, USDC_DECIMALS)}`);

  if (axmBal < axmAmount) {
    console.error(`ERROR: Insufficient AXM. Need ${seed}, have ${ethers.formatUnits(axmBal, AXM_DECIMALS)}`);
    process.exit(1);
  }
  if (usdcBal < usdcAmount) {
    console.error(`ERROR: Insufficient USDC. Need ${usdcNeeded}, have ${ethers.formatUnits(usdcBal, USDC_DECIMALS)}`);
    process.exit(1);
  }

  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, wallet);

  let pairAddress = await factory.getPair(AXM, USDC);
  let createPairTxHash = null;

  if (pairAddress === ethers.ZeroAddress) {
    console.log('\nNo existing pair found. Creating pair...');
    const tx = await factory.createPair(AXM, USDC);
    console.log(`  createPair tx: ${tx.hash}`);
    const receipt = await tx.wait();
    createPairTxHash = tx.hash;
    console.log(`  Confirmed in block ${receipt.blockNumber} ✓`);
    pairAddress = await factory.getPair(AXM, USDC);
  } else {
    console.log(`\nExisting pair found: ${pairAddress}`);
  }
  console.log(`Pair address: ${pairAddress}`);

  const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
  const [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
  console.log(`  token0: ${token0}`);
  console.log(`  token1: ${token1}`);

  const [axmAllowance, usdcAllowance] = await Promise.all([
    axmToken.allowance(wallet.address, ROUTER),
    usdcToken.allowance(wallet.address, ROUTER),
  ]);

  if (axmAllowance < axmAmount) {
    console.log('\nApproving AXM for router...');
    const tx = await axmToken.approve(ROUTER, ethers.MaxUint256);
    await tx.wait();
    console.log(`  Approved ✓`);
  } else {
    console.log('\nAXM allowance sufficient ✓');
  }

  if (usdcAllowance < usdcAmount) {
    console.log('Approving USDC for router...');
    const tx = await usdcToken.approve(ROUTER, ethers.MaxUint256);
    await tx.wait();
    console.log(`  Approved ✓`);
  } else {
    console.log('USDC allowance sufficient ✓');
  }

  const amountAMin = axmAmount  * (10000n - BigInt(SLIPPAGE_BPS)) / 10000n;
  const amountBMin = usdcAmount * (10000n - BigInt(SLIPPAGE_BPS)) / 10000n;
  const deadline   = Math.floor(Date.now() / 1000) + 600;

  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet);

  console.log('\nDry-run addLiquidity (callStatic)...');
  try {
    const result = await router.addLiquidity.staticCall(
      AXM, USDC,
      axmAmount, usdcAmount,
      amountAMin, amountBMin,
      wallet.address,
      deadline,
    );
    console.log(`  Dry-run passed ✓`);
    console.log(`  Expected: amountA=${ethers.formatUnits(result[0], AXM_DECIMALS)} AXM, amountB=${ethers.formatUnits(result[1], USDC_DECIMALS)} USDC, liquidity=${result[2].toString()}`);
  } catch (err) {
    console.error(`ERROR: Dry-run addLiquidity reverted:`);
    console.error(`  ${err.reason || err.message}`);
    console.error('Aborting. No liquidity was added.');
    process.exit(1);
  }

  console.log('\nBroadcasting addLiquidity...');
  const tx = await router.addLiquidity(
    AXM, USDC,
    axmAmount, usdcAmount,
    amountAMin, amountBMin,
    wallet.address,
    deadline,
  );
  console.log(`  tx hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`  Confirmed in block ${receipt.blockNumber} ✓`);

  console.log('\nReading reserves...');
  const reserves = await pair.getReserves();
  const r0Label = token0.toLowerCase() === AXM.toLowerCase() ? 'AXM' : 'USDC';
  const r1Label = token1.toLowerCase() === AXM.toLowerCase() ? 'AXM' : 'USDC';
  const r0Dec   = r0Label === 'AXM' ? AXM_DECIMALS : USDC_DECIMALS;
  const r1Dec   = r1Label === 'AXM' ? AXM_DECIMALS : USDC_DECIMALS;
  console.log(`  reserve0 (${r0Label}): ${ethers.formatUnits(reserves[0], r0Dec)}`);
  console.log(`  reserve1 (${r1Label}): ${ethers.formatUnits(reserves[1], r1Dec)}`);

  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`AXM:                ${AXM}`);
  console.log(`USDC:               ${USDC}`);
  console.log(`Router:             ${ROUTER}`);
  console.log(`Factory:            ${FACTORY}`);
  console.log(`Pair:               ${pairAddress}`);
  console.log(`token0:             ${token0}`);
  console.log(`token1:             ${token1}`);
  console.log(`Seed AXM:           ${seed}`);
  console.log(`Seed USDC:          ${usdcNeeded}`);
  console.log(`Price:              1 AXM = ${price} USDC`);
  console.log(`Block:              ${receipt.blockNumber}`);
  console.log(`createPair tx:      ${createPairTxHash || 'N/A (pair already existed)'}`);
  console.log(`addLiquidity tx:    ${tx.hash}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Unhandled error:', err.message);
  process.exit(1);
});
