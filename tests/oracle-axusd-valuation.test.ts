/**
 * Regression test for Task #99 (replaces the Task #95 inversion-workaround test).
 *
 * Asserts the invariant: no production code path that values an AXUSD principal
 * via the canonical AXUSDPegOracleAdapter can ever surface a $0 USD value to
 * internal tooling — even if the immutable peg adapter unexpectedly reverts or
 * zero-quotes (a defensive guard the helper retains as belt-and-braces).
 *
 * Run: npx tsx tests/oracle-axusd-valuation.test.ts
 */

import {
  ACTIVE_AXUSD_ARBITRUM,
  principalUsdToAxusdWei18,
  valueAxusdAsUsd,
  type Erc7726QuoteReader,
} from '../server/services/oracle/axusdUsdValuation';
import { ISO4217_USD_ADDRESS } from '../src/config/oracleConfig';

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
 * Mocks the AXUSDPegOracleAdapter behaviour:
 *   getQuote(X, AXUSD, USD)   → X * 1e8 / 1e18   (peg = 1.00 USD, USD is 8-dec)
 *   getQuote(0, ...)          → 0 by ERC-7726 convention
 *   any other pair            → reverts
 */
function makePegAdapterMock(): Erc7726QuoteReader {
  return {
    async getQuote(inAmount: bigint, base: string, quote: string): Promise<bigint> {
      if (inAmount === 0n) return 0n;
      if (
        base.toLowerCase() === ACTIVE_AXUSD_ARBITRUM.toLowerCase() &&
        quote.toLowerCase() === ISO4217_USD_ADDRESS.toLowerCase()
      ) {
        // 1 AXUSD (18-dec) → 1.00 USD (8-dec) at peg
        return inAmount / 10n ** 10n;
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
  console.log('Running Task #99 AXUSD valuation regression tests...\n');

  // 1. Direct AXUSD→USD peg quote produces a sensible USD value.
  {
    const principalWei = principalUsdToAxusdWei18(50_000);
    const v = await valueAxusdAsUsd(makePegAdapterMock(), principalWei);
    assert(v.usdValue === '50000.00', 'Peg adapter values 50,000 AXUSD as 50,000.00 USD');
    assert(v.source === 'erc7726_peg', 'Source is erc7726_peg when on-chain quote works');
    assert(v.onChainQuoteUsable === true, 'onChainQuoteUsable is true for the canonical path');
  }

  // 2. CRITICAL: zero on-chain quote must NEVER produce a $0 USD value.
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
    const v = await valueAxusdAsUsd(makePegAdapterMock(), 0n);
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

  // 6. Sweep a range of principal amounts against a misbehaving oracle —
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
    assert(allNonZero, 'Sweep: no principal in {0.01, 1, 100, 50k, 250k, 999999.99} produces $0 against zero-quote oracle');
  }

  // 7. Sweep against the working peg adapter — every quote must equal principal in USD.
  {
    const amounts = [1, 100, 50_000, 250_000];
    let allMatch = true;
    for (const amt of amounts) {
      const principalWei = principalUsdToAxusdWei18(amt);
      const v = await valueAxusdAsUsd(makePegAdapterMock(), principalWei);
      const expected = amt.toFixed(2);
      if (v.usdValue !== expected || v.source !== 'erc7726_peg') {
        console.error(`    SUB-FAIL: amount=${amt} got usdValue=${v.usdValue} src=${v.source}, expected ${expected}/erc7726_peg`);
        allMatch = false;
      }
    }
    assert(allMatch, 'Sweep: peg adapter quotes match principal exactly across amounts');
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
