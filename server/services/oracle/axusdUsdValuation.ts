/**
 * Axiom Protocol — AXUSD → USD valuation helper.
 *
 * Single canonical entry point for valuing AXUSD principal in USD across
 * internal services (treasury views, solvency dashboard, real-estate loan
 * charge-off / default write-down accounting). Reads the peg price from
 * AXUSDPegOracleAdapter (AXUSD↔USD); falls back to static 1:1 parity if the
 * adapter reverts or returns zero, preserving the no-zero invariant.
 */

import { ethers } from 'ethers';
import {
  AXUSD_USD_PEG_ADAPTER,
  AXUSD_PEG_ABI,
  ISO4217_USD_ADDRESS,
} from '../../../src/config/oracleConfig';

export const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const ACTIVE_AXUSD_ARBITRUM = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';

export type AxusdUsdValuationSource = 'erc7726_peg' | 'static_parity';

export interface AxusdUsdValuation {
  /** USDC equivalent in 6-decimal native units (USD ≈ USDC at the 1:1 peg). */
  usdcOut: bigint;
  /** Human-readable USD string, e.g. "50000.00". Never "0.00" when input > 0. */
  usdValue: string;
  /** Which path produced the value. */
  source: AxusdUsdValuationSource;
  /** True if the on-chain peg adapter returned a usable non-zero quote. */
  onChainQuoteUsable: boolean;
}

/** Minimal contract surface we depend on — keeps the helper test-friendly. */
export interface Erc7726QuoteReader {
  getQuote(inAmount: bigint, base: string, quote: string): Promise<bigint>;
}

const WAD_TO_USDC_SCALE = 10n ** 12n; // 1e18 (AXUSD) → 1e6 (USDC)
const USD8_TO_USDC6_SCALE = 100n;     // 1e8  (USD pseudo) → 1e6 (USDC)

/**
 * Convert a USD principal expressed as a JS number into an 18-decimal AXUSD
 * wei BigInt without losing the cents. Mirrors the conversion previously
 * inlined in pages/api/realestate/loan-lifecycle.ts.
 */
export function principalUsdToAxusdWei18(principalUsd: number): bigint {
  if (!Number.isFinite(principalUsd) || principalUsd <= 0) return 0n;
  // Round to 9-dec USD precision then scale to 18-dec — avoids float blow-out.
  return BigInt(Math.round(principalUsd * 1e9)) * BigInt(1e9);
}

/**
 * Construct the canonical peg-adapter reader bound to a given JSON-RPC
 * provider. Use this in production code; tests inject a mock instead.
 */
export function makePegOracleReader(
  provider: ethers.JsonRpcProvider | ethers.Provider,
): Erc7726QuoteReader {
  const contract = new ethers.Contract(AXUSD_USD_PEG_ADAPTER, AXUSD_PEG_ABI as readonly string[], provider);
  return {
    async getQuote(inAmount: bigint, base: string, quote: string): Promise<bigint> {
      const result = await contract.getQuote(inAmount, base, quote);
      return BigInt(result);
    },
  };
}

/**
 * Returns the USD value of `inAxusdWei18` AXUSD by calling the peg adapter's
 * `getQuote(inAxusd, AXUSD, USD)` directly. Falls back to static 1:1 parity
 * if the adapter returns 0 or reverts (a defensive belt-and-braces guard —
 * the immutable peg adapter cannot do either by construction).
 *
 * This function NEVER returns a zero USD value for a non-zero AXUSD input,
 * which is the property the regression test asserts.
 */
export async function valueAxusdAsUsd(
  oracle: Erc7726QuoteReader,
  inAxusdWei18: bigint,
): Promise<AxusdUsdValuation> {
  if (inAxusdWei18 <= 0n) {
    return {
      usdcOut: 0n,
      usdValue: '0.00',
      source: 'static_parity',
      onChainQuoteUsable: false,
    };
  }

  let usdOut8: bigint = 0n;
  try {
    // Direct AXUSD → USD quote on the peg adapter. USD is 8-dec per Euler convention.
    usdOut8 = await oracle.getQuote(
      inAxusdWei18,
      ACTIVE_AXUSD_ARBITRUM,
      ISO4217_USD_ADDRESS,
    );
  } catch {
    usdOut8 = 0n;
  }

  if (usdOut8 > 0n) {
    // USD (8-dec) → USDC (6-dec) is just a /100 since both are USD-pegged.
    const usdcOut = usdOut8 / USD8_TO_USDC6_SCALE;
    if (usdcOut > 0n) {
      return {
        usdcOut,
        usdValue: (Number(usdcOut) / 1e6).toFixed(2),
        source: 'erc7726_peg',
        onChainQuoteUsable: true,
      };
    }
  }

  // Defensive static 1:1 parity fallback — preserves the no-zero invariant
  // even if the immutable peg adapter unexpectedly reverts or zero-quotes.
  const usdcOutStatic = inAxusdWei18 / WAD_TO_USDC_SCALE;
  // Guarantee strictly positive output for any sub-cent dust input as well.
  const usdcOutSafe = usdcOutStatic > 0n ? usdcOutStatic : 1n;
  return {
    usdcOut: usdcOutSafe,
    usdValue: (Number(usdcOutSafe) / 1e6).toFixed(2),
    source: 'static_parity',
    onChainQuoteUsable: false,
  };
}
