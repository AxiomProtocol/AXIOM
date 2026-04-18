/**
 * Regression test for Task #102 (direct-quote path using corrected v3 adapter).
 *
 * Asserts the invariant: the canonical valueAxusdAsUsd helper always reads the
 * AXUSD→USD price directly from the corrected AXIOMOracleAdapter v3 (Task #99
 * fix). The static-parity fallback workaround has been removed; any oracle
 * revert or zero-quote is a hard error surfaced to the caller.
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
 * Mocks the corrected AXIOMOracleAdapter v3 behaviour:
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
  console.log('Running Task #102 AXUSD valuation regression tests (direct-quote path)...\n');

  // 1. Direct AXUSD→USD peg quote produces a sensible USD value.
  {
    const principalWei = principalUsdToAxusdWei18(50_000);
    const v = await valueAxusdAsUsd(makePegAdapterMock(), principalWei);
    assert(v.usdValue === '50000.00', 'Peg adapter values 50,000 AXUSD as 50,000.00 USD');
    assert(v.source === 'erc7726_peg', 'Source is erc7726_peg on the direct-quote path');
    assert(v.onChainQuoteUsable === true, 'onChainQuoteUsable is true for the canonical path');
  }

  // 2. Zero on-chain quote must throw — no silent static-parity fallback.
  {
    const principalWei = principalUsdToAxusdWei18(50_000);
    let threw = false;
    try {
      await valueAxusdAsUsd(makeZeroAdapterMock(), principalWei);
    } catch {
      threw = true;
    }
    assert(threw, 'Zero on-chain quote throws an error (no silent fallback in v3 path)');
  }

  // 3. Reverting oracle surfaces the error — no silent static-parity fallback.
  {
    const principalWei = principalUsdToAxusdWei18(123_456.78);
    let threw = false;
    try {
      await valueAxusdAsUsd(makeRevertingAdapterMock(), principalWei);
    } catch {
      threw = true;
    }
    assert(threw, 'Reverting oracle surfaces the error (no silent fallback in v3 path)');
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

  // 6. Sweep against the working peg adapter — every quote must equal principal in USD.
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

  // 7. Source is always 'erc7726_peg' — static_parity no longer exists.
  {
    const amounts = [1, 100, 50_000, 250_000];
    let allErc7726 = true;
    for (const amt of amounts) {
      const principalWei = principalUsdToAxusdWei18(amt);
      const v = await valueAxusdAsUsd(makePegAdapterMock(), principalWei);
      if (v.source !== 'erc7726_peg') {
        console.error(`    SUB-FAIL: amount=${amt} returned source=${v.source}, expected erc7726_peg`);
        allErc7726 = false;
      }
    }
    assert(allErc7726, 'Source is always erc7726_peg on the direct-quote path');
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
