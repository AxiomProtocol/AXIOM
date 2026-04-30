import type { NextApiRequest, NextApiResponse } from "next";
import { getLightweightOracleFreshness } from "../../../lib/services/AXAUContractService";
import { getXauOraclePolicyState } from "../../../lib/services/AXAUFulfillmentService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const verbose = req.query.verbose === "1" || req.query.verbose === "true";

    if (verbose) {
      const state = await getXauOraclePolicyState();
      return res.status(200).json({
        oracleStale: state.isStale,
        oracleUpdatedAt: state.lastUpdatedAt,
        ageSec: state.ageSec,
        priceUsd: state.priceUsd,
        policy: state.policy,
      });
    }

    const { oracleStale, oracleUpdatedAt } = await getLightweightOracleFreshness();
    return res.status(200).json({ oracleStale, oracleUpdatedAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Oracle freshness check failed", detail: message });
  }
}
