import type { NextApiRequest, NextApiResponse } from "next";
import { getAXAUSystemState } from "../../../lib/services/AXAUContractService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const state = await getAXAUSystemState();
    res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json(state);
  } catch (err: any) {
    console.error("[axau/nav]", err?.message ?? err);
    return res.status(503).json({
      error: "Failed to fetch AXAU system state",
      detail: err?.message,
      retryable: true,
    });
  }
}
