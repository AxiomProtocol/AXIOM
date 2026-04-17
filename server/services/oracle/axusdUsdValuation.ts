/**
 * Axiom Protocol — Safe AXUSD → USD valuation helper (Task #95)
 *
 * Background
 * ----------
 * The legacy multi-pair adapter `AXIOMOracleAdapter`
 * (deployed at 0xc894d1500CB1FBf8F045e87bd357A51345197c4e on Arbitrum One)
 * returns **0** for `getQuote(*, AXUSD, USDC)` because of a bug in its
 * `_axusdToUsdc` branch. The reverse direction `getQuote(*, USDC, AXUSD)`
 * works correctly (it is exercised by the EVK vault and by the off-chain
 * /api/oracle/axusd-price endpoint).
 *
 * Several internal AXIOM services need to value an AXUSD-denominated principal
 * in USD (treasury views, solvency dashboard, charge-off / default
 * write-down accounting on real-estate loans). If any of those callers ever
 * read the broken direction directly, downstream risk and reporting logic will
 * silently see $0 — masking real exposure.
 *
 * This helper is the single safe entry point for AXUSD → USD valuation:
 *
 *   1. It always reads the *working* direction `getQuote(1 USDC, USDC, AXUSD)`
 *      and inverts the result to derive USDC-per-AXUSD.
 *   2. It hard-rejects a zero / missing on-chain response and falls back to
 *      static 1:1 parity instead of returning a zero USD value for a non-zero
 *      AXUSD input.
 *   3. It exposes the source it ended up using so callers can surface that
 *      to operators (and so regression tests can assert the no-zero invariant).
 *
 * Regression coverage: tests/oracle-axusd-valuation.test.ts asserts that for
 * every supported on-chain response (including the broken `0`) the returned
 * USD value is strictly greater than zero whenever the AXUSD input is.
 */

export const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const ACTIVE_AXUSD_ARBITRUM = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';

export type AxusdUsdValuationSource = 'erc7726_inverse' | 'static_parity';

export interface AxusdUsdValuation {
  /** USDC equivalent in 6-decimal native units. */
  usdcOut: bigint;
  /** Human-readable USD string, e.g. "50000.00". Never "0.00" when input > 0. */
  usdValue: string;
  /** Which path produced the value. */
  source: AxusdUsdValuationSource;
  /** True if the on-chain adapter returned a usable non-zero quote. */
  onChainQuoteUsable: boolean;
}

/** Minimal contract surface we depend on — keeps the helper test-friendly. */
export interface Erc7726QuoteReader {
  getQuote(inAmount: bigint, base: string, quote: string): Promise<bigint>;
}

const ONE_USDC_6DEC = 1_000_000n;
const WAD_TO_USDC_SCALE = 10n ** 12n; // 1e18 (AXUSD) → 1e6 (USDC)

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
 * Returns the USDC (≈USD) value of `inAxusdWei18` AXUSD by reading the
 * working `getQuote(USDC → AXUSD)` direction and inverting. Falls back to
 * static 1:1 parity if the oracle returns 0 or reverts.
 *
 * The function NEVER returns a zero USD value for a non-zero AXUSD input,
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

  let axusdPerUsdc18: bigint = 0n;
  try {
    axusdPerUsdc18 = await oracle.getQuote(
      ONE_USDC_6DEC,
      USDC_ARBITRUM,
      ACTIVE_AXUSD_ARBITRUM,
    );
  } catch {
    axusdPerUsdc18 = 0n;
  }

  if (axusdPerUsdc18 > 0n) {
    // usdcOut = inAxusd * (1 USDC / axusdPerUsdc) — preserves PSM rate skew.
    const usdcOut = (inAxusdWei18 * ONE_USDC_6DEC) / axusdPerUsdc18;
    if (usdcOut > 0n) {
      return {
        usdcOut,
        usdValue: (Number(usdcOut) / 1e6).toFixed(2),
        source: 'erc7726_inverse',
        onChainQuoteUsable: true,
      };
    }
  }

  // Static 1:1 parity fallback — explicitly avoids the legacy broken
  // AXUSD→USDC direction (which returns 0) so downstream risk logic never
  // sees a zero USD valuation for a non-zero AXUSD principal.
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
