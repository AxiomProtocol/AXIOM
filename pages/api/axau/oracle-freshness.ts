import type { NextApiRequest, NextApiResponse } from "next";
import { getLightweightOracleFreshness } from "../../../lib/services/AXAUContractService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { oracleStale, oracleUpdatedAt } = await getLightweightOracleFreshness();
    return res.status(200).json({ oracleStale, oracleUpdatedAt });
  } catch (err: any) {
    return res.status(500).json({ error: "Oracle freshness check failed", detail: err?.message });
  }
}
