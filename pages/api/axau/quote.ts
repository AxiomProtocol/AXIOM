import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAXAUMintQuote,
  getAXAURedeemQuote,
  COMPONENT_IDS,
} from "../../../lib/services/AXAUContractService";

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
      const quote = await getAXAUMintQuote(amount, vault);
      return res.status(200).json(quote);
    }
    if (action === "redeem") {
      const quote = await getAXAURedeemQuote(amount, vault);
      return res.status(200).json(quote);
    }
    return res.status(400).json({ error: "action must be 'mint' or 'redeem'" });
  } catch (err: any) {
    console.error("[axau/quote]", err?.message ?? err);
    return res.status(500).json({ error: "Quote failed", detail: err?.message });
  }
}
