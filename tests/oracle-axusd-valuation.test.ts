/**
 * Regression test for Task #95.
 *
 * Asserts the invariant: no production code path that values an AXUSD principal
 * via the legacy AXIOMOracleAdapter can ever surface a 0 USD value to internal
 * tooling, even though that adapter returns 0 for getQuote(*, AXUSD, USDC).
 *
 * Run: npx tsx tests/oracle-axusd-valuation.test.ts
 */

import {
  USDC_ARBITRUM,
  ACTIVE_AXUSD_ARBITRUM,
  principalUsdToAxusdWei18,
  valueAxusdAsUsd,
  type Erc7726QuoteReader,
} from '../server/services/oracle/axusdUsdValuation';

let failed = 0;
let passed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

/**
 * Mocks the legacy adapter's documented behaviour:
 *   getQuote(*, USDC, AXUSD) → working (returns 1e18 per 1 USDC at 1:1 peg)
 *   getQuote(*, AXUSD, USDC) → BROKEN, returns 0  (the Task #95 bug)
 *   getQuote(0, ...)         → 0 by ERC-7726 convention
 */
function makeLegacyAdapterMock(): Erc7726QuoteReader {
  return {
    async getQuote(inAmount: bigint, base: string, quote: string): Promise<bigint> {
      if (inAmount === 0n) return 0n;
      if (
        base.toLowerCase() === USDC_ARBITRUM.toLowerCase() &&
        quote.toLowerCase() === ACTIVE_AXUSD_ARBITRUM.toLowerCase()
      ) {
        // 1 USDC → 1 AXUSD (decimal-normalised, peg = 1.0)
        return inAmount * 10n ** 12n;
      }
      if (
        base.toLowerCase() === ACTIVE_AXUSD_ARBITRUM.toLowerCase() &&
        quote.toLowerCase() === USDC_ARBITRUM.toLowerCase()
      ) {
        // BROKEN branch — what the on-chain adapter actually does today.
        return 0n;
      }
      throw new Error('mock: unsupported pair');
    },
  };
}

function makeRevertingAdapterMock(): Erc7726QuoteReader {
  return {
    async getQuote(): Promise<bigint> {
      throw new Error('mock: oracle reverted');
    },
  };
}

function makeZeroAdapterMock(): Erc7726QuoteReader {
  return {
    async getQuote(): Promise<bigint> {
      return 0n;
    },
  };
}

async function main() {
  console.log('Running Task #95 AXUSD valuation regression tests...\n');

  // 1. Working USDC→AXUSD direction produces a sensible USD value.
  {
    const principalWei = principalUsdToAxusdWei18(50_000);
    const v = await valueAxusdAsUsd(makeLegacyAdapterMock(), principalWei);
    assert(v.usdValue === '50000.00', 'USDC→AXUSD inversion values 50,000 AXUSD as 50,000.00 USD');
    assert(v.source === 'erc7726_inverse', 'Source is erc7726_inverse when on-chain quote works');
    assert(v.onChainQuoteUsable === true, 'onChainQuoteUsable is true for the working direction');
  }

  // 2. CRITICAL: the broken AXUSD→USDC direction must NEVER produce a $0 value.
  //    This is the regression test for Task #95.
  {
    const principalWei = principalUsdToAxusdWei18(50_000);
    const v = await valueAxusdAsUsd(makeZeroAdapterMock(), principalWei);
    assert(v.usdValue !== '0.00', 'Zero on-chain quote does NOT produce $0 USD value');
    assert(v.usdcOut > 0n, 'usdcOut is strictly positive for a non-zero AXUSD principal');
    assert(v.source === 'static_parity', 'Falls back to static parity when on-chain quote is zero');
    assert(v.onChainQuoteUsable === false, 'onChainQuoteUsable is false when adapter returns 0');
  }

  // 3. Reverting oracle also falls back safely (never $0).
  {
    const principalWei = principalUsdToAxusdWei18(123_456.78);
    const v = await valueAxusdAsUsd(makeRevertingAdapterMock(), principalWei);
    assert(v.usdValue !== '0.00', 'Reverting oracle does NOT produce $0 USD value');
    assert(v.usdcOut > 0n, 'usdcOut is strictly positive when oracle reverts');
    assert(v.source === 'static_parity', 'Falls back to static parity when oracle reverts');
  }

  // 4. Zero AXUSD principal is the only case allowed to return $0.
  {
    const v = await valueAxusdAsUsd(makeLegacyAdapterMock(), 0n);
    assert(v.usdValue === '0.00', 'Zero AXUSD principal correctly returns $0.00');
    assert(v.usdcOut === 0n, 'Zero AXUSD principal returns 0 usdcOut');
  }

  // 5. principalUsdToAxusdWei18 helper sanity.
  {
    assert(principalUsdToAxusdWei18(1) === 10n ** 18n, '1 USD → 1e18 AXUSD wei');
    assert(principalUsdToAxusdWei18(0) === 0n, '0 USD → 0 wei');
    assert(principalUsdToAxusdWei18(-5) === 0n, 'Negative USD → 0 wei (defensive)');
    assert(principalUsdToAxusdWei18(NaN) === 0n, 'NaN USD → 0 wei (defensive)');
  }

  // 6. Sweep a range of principal amounts against the broken oracle —
  //    every single one must produce a strictly positive USD value.
  {
    const amounts = [0.01, 1, 100, 50_000, 250_000, 999_999.99];
    let allNonZero = true;
    for (const amt of amounts) {
      const principalWei = principalUsdToAxusdWei18(amt);
      const v = await valueAxusdAsUsd(makeZeroAdapterMock(), principalWei);
      if (v.usdcOut <= 0n || v.usdValue === '0.00') {
        console.error(`    SUB-FAIL: amount=${amt} produced usdValue=${v.usdValue}, usdcOut=${v.usdcOut}`);
        allNonZero = false;
      }
    }
    assert(allNonZero, 'Sweep: no principal in {0.01, 1, 100, 50k, 250k, 999999.99} produces $0 against broken oracle');
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
