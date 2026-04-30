import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
const L2_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://arb1.arbitrum.io/rpc";

const PAXG_ARB = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address, baseline } = req.query;

  if (!address || typeof address !== "string" || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Valid recipient `address` required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(L2_RPC);
    const paxg = new ethers.Contract(PAXG_ARB, ERC20_ABI, provider);
    const currentRaw = (await paxg.balanceOf(address)) as bigint;
    const current = parseFloat(ethers.formatUnits(currentRaw, 18));

    let delivered: number | null = null;
    let arrived = false;
    if (baseline && typeof baseline === "string") {
      let baselineRaw: bigint | null = null;
      try {
        baselineRaw = ethers.parseUnits(baseline, 18);
      } catch {
        baselineRaw = null;
      }
      if (baselineRaw !== null) {
        const deltaRaw = currentRaw - baselineRaw;
        delivered = parseFloat(ethers.formatUnits(deltaRaw < 0n ? 0n : deltaRaw, 18));
        const dustThreshold = ethers.parseUnits("0.0001", 18);
        arrived = deltaRaw >= dustThreshold;
      }
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      address,
      currentBalance: current.toFixed(8),
      currentBalanceRaw: currentRaw.toString(),
      baseline: typeof baseline === "string" ? baseline : null,
      delivered: delivered !== null ? delivered.toFixed(8) : null,
      arrived,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    const msg = e?.message ?? "Failed to read PAXG balance on Arbitrum";
    console.error("[bridge-status]", msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
