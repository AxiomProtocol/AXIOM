/**
 * GET /api/admin/topup-buffer?usdc=250
 *   Returns a non-destructive plan for topping up the deployer PAXG buffer.
 *   Mirrors the math performed by scripts/topup-paxg-buffer.ts.
 *   The planner NEVER signs or sends transactions; the operator runs the
 *   companion script after reviewing the plan. This keeps treasury moves
 *   out of the request path.
 *
 * Auth: x-admin-key header must equal ADMIN_SOLVENCY_KEY.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;
const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';

const L1_RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const L2_RPC = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const USDC_MAINNET    = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const PAXG_MAINNET    = '0x45804880De22913dAFE09f4980848ECE6EcbAf78';
const PAXG_ARBITRUM   = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const QUOTER_V2       = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
const ARBITRUM_INBOX  = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';
const CL_XAU_USD      = '0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6';
const POOL_FEE = 3000;

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160,uint32,uint256)',
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!ADMIN_KEY) return res.status(503).json({ error: 'ADMIN_SOLVENCY_KEY not configured' });
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'ALCHEMY_API_KEY not configured' });

  const usdcStr = (req.query.usdc as string) ?? '100';
  const slippageBps = BigInt((req.query.slippageBps as string) ?? '100');
  const maxImpactBps = Number((req.query.maxImpactBps as string) ?? '300');

  let usdcInRaw: bigint;
  try {
    usdcInRaw = ethers.parseUnits(usdcStr, 6);
    if (usdcInRaw <= 0n) throw new Error('amount must be > 0');
  } catch (e: unknown) {
    return res.status(400).json({ error: 'Invalid usdc amount', detail: e instanceof Error ? e.message : String(e) });
  }

  // Resolve deployer address WITHOUT requiring DEPLOYER_PRIVATE_KEY in the
  // request path; if missing, skip wallet-specific balance checks.
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  const deployerAddress = pk ? new ethers.Wallet(pk).address : null;

  try {
    const l1 = new ethers.JsonRpcProvider(L1_RPC);
    const l2 = new ethers.JsonRpcProvider(L2_RPC);

    const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, l1);
    const chainlink = new ethers.Contract(CL_XAU_USD, CHAINLINK_ABI, l1);
    const inbox = new ethers.Contract(ARBITRUM_INBOX, INBOX_ABI, l1);
    const usdc = new ethers.Contract(USDC_MAINNET, ERC20_ABI, l1);
    const paxgArb = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, l2);

    const [quoteOut, xauRound, l1Block, l2GasPriceRaw, ethBalance, usdcBalance, arbBalBefore] = await Promise.all([
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
      deployerAddress ? l1.getBalance(deployerAddress) : Promise.resolve(0n),
      deployerAddress ? usdc.balanceOf(deployerAddress) : Promise.resolve(0n),
      deployerAddress ? paxgArb.balanceOf(deployerAddress) : Promise.resolve(0n),
    ]);

    const paxgOutRaw: bigint = (quoteOut as any).amountOut ?? (quoteOut as any)[0];
    const xauPrice = Number(xauRound[1]) / 1e8;
    const fairPaxg = Number(usdcStr) / xauPrice;
    const actualPaxg = Number(ethers.formatUnits(paxgOutRaw, 18));
    const priceImpactBps = Math.max(0, Math.round(((fairPaxg - actualPaxg) / fairPaxg) * 10_000));
    const minOutRaw = (paxgOutRaw * (10_000n - slippageBps)) / 10_000n;

    const l1BaseFee = l1Block?.baseFeePerGas ?? ethers.parseUnits('10', 'gwei');
    const l2GasPrice = BigInt(l2GasPriceRaw);
    const l2GasPriceBidded = (l2GasPrice * (10000n + L2_GAS_PRICE_BUFFER_BPS)) / 10000n;
    const submissionFeeRaw = await inbox.calculateRetryableSubmissionFee(ESTIMATED_DATA_LENGTH, l1BaseFee);
    const submissionFee = (submissionFeeRaw * (10000n + SUBMISSION_FEE_BUFFER_BPS)) / 10000n;
    const bridgeCallValue = submissionFee + L2_GAS_LIMIT * l2GasPriceBidded;

    const checks = {
      usdcSufficient: deployerAddress ? (usdcBalance as bigint) >= usdcInRaw : null,
      ethSufficient: deployerAddress ? (ethBalance as bigint) >= bridgeCallValue + ETH_HEADROOM_WEI : null,
      priceImpactWithinLimit: priceImpactBps <= maxImpactBps,
      deployerKeyAvailable: !!deployerAddress,
    };
    const okToExecute = Object.values(checks).every((v) => v === true);

    return res.status(200).json({
      success: true,
      plan: {
        deployer: deployerAddress,
        usdcIn: usdcStr,
        usdcInRaw: usdcInRaw.toString(),
        paxgQuoteOut: ethers.formatUnits(paxgOutRaw, 18),
        paxgQuoteOutRaw: paxgOutRaw.toString(),
        minOut: ethers.formatUnits(minOutRaw, 18),
        minOutRaw: minOutRaw.toString(),
        priceImpactBps,
        xauUsd: xauPrice.toFixed(2),
        bridge: {
          maxSubmissionCostWei: submissionFee.toString(),
          maxGas: L2_GAS_LIMIT.toString(),
          gasPriceBidWei: l2GasPriceBidded.toString(),
          totalCallValueWei: bridgeCallValue.toString(),
          totalCallValueEth: ethers.formatEther(bridgeCallValue),
        },
        balances: {
          deployerEth: deployerAddress ? ethers.formatEther(ethBalance as bigint) : null,
          deployerUsdcMainnet: deployerAddress ? ethers.formatUnits(usdcBalance as bigint, 6) : null,
          deployerPaxgArbitrum: deployerAddress ? ethers.formatUnits(arbBalBefore as bigint, 18) : null,
        },
      },
      checks,
      okToExecute,
      runCommand: `USDC=${usdcStr} npx tsx scripts/topup-paxg-buffer.ts`,
      note: 'Planner is read-only. Run the script with DRY_RUN=1 first; remove DRY_RUN=1 to execute.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Top-up planner failed', detail: msg });
  }
}
