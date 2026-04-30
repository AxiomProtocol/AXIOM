/**
 * scripts/topup-paxg-buffer.ts
 *
 * Server-side companion to the in-app MainnetSwapAndBridge widget.
 * Runs the same flow non-interactively against the deployer wallet:
 *
 *   1. Read deployer USDC balance on Ethereum mainnet.
 *   2. Quote USDC -> PAXG on Uniswap V3 (0.3% pool) via QuoterV2.
 *   3. Cross-check vs Chainlink XAU/USD; refuse if price impact > MAX_PRICE_IMPACT_BPS.
 *   4. Approve USDC to SwapRouter02, swap with computed minOut.
 *   5. Approve PAXG to the Arbitrum L1 gateway returned by L1GatewayRouter.l1TokenToGateway.
 *   6. Compute bridge gas via Inbox.calculateRetryableSubmissionFee + L2 gas price.
 *   7. Call L1GatewayRouter.outboundTransfer with the computed callValue.
 *   8. (Optional) Poll deployer's PAXG balance on Arbitrum until it increases.
 *
 * Usage:
 *
 *   USDC=250 npx tsx scripts/topup-paxg-buffer.ts          # live
 *   USDC=250 DRY_RUN=1 npx tsx scripts/topup-paxg-buffer.ts # plan only
 *
 * Env required (live mode):
 *   DEPLOYER_PRIVATE_KEY  - signer for both mainnet swap and bridge call
 *   ALCHEMY_API_KEY       - mainnet + arbitrum RPC
 *
 * Env optional:
 *   USDC                  - amount in USDC (decimal string), default '100'
 *   MAX_PRICE_IMPACT_BPS  - default 300 (3%)
 *   SLIPPAGE_BPS          - default 100 (1%) applied to the QuoterV2 quote for minOut
 *   DRY_RUN               - '1' to print plan and exit without sending tx
 *   POLL_ARBITRUM_AFTER   - '1' to poll deployer PAXG on Arbitrum until it grows
 */

import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
if (!ALCHEMY_KEY) throw new Error('ALCHEMY_API_KEY required');

const DEPLOYER_PK = process.env.DEPLOYER_PRIVATE_KEY ?? '';
const DRY_RUN = process.env.DRY_RUN === '1';
if (!DEPLOYER_PK && !DRY_RUN) {
  throw new Error('DEPLOYER_PRIVATE_KEY required (or set DRY_RUN=1 to plan only)');
}

const USDC_AMOUNT = process.env.USDC ?? '100';
const MAX_PRICE_IMPACT_BPS = Number(process.env.MAX_PRICE_IMPACT_BPS ?? '300');
const SLIPPAGE_BPS = BigInt(process.env.SLIPPAGE_BPS ?? '100');
const POLL_AFTER = process.env.POLL_ARBITRUM_AFTER === '1';

const L1_RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const L2_RPC = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const USDC_MAINNET    = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const PAXG_MAINNET    = '0x45804880De22913dAFE09f4980848ECE6EcbAf78';
const PAXG_ARBITRUM   = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const SWAP_ROUTER_02  = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
const QUOTER_V2       = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
const L1_GATEWAY_ROUTER = '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef';
const ARBITRUM_INBOX  = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';
const CL_XAU_USD      = '0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6';
const POOL_FEE = 3000;

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function decimals() view returns (uint8)',
];
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
];
const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
];
const GATEWAY_ROUTER_ABI = [
  'function l1TokenToGateway(address) view returns (address)',
  'function outboundTransfer(address _l1Token,address _to,uint256 _amount,uint256 _maxGas,uint256 _gasPriceBid,bytes _data) payable returns (bytes)',
];
const INBOX_ABI = [
  'function calculateRetryableSubmissionFee(uint256 dataLength,uint256 baseFee) view returns (uint256)',
];
const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
];

const L2_GAS_LIMIT = 300_000n;
const L2_GAS_PRICE_BUFFER_BPS = 300n;
const SUBMISSION_FEE_BUFFER_BPS = 300n;
const ESTIMATED_DATA_LENGTH = 360n;
const ETH_HEADROOM_WEI = ethers.parseEther('0.003');

type Plan = {
  deployer: string;
  usdcIn: string;
  paxgQuoteOut: string;
  paxgQuoteOutRaw: string;
  minOut: string;
  minOutRaw: string;
  priceImpactBps: number;
  bridgeCallValueWei: string;
  bridgeCallValueEth: string;
  maxSubmissionCostWei: string;
  maxGas: string;
  gasPriceBidWei: string;
  ethBalanceWei: string;
  ethBalanceEth: string;
  ethSufficient: boolean;
  usdcBalanceWei: string;
  usdcBalanceFmt: string;
  usdcSufficient: boolean;
  arbitrumBalanceBefore: string;
};

async function buildPlan(): Promise<Plan> {
  const l1 = new ethers.JsonRpcProvider(L1_RPC);
  const l2 = new ethers.JsonRpcProvider(L2_RPC);

  const wallet = DEPLOYER_PK
    ? new ethers.Wallet(DEPLOYER_PK, l1)
    : ethers.Wallet.createRandom().connect(l1);

  const usdc = new ethers.Contract(USDC_MAINNET, ERC20_ABI, l1);
  const paxgArb = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, l2);
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, l1);
  const chainlink = new ethers.Contract(CL_XAU_USD, CHAINLINK_ABI, l1);
  const inbox = new ethers.Contract(ARBITRUM_INBOX, INBOX_ABI, l1);

  const usdcInRaw = ethers.parseUnits(USDC_AMOUNT, 6);

  const [usdcBalance, ethBalance, quoteOut, xauRound, l1Block, l2GasPriceRaw, arbBalBefore] =
    await Promise.all([
      usdc.balanceOf(wallet.address),
      l1.getBalance(wallet.address),
      quoter.quoteExactInputSingle.staticCall({
        tokenIn: USDC_MAINNET,
        tokenOut: PAXG_MAINNET,
        amountIn: usdcInRaw,
        fee: POOL_FEE,
        sqrtPriceLimitX96: 0n,
      }),
      chainlink.latestRoundData(),
      l1.getBlock('latest'),
      l2.send('eth_gasPrice', []),
      paxgArb.balanceOf(wallet.address),
    ]);

  const paxgOutRaw: bigint = (quoteOut as any).amountOut ?? (quoteOut as any)[0];
  const xauPrice = Number(xauRound[1]) / 1e8;
  const fairPaxg = Number(USDC_AMOUNT) / xauPrice;
  const actualPaxg = Number(ethers.formatUnits(paxgOutRaw, 18));
  const priceImpactBps = Math.max(0, Math.round(((fairPaxg - actualPaxg) / fairPaxg) * 10_000));

  const minOutRaw = (paxgOutRaw * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  const l1BaseFee = l1Block?.baseFeePerGas ?? ethers.parseUnits('10', 'gwei');
  const l2GasPrice = BigInt(l2GasPriceRaw);
  const l2GasPriceBidded = (l2GasPrice * (10000n + L2_GAS_PRICE_BUFFER_BPS)) / 10000n;
  const submissionFeeRaw = await inbox.calculateRetryableSubmissionFee(
    ESTIMATED_DATA_LENGTH,
    l1BaseFee,
  );
  const submissionFee = (submissionFeeRaw * (10000n + SUBMISSION_FEE_BUFFER_BPS)) / 10000n;
  const bridgeCallValue = submissionFee + L2_GAS_LIMIT * l2GasPriceBidded;

  return {
    deployer: wallet.address,
    usdcIn: USDC_AMOUNT,
    paxgQuoteOut: ethers.formatUnits(paxgOutRaw, 18),
    paxgQuoteOutRaw: paxgOutRaw.toString(),
    minOut: ethers.formatUnits(minOutRaw, 18),
    minOutRaw: minOutRaw.toString(),
    priceImpactBps,
    bridgeCallValueWei: bridgeCallValue.toString(),
    bridgeCallValueEth: ethers.formatEther(bridgeCallValue),
    maxSubmissionCostWei: submissionFee.toString(),
    maxGas: L2_GAS_LIMIT.toString(),
    gasPriceBidWei: l2GasPriceBidded.toString(),
    ethBalanceWei: ethBalance.toString(),
    ethBalanceEth: ethers.formatEther(ethBalance),
    ethSufficient: ethBalance >= bridgeCallValue + ETH_HEADROOM_WEI,
    usdcBalanceWei: usdcBalance.toString(),
    usdcBalanceFmt: ethers.formatUnits(usdcBalance, 6),
    usdcSufficient: usdcBalance >= usdcInRaw,
    arbitrumBalanceBefore: ethers.formatUnits(arbBalBefore, 18),
  };
}

async function execute(plan: Plan): Promise<void> {
  const l1 = new ethers.JsonRpcProvider(L1_RPC);
  const l2 = new ethers.JsonRpcProvider(L2_RPC);
  const wallet = new ethers.Wallet(DEPLOYER_PK, l1);

  const usdc = new ethers.Contract(USDC_MAINNET, ERC20_ABI, wallet);
  const paxg = new ethers.Contract(PAXG_MAINNET, ERC20_ABI, wallet);
  const router = new ethers.Contract(SWAP_ROUTER_02, ROUTER_ABI, wallet);
  const gatewayRouter = new ethers.Contract(L1_GATEWAY_ROUTER, GATEWAY_ROUTER_ABI, wallet);
  const paxgArb = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, l2);

  const usdcInRaw = ethers.parseUnits(plan.usdcIn, 6);
  const minOutRaw = ethers.parseUnits(plan.minOut, 18);

  console.log('[1/6] approve USDC -> SwapRouter02');
  const allowance = await usdc.allowance(wallet.address, SWAP_ROUTER_02);
  if (allowance < usdcInRaw) {
    const tx = await usdc.approve(SWAP_ROUTER_02, ethers.MaxUint256);
    await tx.wait();
    console.log('   ok', tx.hash);
  } else {
    console.log('   already sufficient');
  }

  console.log('[2/6] swap USDC -> PAXG (0.3%)');
  const swapTx = await router.exactInputSingle({
    tokenIn: USDC_MAINNET,
    tokenOut: PAXG_MAINNET,
    fee: POOL_FEE,
    recipient: wallet.address,
    amountIn: usdcInRaw,
    amountOutMinimum: minOutRaw,
    sqrtPriceLimitX96: 0n,
  });
  const swapReceipt = await swapTx.wait();
  console.log('   ok', swapTx.hash);

  console.log('[3/6] read PAXG balance after swap');
  const paxgBalAfterSwap: bigint = await paxg.balanceOf(wallet.address);
  console.log('   PAXG on mainnet:', ethers.formatUnits(paxgBalAfterSwap, 18));

  console.log('[4/6] resolve L1 gateway for PAXG');
  const gateway: string = await gatewayRouter.l1TokenToGateway(PAXG_MAINNET);
  if (gateway === ethers.ZeroAddress) {
    throw new Error('L1GatewayRouter returned zero gateway for PAXG');
  }
  console.log('   gateway:', gateway);

  console.log('[5/6] approve PAXG -> gateway');
  const paxgAllowance = await paxg.allowance(wallet.address, gateway);
  if (paxgAllowance < paxgBalAfterSwap) {
    const tx = await paxg.approve(gateway, ethers.MaxUint256);
    await tx.wait();
    console.log('   ok', tx.hash);
  } else {
    console.log('   already sufficient');
  }

  console.log('[6/6] outboundTransfer');
  const callValue       = BigInt(plan.bridgeCallValueWei);
  const maxSubmissionCost = BigInt(plan.maxSubmissionCostWei);
  const maxGas          = BigInt(plan.maxGas);
  const gasPriceBid     = BigInt(plan.gasPriceBidWei);
  // Same hand-rolled encoding as hooks/axau/useMainnetSwapAndBridge.ts:
  //   abi.encode(maxSubmissionCost, bytes(""))
  // = 32 bytes maxSubmissionCost || 32 bytes offset(0x40) || 32 bytes length(0)
  const data = ('0x' +
    maxSubmissionCost.toString(16).padStart(64, '0') +
    '0000000000000000000000000000000000000000000000000000000000000040' +
    '0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`;
  const bridgeTx = await gatewayRouter.outboundTransfer(
    PAXG_MAINNET,
    wallet.address,
    paxgBalAfterSwap,
    maxGas,
    gasPriceBid,
    data,
    { value: callValue },
  );
  await bridgeTx.wait();
  console.log('   ok', bridgeTx.hash);

  if (POLL_AFTER) {
    console.log('[wait] polling Arbitrum PAXG balance for arrival...');
    const baseline = ethers.parseUnits(plan.arbitrumBalanceBefore, 18);
    const dust = ethers.parseUnits('0.0001', 18);
    const start = Date.now();
    const TIMEOUT_MS = 25 * 60_000;
    while (Date.now() - start < TIMEOUT_MS) {
      const bal: bigint = await paxgArb.balanceOf(wallet.address);
      if (bal >= baseline + dust) {
        console.log('   ARRIVED. New PAXG on Arbitrum:', ethers.formatUnits(bal, 18));
        return;
      }
      await new Promise((r) => setTimeout(r, 30_000));
    }
    console.warn('   timed out waiting for arrival; bridge tx submitted but PAXG not yet credited');
  }
}

async function main() {
  console.log('=== PAXG buffer top-up plan ===');
  const plan = await buildPlan();
  console.log(JSON.stringify(plan, null, 2));

  if (!plan.usdcSufficient) {
    throw new Error(`Deployer USDC on mainnet (${plan.usdcBalanceFmt}) < required ${plan.usdcIn}`);
  }
  if (!plan.ethSufficient) {
    throw new Error(`Deployer ETH on mainnet (${plan.ethBalanceEth}) < bridge cost ${plan.bridgeCallValueEth} + headroom 0.003`);
  }
  if (plan.priceImpactBps > MAX_PRICE_IMPACT_BPS) {
    throw new Error(`Price impact ${plan.priceImpactBps}bps > limit ${MAX_PRICE_IMPACT_BPS}bps`);
  }

  if (DRY_RUN) {
    console.log('\nDRY_RUN=1 — exiting without sending transactions.');
    return;
  }

  console.log('\n=== executing top-up ===');
  await execute(plan);
  console.log('\nDone. Buffer top-up submitted.');
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});
