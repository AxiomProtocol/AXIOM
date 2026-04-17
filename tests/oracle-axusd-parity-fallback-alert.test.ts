/**
 * Regression test for Task #100.
 *
 * Asserts that:
 *   1. `recordAxusdParityFallback` increments the in-process counter and
 *      emits a structured `[ALERT] axusd_oracle_parity_fallback` log line.
 *   2. Per-caller breakdown is maintained.
 *   3. Failures inside the alerting path do not throw.
 *
 * Run: npx tsx tests/oracle-axusd-parity-fallback-alert.test.ts
 */

import {
  recordAxusdParityFallback,
  getAxusdParityFallbackMetrics,
  __resetAxusdParityFallbackMetricsForTests,
} from '../server/services/oracle/axusdParityFallbackAlert';

let failed = 0;
let passed = 0;

function assert(cond: boolean, message: string) {
  if (cond) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function captureWarn(fn: () => void): string[] {
  const lines: string[] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    fn();
  } finally {
    console.warn = orig;
  }
  return lines;
}

function main() {
  console.log('Running Task #100 AXUSD parity-fallback alert tests...\n');

  __resetAxusdParityFallbackMetricsForTests();

  // 1. Single fallback increments counter + emits structured warning line.
  {
    const lines = captureWarn(() =>
      recordAxusdParityFallback({
        caller: 'loan-lifecycle:charge_off',
        loanId: 'loan-abc',
        principalUsd: '50000.00',
      }),
    );
    const m = getAxusdParityFallbackMetrics();
    assert(m.totalFallbacks === 1, 'totalFallbacks is 1 after one fallback');
    assert(m.lastFallbackAt !== null, 'lastFallbackAt is set');
    assert(
      m.perCaller['loan-lifecycle:charge_off']?.count === 1,
      'per-caller count for charge_off is 1',
    );
    assert(lines.length === 1, 'exactly one warning line emitted');
    assert(
      lines[0].includes('[ALERT]') &&
        lines[0].includes('axusd_oracle_parity_fallback'),
      'warning line includes [ALERT] tag and alert key',
    );
    assert(lines[0].includes('"loanId":"loan-abc"'), 'warning line includes loanId');
    assert(
      lines[0].includes('"caller":"loan-lifecycle:charge_off"'),
      'warning line includes caller',
    );
  }

  // 2. Multiple callers get separate buckets.
  {
    captureWarn(() => {
      recordAxusdParityFallback({ caller: 'loan-lifecycle:default', loanId: 'l1' });
      recordAxusdParityFallback({ caller: 'loan-lifecycle:default', loanId: 'l2' });
      recordAxusdParityFallback({ caller: 'loan-lifecycle:charge_off', loanId: 'l3' });
    });
    const m = getAxusdParityFallbackMetrics();
    assert(m.totalFallbacks === 4, 'totalFallbacks is 4 after three more fallbacks');
    assert(
      m.perCaller['loan-lifecycle:default']?.count === 2,
      'per-caller count for default is 2',
    );
    assert(
      m.perCaller['loan-lifecycle:charge_off']?.count === 2,
      'per-caller count for charge_off is now 2',
    );
  }

  // 3. Alerting must never throw, even with weird input.
  {
    let threw = false;
    try {
      recordAxusdParityFallback({
        caller: 'test',
        // Force JSON.stringify to fail by introducing a circular ref.
        extra: (() => {
          const o: Record<string, unknown> = {};
          o.self = o;
          return o;
        })(),
      });
    } catch {
      threw = true;
    }
    assert(!threw, 'recordAxusdParityFallback never throws (defensive)');
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
