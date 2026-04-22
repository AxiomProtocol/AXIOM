import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

const ALCHEMY_KEY   = process.env.ALCHEMY_API_KEY ?? "";
const RPC_URL       = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://arb1.arbitrum.io/rpc";

// ─── Addresses ────────────────────────────────────────────────────────────────
const QUOTER_V2     = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
const PAXG_ADDR     = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429";
const WETH_ADDR     = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC_ADDR     = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// Chainlink feeds on Arbitrum One
const CL_ETH_USD    = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
const CL_XAU_USD    = "0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c";

// Fee tiers — verified against on-chain liquidity 2026-04-02
// 0.3% and 0.05% pools exist but have zero liquidity; these are the only liquid ones
const FEE_ETH_PAXG  = 10000; // WETH/PAXG 1%   (fee=10000)
const FEE_USDC_PAXG = 3000;  // USDC/PAXG 0.3% (fee=3000)

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const QUOTER_ABI = [
  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPaxg(raw: bigint): string {
  const n = parseFloat(ethers.formatUnits(raw, 18));
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(4);
  if (n < 0.001)    return n.toFixed(8);
  if (n < 1)        return n.toFixed(6);
  return n.toFixed(4);
}

async function getChainlinkPrice(feed: string, provider: ethers.JsonRpcProvider): Promise<number> {
  const c = new ethers.Contract(feed, CHAINLINK_ABI, provider);
  const [, answer] = await c.latestRoundData();
  return parseFloat(ethers.formatUnits(answer, 8)); // Chainlink uses 8 decimals
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { inputToken, amount } = req.query;

  if (!inputToken || !amount || typeof inputToken !== "string" || typeof amount !== "string") {
    return res.status(400).json({ error: "Missing inputToken or amount" });
  }
  if (!["ETH", "USDC"].includes(inputToken)) {
    return res.status(400).json({ error: "inputToken must be ETH or USDC" });
  }

  const decimals  = inputToken === "USDC" ? 6 : 18;
  const tokenIn   = inputToken === "ETH" ? WETH_ADDR : USDC_ADDR;
  const fee       = inputToken === "ETH" ? FEE_ETH_PAXG : FEE_USDC_PAXG;

  let amountIn: bigint;
  try {
    amountIn = ethers.parseUnits(amount, decimals);
  } catch {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const quoter   = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);

    // ── Fetch quote + market prices in parallel ──────────────────────────────
    const [quoteResult, ethUsd, xauUsd] = await Promise.allSettled([
      quoter.quoteExactInputSingle.staticCall({
        tokenIn,
        tokenOut:         PAXG_ADDR,
        amountIn,
        fee,
        sqrtPriceLimitX96: 0n,
      }),
      getChainlinkPrice(CL_ETH_USD, provider),
      getChainlinkPrice(CL_XAU_USD, provider),
    ]);

    if (quoteResult.status === "rejected") {
      const msg = quoteResult.reason?.reason ?? quoteResult.reason?.shortMessage ?? quoteResult.reason?.message ?? "Quote failed";
      console.error("[paxg-quote] QuoterV2 error:", msg);
      return res.status(200).json({ error: msg });
    }

    const [amountOut] = quoteResult.value as [bigint, ...unknown[]];
    const amountOutStr = formatPaxg(amountOut);

    // ── Price impact calculation ─────────────────────────────────────────────
    let priceImpact: number | null = null;
    let fairPaxg: string | null   = null;
    let inputUsd: number | null   = null;

    if (xauUsd.status === "fulfilled" && xauUsd.value > 0) {
      const paxgUsdPrice = xauUsd.value; // 1 PAXG = 1 oz gold = XAU/USD price
      const amountNum    = parseFloat(amount);

      if (inputToken === "USDC") {
        inputUsd = amountNum;
      } else if (inputToken === "ETH" && ethUsd.status === "fulfilled" && ethUsd.value > 0) {
        inputUsd = amountNum * ethUsd.value;
      }

      if (inputUsd !== null) {
        const expectedPaxg = inputUsd / paxgUsdPrice;
        const actualPaxg   = parseFloat(ethers.formatUnits(amountOut, 18));
        priceImpact = expectedPaxg > 0
          ? Math.round(((expectedPaxg - actualPaxg) / expectedPaxg) * 10000) / 100
          : null;
        fairPaxg = expectedPaxg.toFixed(6);
      }
    }

    console.log(`[paxg-quote] ${amount} ${inputToken} → ${amountOutStr} PAXG | impact=${priceImpact}%`);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      amountOut:    amountOut.toString(),
      amountOutStr,
      inputToken,
      amount,
      fee,
      priceImpact,
      fairPaxg,
      inputUsd:     inputUsd !== null ? inputUsd.toFixed(2) : null,
    });

  } catch (err: any) {
    const msg = err?.reason ?? err?.shortMessage ?? err?.message ?? "Quote failed";
    console.error("[paxg-quote] Error:", msg);
    return res.status(200).json({ error: msg });
  }
}
