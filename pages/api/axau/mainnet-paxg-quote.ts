import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
const RPC_URL = ALCHEMY_KEY
  ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://eth.llamarpc.com";

const QUOTER_V2 = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
const PAXG_MAINNET = "0x45804880De22913dAFE09f4980848ECE6EcbAf78";
const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const FEE_USDC_PAXG = 3000;

const CL_XAU_USD_MAINNET = "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6";

const QUOTER_ABI = [
  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];
const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
];
const PAXG_ABI = [
  "function feeRate() view returns (uint256)",
  "function feeParts() view returns (uint256)",
];

async function getChainlinkPrice(feed: string, provider: ethers.JsonRpcProvider): Promise<number> {
  const c = new ethers.Contract(feed, CHAINLINK_ABI, provider);
  const [, answer] = await c.latestRoundData();
  return parseFloat(ethers.formatUnits(answer, 8));
}

async function getPaxgFeeBps(provider: ethers.JsonRpcProvider): Promise<number> {
  try {
    const c = new ethers.Contract(PAXG_MAINNET, PAXG_ABI, provider);
    const [feeRate, feeParts] = await Promise.all([c.feeRate(), c.feeParts()]);
    const bps = (Number(feeRate) / Number(feeParts)) * 10000;
    return Math.round(bps);
  } catch {
    return 0;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { amount } = req.query;

  if (!amount || typeof amount !== "string") {
    return res.status(400).json({ error: "Missing amount (USDC, with 6 decimals as a decimal string)" });
  }

  let amountIn: bigint;
  try {
    amountIn = ethers.parseUnits(amount, 6);
  } catch {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (amountIn <= 0n) {
    return res.status(400).json({ error: "Amount must be > 0" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);

    const [quoteResult, xauUsd, paxgFeeBps] = await Promise.allSettled([
      quoter.quoteExactInputSingle.staticCall({
        tokenIn: USDC_MAINNET,
        tokenOut: PAXG_MAINNET,
        amountIn,
        fee: FEE_USDC_PAXG,
        sqrtPriceLimitX96: 0n,
      }),
      getChainlinkPrice(CL_XAU_USD_MAINNET, provider),
      getPaxgFeeBps(provider),
    ]);

    if (quoteResult.status === "rejected") {
      const r = quoteResult.reason as { reason?: string; shortMessage?: string; message?: string };
      const msg = r?.reason ?? r?.shortMessage ?? r?.message ?? "Quote failed";
      console.error("[mainnet-paxg-quote] QuoterV2 error:", msg);
      return res.status(200).json({ error: msg });
    }

    const [amountOut] = quoteResult.value as [bigint, ...unknown[]];
    const amountOutNum = parseFloat(ethers.formatUnits(amountOut, 18));
    const inputUsd = parseFloat(amount);

    let priceImpactPct: number | null = null;
    let fairPaxg: number | null = null;
    if (xauUsd.status === "fulfilled" && xauUsd.value > 0) {
      fairPaxg = inputUsd / xauUsd.value;
      priceImpactPct = fairPaxg > 0
        ? Math.round(((fairPaxg - amountOutNum) / fairPaxg) * 10000) / 100
        : null;
    }

    const feeBps = paxgFeeBps.status === "fulfilled" ? paxgFeeBps.value : 0;

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      inputToken: "USDC",
      inputAmount: amount,
      inputAmountRaw: amountIn.toString(),
      outputToken: "PAXG",
      outputAmount: amountOutNum.toFixed(6),
      outputAmountRaw: amountOut.toString(),
      priceImpactPct,
      fairPaxg: fairPaxg !== null ? fairPaxg.toFixed(6) : null,
      xauUsdPrice: xauUsd.status === "fulfilled" ? xauUsd.value.toFixed(2) : null,
      paxgTransferFeeBps: feeBps,
      paxgTransferFeeWarning: feeBps > 0
        ? `Paxos currently charges a ${(feeBps / 100).toFixed(2)}% transfer fee on PAXG. Bridge will receive less than swap output.`
        : null,
      pool: { fee: FEE_USDC_PAXG, address: PAXG_MAINNET },
      quotedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const e = err as { reason?: string; shortMessage?: string; message?: string };
    const msg = e?.reason ?? e?.shortMessage ?? e?.message ?? "Quote failed";
    console.error("[mainnet-paxg-quote] Error:", msg);
    return res.status(500).json({ error: msg });
  }
}
