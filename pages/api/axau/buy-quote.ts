import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAXAUMintQuote,
  getAXAUSystemState,
  getLightweightOracleFreshness,
  COMPONENT_IDS,
} from "../../../lib/services/AXAUContractService";
import { validateDecimalInput, ValidationError } from "../../../lib/utils/validateDecimalInput";

/**
 * GET /api/axau/buy-quote
 *
 * Accepts ONE of:
 *   ?paxgAmount=0.001   → authoritative on-chain quoteMint (exact)
 *   ?axusdAmount=100    → legacy NAV division estimate (deprecated)
 *
 * Passing both params returns 400.
 *
 * Oracle staleness → 503 + Retry-After: 90
 *
 * Full locked schema is always returned with null for the inactive input field.
 */

const RETRY_AFTER_SECONDS = 90;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Guard against repeated params (array form) — both must be single string values
  const rawPaxgParam  = req.query.paxgAmount;
  const rawAxusdParam = req.query.axusdAmount;

  const hasPaxg  = rawPaxgParam  !== undefined && typeof rawPaxgParam  === "string";
  const hasAxusd = rawAxusdParam !== undefined && typeof rawAxusdParam === "string";
  const hasPaxgArr  = rawPaxgParam  !== undefined && typeof rawPaxgParam  !== "string";
  const hasAxusdArr = rawAxusdParam !== undefined && typeof rawAxusdParam !== "string";

  if (hasPaxgArr || hasAxusdArr) {
    return res.status(400).json({ error: "Duplicate query parameters are not allowed" });
  }

  if (hasPaxg && hasAxusd) {
    return res.status(400).json({ error: "Provide paxgAmount or axusdAmount — not both" });
  }
  if (!hasPaxg && !hasAxusd) {
    return res.status(400).json({ error: "paxgAmount or axusdAmount query parameter required" });
  }

  // ── PAXG path (authoritative — decimal format only, e.g. "0.001") ────────────
  if (hasPaxg) {
    // paxgAmount must be a decimal string (e.g. "0.001" not "1000000000000000" wei).
    // validateDecimalInput enforces this contract — no exponential, max 18 decimal places.
    const rawPaxg = rawPaxgParam as string;

    // Input validation before any ethers.parseUnits()
    try {
      validateDecimalInput(rawPaxg, 18);
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    try {
      // Lightweight oracle freshness check (10s module-level cache)
      const { oracleStale, oracleUpdatedAt } = await getLightweightOracleFreshness();
      if (oracleStale) {
        res.setHeader("Retry-After", String(RETRY_AFTER_SECONDS));
        return res.status(503).json({
          error: "Oracle price stale — mint unavailable",
          oracleStale: true,
          oracleUpdatedAt,
        });
      }

      // Fetch system state for context fields + on-chain mint quote
      const [state, mintQuote] = await Promise.all([
        getAXAUSystemState(),
        getAXAUMintQuote(rawPaxg, COMPONENT_IDS.XAU),
      ]);

      const axauOut = parseFloat(mintQuote.axauOutFormatted);
      const xauUsdPrice = state.xauUsdPrice.replace(/,/g, "");

      return res.status(200).json({
        paxgAmount:       rawPaxg,
        axusdAmount:      null,
        axauOut,
        axauOutFormatted: mintQuote.axauOutFormatted,
        mintNavWad:       mintQuote.mintNavWad,
        mintNavPerToken:  mintQuote.mintNavFormatted,
        xauUsdPrice,
        coverageRatioPct: state.coverageRatioPct,
        mintPaused:       mintQuote.mintPaused,
        isSolvent:        state.isSolvent,
        oracleStale:      state.oracleStale,
        oracleUpdatedAt:  state.oracleUpdatedAt,
        quoteMath:        "exact" as const,
        deprecated:       false,
        fetchedAt:        state.fetchedAt,
      });
    } catch (err: unknown) {
      const msg    = err instanceof Error ? err.message : String(err);
      const msgLow = msg.toLowerCase();

      // Map known contract reverts to deterministic HTTP codes
      if (msgLow.includes("stale oracle") || msgLow.includes("staleoracle") || msgLow.includes("oracle is stale") || msgLow.includes("oracle stale") || msgLow.includes("chainlink") && msgLow.includes("stale")) {
        res.setHeader("Retry-After", String(RETRY_AFTER_SECONDS));
        return res.status(503).json({ error: "Oracle price stale — mint unavailable. The XAU/USD feed has not updated within the on-chain staleness window. Please retry in ~90 seconds.", oracleStale: true });
      }
      if (msgLow.includes("mintpaused") || msgLow.includes("paused")) {
        return res.status(423).json({ error: "Mint is currently paused", mintPaused: true });
      }
      if (msgLow.includes("coverage") || msgLow.includes("insufficientreserve") || msgLow.includes("insufficient reserve")) {
        return res.status(503).json({ error: "Coverage ratio too low — mint temporarily suspended", coverageLow: true });
      }

      console.error("[axau/buy-quote paxg]", msg);
      return res.status(422).json({ error: "Quote unavailable — check mint parameters", detail: msg });
    }
  }

  // ── AXUSD path (legacy, estimated, deprecated) ───────────────────────────────
  const rawAxusd   = rawAxusdParam as string;
  const axusdFloat = parseFloat(rawAxusd);
  if (isNaN(axusdFloat) || axusdFloat <= 0) {
    return res.status(400).json({ error: "axusdAmount must be a positive number" });
  }

  try {
    // Lightweight oracle freshness check
    const { oracleStale, oracleUpdatedAt } = await getLightweightOracleFreshness();
    if (oracleStale) {
      res.setHeader("Retry-After", String(RETRY_AFTER_SECONDS));
      return res.status(503).json({
        error: "Oracle price stale — mint unavailable",
        oracleStale: true,
        oracleUpdatedAt,
      });
    }

    const state = await getAXAUSystemState();

    const mintNavPerToken = parseFloat(state.mintNavPerToken);
    if (!mintNavPerToken || mintNavPerToken <= 0) {
      return res.status(503).json({ error: "Mint NAV unavailable — system may be paused" });
    }

    const axauOut    = axusdFloat / mintNavPerToken;
    const xauUsdPrice = state.xauUsdPrice.replace(/,/g, "");

    return res.status(200).json({
      paxgAmount:       null,
      axusdAmount:      axusdFloat,
      axauOut:          parseFloat(axauOut.toFixed(6)),
      axauOutFormatted: axauOut.toFixed(6),
      mintNavPerToken:  state.mintNavPerToken,
      xauUsdPrice,
      coverageRatioPct: state.coverageRatioPct,
      mintPaused:       state.mintPaused,
      isSolvent:        state.isSolvent,
      oracleStale:      state.oracleStale,
      oracleUpdatedAt:  state.oracleUpdatedAt,
      quoteMath:        "estimated" as const,
      deprecated:       true,
      fetchedAt:        state.fetchedAt,
    });
  } catch (err: unknown) {
    console.error("[axau/buy-quote axusd]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
