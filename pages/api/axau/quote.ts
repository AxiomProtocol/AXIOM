import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAXAUMintQuote,
  getAXAURedeemQuote,
  getLightweightOracleFreshness,
  COMPONENT_IDS,
} from "../../../lib/services/AXAUContractService";

/**
 * GET /api/axau/quote?action=mint&amount=0.001
 * GET /api/axau/quote?action=redeem&amount=1.5
 *
 * mint action: gated on oracle freshness → 503 + Retry-After: 90 if stale.
 * redeem action: ungated (redeem quote does not depend on XAU spot directly).
 */

const RETRY_AFTER_SECONDS = 90;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { action, amount, vaultId } = req.query as {
    action: string;
    amount: string;
    vaultId?: string;
  };

  if (!action || !amount) {
    return res.status(400).json({ error: "Missing required params: action, amount" });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const vault = vaultId || COMPONENT_IDS.XAU;

  try {
    if (action === "mint") {
      // Gate mint quotes on oracle freshness
      const { oracleStale, oracleUpdatedAt } = await getLightweightOracleFreshness();
      if (oracleStale) {
        res.setHeader("Retry-After", String(RETRY_AFTER_SECONDS));
        return res.status(503).json({
          error: "Oracle price stale — mint quote unavailable",
          oracleStale: true,
          oracleUpdatedAt,
        });
      }

      const quote = await getAXAUMintQuote(amount, vault);
      return res.status(200).json(quote);
    }

    if (action === "redeem") {
      // Redeem quotes are ungated (do not depend on XAU spot price)
      const quote = await getAXAURedeemQuote(amount, vault);
      return res.status(200).json(quote);
    }

    return res.status(400).json({ error: "action must be 'mint' or 'redeem'" });
  } catch (err: any) {
    console.error("[axau/quote]", err?.message ?? err);
    return res.status(500).json({ error: "Quote failed", detail: err?.message });
  }
}
